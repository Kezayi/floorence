import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    // Parse the webhook payload
    const payload = await req.json()
    console.log('Received EBILLING webhook:', JSON.stringify(payload))

    // Extract transaction details from EBILLING callback
    const {
      reference,
      transaction_id,
      status,
      amount,
      currency,
      signature
    } = payload

    // Validate the webhook signature (EBILLING specific validation)
    // This is a simplified example - adjust based on EBILLING's actual signature format
    const expectedSignature = await generateSignature(reference, transaction_id, status, EBILLING_SECRET_KEY)
    
    if (signature && signature !== expectedSignature) {
      console.error('Invalid webhook signature')
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role for admin access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Map EBILLING status to our internal status
    const internalStatus = mapEbillingStatus(status)

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

    console.log('Transaction updated successfully:', data)

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

// Map EBILLING payment status to internal status
function mapEbillingStatus(ebillingStatus: string): string {
  const statusMap: Record<string, string> = {
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
  return statusMap[ebillingStatus?.toUpperCase()] || 'unknown'
}
