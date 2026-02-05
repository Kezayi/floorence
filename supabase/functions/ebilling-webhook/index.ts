import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Input validation schema for EBILLING webhook payload
// Based on EBILLING documentation, the callback sends these parameters:
// billingid, transactionid, reference (external_reference), amount, paymentsystem, merchantid, customerid
const WebhookPayloadSchema = z.object({
  // billingid is the EBILLING internal bill ID
  billingid: z.string().min(1).max(100).optional(),
  // transactionid is the operator transaction ID
  transactionid: z.string().min(1).max(100).optional(),
  // reference is our external_reference we sent when creating the bill
  reference: z.string().min(1).max(100),
  // amount paid
  amount: z.union([z.number(), z.string()]).optional(),
  // payment system used (airtelmoney, moovmoney4, etc.)
  paymentsystem: z.string().max(50).optional(),
  // merchant ID
  merchantid: z.string().max(100).optional(),
  // customer ID
  customerid: z.string().max(100).optional(),
  // Some implementations also send status
  status: z.string().max(50).optional(),
  // payer info
  payer_code: z.string().max(50).optional(),
  payerid: z.string().max(100).optional(),
})

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // EBILLING can send data as JSON body or as form-urlencoded
    // We need to handle both cases
    const contentType = req.headers.get('content-type') || ''
    // deno-lint-ignore no-explicit-any
    let rawBody: any
    
    try {
      if (contentType.includes('application/json')) {
        rawBody = await req.json()
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await req.formData()
        rawBody = Object.fromEntries(formData.entries())
      } else {
        // Try JSON first, then form data
        const text = await req.text()
        try {
          rawBody = JSON.parse(text)
        } catch {
          // Parse as query string
          const params = new URLSearchParams(text)
          rawBody = Object.fromEntries(params.entries())
        }
      }
    } catch (parseError) {
      console.error('Error parsing webhook payload:', parseError)
      rawBody = {}
    }

    console.log('Received EBILLING webhook:', JSON.stringify(rawBody))

    const validationResult = WebhookPayloadSchema.safeParse(rawBody)
    
    if (!validationResult.success) {
      console.error('Webhook validation error:', validationResult.error.issues)
      // Still try to process if we have at least a reference
      if (!rawBody.reference) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
      }
    }

    // Extract data from validated result or raw body
    const data = validationResult.success ? validationResult.data : rawBody
    const reference = data.reference
    const billingId = data.billingid || data.billing_id
    const transactionId = data.transactionid || data.transaction_id
    const paymentSystem = data.paymentsystem || data.payment_system

    // Create Supabase client with service role for admin access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Find the transaction by reference (our external_reference)
    const { data: existingTx } = await supabase
      .from('payment_transactions')
      .select('id, status, ebilling_transaction_id, payment_type, memorial_id')
      .eq('ebilling_reference', reference)
      .maybeSingle()

    if (!existingTx) {
      console.error('Transaction not found for reference:', reference)
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if already processed (idempotency)
    if (existingTx.status === 'completed') {
      console.log('Transaction already completed:', existingTx.id)
      return new Response(
        JSON.stringify({ success: true, message: 'Already processed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // EBILLING callback means payment was successful
    // According to documentation: "Si le payement est reussi, Ebilling va notifier votre système"
    const internalStatus = 'completed'

    // Update the transaction in our database
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        status: internalStatus,
        ebilling_transaction_id: transactionId || billingId || 'callback-received',
        metadata: {
          ...((existingTx as { metadata?: Record<string, unknown> }).metadata || {}),
          payment_system: paymentSystem,
          callback_received_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', existingTx.id)

    if (updateError) {
      console.error('Error updating transaction:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Transaction updated:', { id: existingTx.id, status: internalStatus })

    // If payment completed and it's for memorial creation, publish the memorial
    if (existingTx.payment_type === 'memorial_creation' && existingTx.memorial_id) {
      console.log('Publishing memorial after successful payment:', existingTx.memorial_id)
      
      const { error: publishError } = await supabase
        .from('memorials')
        .update({
          is_published: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTx.memorial_id)

      if (publishError) {
        console.error('Error publishing memorial:', publishError)
        // Don't fail the webhook, transaction was still updated
      } else {
        console.log('Memorial published successfully:', existingTx.memorial_id)
      }
    }

    // Return success response to EBILLING
    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
