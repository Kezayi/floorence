import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// EBILLING API endpoint (adjust based on actual EBILLING documentation)
const EBILLING_API_URL = 'https://api.ebilling.digitech.africa/v1/payments'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const EBILLING_API_KEY = Deno.env.get('EBILLING_API_KEY')
    const EBILLING_SECRET_KEY = Deno.env.get('EBILLING_SECRET_KEY')
    const EBILLING_MERCHANT_ID = Deno.env.get('EBILLING_MERCHANT_ID')

    if (!EBILLING_API_KEY || !EBILLING_SECRET_KEY || !EBILLING_MERCHANT_ID) {
      console.error('EBILLING credentials not configured')
      return new Response(
        JSON.stringify({ error: 'Payment service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify user token
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token)
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = claimsData.claims.sub

    // Parse request body
    const { amount, paymentType, memorialId, metadata } = await req.json()

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate memorialId is a valid UUID or null
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const validMemorialId = memorialId && uuidRegex.test(memorialId) ? memorialId : null
    
    if (memorialId && !validMemorialId) {
      console.warn(`Invalid memorial_id format received: ${memorialId}, setting to null`)
    }

    // Generate unique reference for this transaction
    const reference = `FLO-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Determine redirect URLs
    const baseUrl = req.headers.get('origin') || 'https://floorence.lovable.app'
    const successUrl = `${baseUrl}/paiement/succes?reference=${reference}`
    const cancelUrl = `${baseUrl}/paiement/annule?reference=${reference}`
    const webhookUrl = `${SUPABASE_URL}/functions/v1/ebilling-webhook`

    // Create transaction record in our database first
    const { data: transaction, error: insertError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: userId,
        memorial_id: validMemorialId,
        amount: amount,
        currency: 'XOF',
        status: 'pending',
        ebilling_reference: reference,
        payment_type: paymentType || 'tribute',
        metadata: metadata || {}
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating transaction:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Transaction created:', transaction)

    // Call EBILLING API to initiate payment
    const ebillingPayload = {
      merchant_id: EBILLING_MERCHANT_ID,
      reference: reference,
      amount: amount,
      currency: 'XOF',
      description: `Floorence - ${paymentType === 'tribute' ? 'Hommage' : 'Paiement'}`,
      success_url: successUrl,
      cancel_url: cancelUrl,
      callback_url: webhookUrl,
      customer: {
        id: userId
      },
      metadata: {
        memorial_id: memorialId,
        payment_type: paymentType,
        ...metadata
      }
    }

    console.log('Calling EBILLING API with payload:', JSON.stringify(ebillingPayload))

    const ebillingResponse = await fetch(EBILLING_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EBILLING_API_KEY}`,
        'X-Secret-Key': EBILLING_SECRET_KEY
      },
      body: JSON.stringify(ebillingPayload)
    })

    const ebillingData = await ebillingResponse.json()
    console.log('EBILLING API response:', JSON.stringify(ebillingData))

    if (!ebillingResponse.ok) {
      console.error('EBILLING API error:', ebillingData)
      
      // Update transaction as failed
      await supabase
        .from('payment_transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id)

      return new Response(
        JSON.stringify({ error: 'Payment initiation failed', details: ebillingData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Return the payment URL to redirect the user
    return new Response(
      JSON.stringify({
        success: true,
        reference: reference,
        transactionId: transaction.id,
        paymentUrl: ebillingData.payment_url || ebillingData.redirect_url,
        expiresAt: ebillingData.expires_at
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Payment initiation error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
