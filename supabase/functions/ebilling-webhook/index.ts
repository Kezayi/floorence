import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { timingSafeEqual } from 'https://deno.land/std@0.168.0/crypto/timing_safe_equal.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Input validation schema for webhook payload
const WebhookPayloadSchema = z.object({
  reference: z.string().min(1).max(100),
  transaction_id: z.string().min(1).max(100),
  status: z.string().min(1).max(50),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  signature: z.string().min(1, 'Signature is required'),
  timestamp: z.number().optional(), // Unix timestamp for replay protection
})

// Valid status values from EBILLING
const EBILLING_STATUS_MAP: Record<string, string> = {
  'SUCCESS': 'completed',
  'SUCCESSFUL': 'completed',
  'COMPLETED': 'completed',
  'PAID': 'completed',
  'FAILED': 'failed',
  'CANCELLED': 'cancelled',
  'CANCELED': 'cancelled',
  'PENDING': 'pending',
  'PROCESSING': 'processing',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const EBILLING_SECRET_KEY = Deno.env.get('EBILLING_SECRET_KEY')

    if (!EBILLING_SECRET_KEY) {
      console.error('EBILLING_SECRET_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse and validate the webhook payload
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      console.error('Invalid JSON in webhook payload')
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Received EBILLING webhook')

    const validationResult = WebhookPayloadSchema.safeParse(rawBody)
    
    if (!validationResult.success) {
      console.error('Webhook validation error:', validationResult.error.issues)
      return new Response(
        JSON.stringify({ error: 'Invalid webhook payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { reference, transaction_id, status, signature, timestamp } = validationResult.data

    // Replay protection: reject webhooks older than 5 minutes
    if (timestamp) {
      const now = Math.floor(Date.now() / 1000)
      const maxAge = 5 * 60 // 5 minutes in seconds
      
      if (now - timestamp > maxAge) {
        console.error('Webhook timestamp too old:', { timestamp, now, diff: now - timestamp })
        return new Response(
          JSON.stringify({ error: 'Webhook expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Generate expected signature
    const expectedSignature = await generateSignature(
      reference, 
      transaction_id, 
      status, 
      EBILLING_SECRET_KEY
    )
    
    // Constant-time signature comparison to prevent timing attacks
    const signatureValid = constantTimeCompare(signature, expectedSignature)
    
    if (!signatureValid) {
      console.error('Invalid webhook signature')
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role for admin access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Check if this webhook has already been processed (idempotency)
    const { data: existingTx } = await supabase
      .from('payment_transactions')
      .select('id, status, ebilling_transaction_id')
      .eq('ebilling_reference', reference)
      .maybeSingle()

    if (existingTx?.ebilling_transaction_id === transaction_id) {
      console.log('Webhook already processed for transaction:', transaction_id)
      return new Response(
        JSON.stringify({ success: true, message: 'Already processed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Map EBILLING status to our internal status
    const internalStatus = EBILLING_STATUS_MAP[status.toUpperCase()] || 'unknown'

    // Update the transaction in our database
    const { data, error } = await supabase
      .from('payment_transactions')
      .update({
        status: internalStatus,
        ebilling_transaction_id: transaction_id,
        updated_at: new Date().toISOString()
      })
      .eq('ebilling_reference', reference)
      .select()
      .single()

    if (error) {
      console.error('Error updating transaction:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to update transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Transaction updated:', { id: data.id, status: internalStatus })

    // If payment completed and it's for memorial creation, publish the memorial
    if (internalStatus === 'completed' && data.payment_type === 'memorial_creation' && data.memorial_id) {
      console.log('Publishing memorial after successful payment:', data.memorial_id)
      
      const { error: publishError } = await supabase
        .from('memorials')
        .update({
          is_published: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.memorial_id)

      if (publishError) {
        console.error('Error publishing memorial:', publishError)
        // Don't fail the webhook, transaction was still updated
      } else {
        console.log('Memorial published successfully:', data.memorial_id)
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

// Helper function to generate signature for validation
async function generateSignature(
  reference: string,
  transactionId: string,
  status: string,
  secretKey: string
): Promise<string> {
  const data = `${reference}${transactionId}${status}${secretKey}`
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Constant-time string comparison to prevent timing attacks
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  
  const encoder = new TextEncoder()
  const aBuffer = encoder.encode(a)
  const bBuffer = encoder.encode(b)
  
  try {
    return timingSafeEqual(aBuffer, bBuffer)
  } catch {
    // Fallback if timingSafeEqual fails
    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return result === 0
  }
}
