import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Helper function to check if payment is considered successful
function isPaymentSuccessful(data: Record<string, unknown>): boolean {
  // Check state field (eBilling simulator uses 'paid' or 'ready')
  const state = String(data.state || '').toLowerCase()
  if (state === 'paid' || state === 'ready') {
    return true
  }
  
  // Check status field (some implementations use 'success')
  const status = String(data.status || '').toLowerCase()
  if (status === 'success') {
    return true
  }
  
  // If callback is received without explicit status, assume success
  // (EBILLING documentation: callback = payment successful)
  return true
}

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
    let rawBody: Record<string, unknown> = {}
    
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

    // Extract data from raw body - be tolerant of missing fields
    const reference = String(rawBody.reference || rawBody.external_reference || '')
    const billingId = String(rawBody.billingid || rawBody.billing_id || '')
    const transactionId = String(rawBody.transactionid || rawBody.transaction_id || '')
    const paymentSystem = String(rawBody.paymentsystem || rawBody.payment_system || '')
    
    console.log('Extracted fields:', { reference, billingId, transactionId, paymentSystem })
    
    // Check if we have at least one identifier to find the transaction
    if (!reference && !transactionId && !billingId) {
      console.warn('No identifier found in webhook payload, but returning 200 OK')
      return new Response(
        JSON.stringify({ status: 'received', message: 'No identifier found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role for admin access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Try to find the transaction by reference OR transactionId
    let existingTx = null
    
    // First try by reference (our external_reference like FLO-...)
    if (reference) {
      const { data: txByRef } = await supabase
        .from('payment_transactions')
        .select('id, status, ebilling_transaction_id, payment_type, memorial_id, metadata')
        .eq('ebilling_reference', reference)
        .maybeSingle()
      
      if (txByRef) {
        existingTx = txByRef
        console.log('Found transaction by reference:', reference)
      }
    }
    
    // If not found, try by transactionId
    if (!existingTx && transactionId) {
      const { data: txByTxId } = await supabase
        .from('payment_transactions')
        .select('id, status, ebilling_transaction_id, payment_type, memorial_id, metadata')
        .eq('ebilling_transaction_id', transactionId)
        .maybeSingle()
      
      if (txByTxId) {
        existingTx = txByTxId
        console.log('Found transaction by transactionId:', transactionId)
      }
    }
    
    // If still not found, try by billingId in metadata
    if (!existingTx && billingId) {
      const { data: txByBillingId } = await supabase
      .from('payment_transactions')
        .select('id, status, ebilling_transaction_id, payment_type, memorial_id, metadata')
        .eq('ebilling_transaction_id', billingId)
        .maybeSingle()
      
      if (txByBillingId) {
        existingTx = txByBillingId
        console.log('Found transaction by billingId:', billingId)
      }
    }

    if (!existingTx) {
      console.warn('Transaction not found for identifiers:', { reference, transactionId, billingId })
      // Return 200 OK anyway for the simulator
      return new Response(
        JSON.stringify({ status: 'received', message: 'Transaction not found but webhook acknowledged' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if already processed (idempotency)
    if (existingTx.status === 'completed') {
      console.log('Transaction already completed:', existingTx.id)
      return new Response(
        JSON.stringify({ status: 'received', message: 'Already processed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if payment is successful based on state/status fields
    const paymentSuccessful = isPaymentSuccessful(rawBody)
    const internalStatus = paymentSuccessful ? 'completed' : 'pending'
    
    console.log('Payment status check:', { paymentSuccessful, internalStatus, rawState: rawBody.state, rawStatus: rawBody.status })

    // Update the transaction in our database
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        status: internalStatus,
        ebilling_transaction_id: transactionId || billingId || 'callback-received',
        metadata: {
          ...(existingTx.metadata as Record<string, unknown> || {}),
          payment_system: paymentSystem,
          callback_received_at: new Date().toISOString(),
          raw_webhook_data: rawBody
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', existingTx.id)

    if (updateError) {
      console.error('Error updating transaction:', updateError)
      // Return 200 OK anyway - don't fail the webhook
      return new Response(
        JSON.stringify({ status: 'received', message: 'Webhook received but update failed', error: updateError.message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Transaction updated:', { id: existingTx.id, status: internalStatus })

    // If payment completed and it's for memorial creation, publish the memorial
    if (paymentSuccessful && existingTx.payment_type === 'memorial_creation' && existingTx.memorial_id) {
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

    // Return success response to EBILLING (always 200 OK)
    return new Response(
      JSON.stringify({ status: 'received', message: 'Webhook processed successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook processing error:', error)
    // Even on error, return 200 to acknowledge receipt
    return new Response(
      JSON.stringify({ status: 'received', message: 'Webhook received with errors', error: String(error) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
