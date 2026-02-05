import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Input validation schema
const PaymentInputSchema = z.object({
  amount: z.number().int().positive().max(10000000, 'Le montant dépasse le maximum autorisé'),
  paymentType: z.enum(['tribute', 'donation', 'memorial_creation']).default('tribute'),
  memorialId: z.string().uuid().optional().nullable(),
  metadata: z.object({
    candleCount: z.number().int().min(0).max(100).optional(),
    flowerCount: z.number().int().min(0).max(100).optional(),
    relationCategory: z.string().max(50).optional(),
    messagePreview: z.string().max(200).optional(),
  }).optional().default({})
})

// EBILLING API endpoint
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

    // Parse and validate request body
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validationResult = PaymentInputSchema.safeParse(rawBody)
    
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.issues)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input data',
          details: validationResult.error.issues.map(i => i.message)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { amount, paymentType, memorialId, metadata } = validationResult.data

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
        memorial_id: memorialId || null,
        amount: amount,
        currency: 'XOF',
        status: 'pending',
        ebilling_reference: reference,
        payment_type: paymentType,
        metadata: metadata
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

    console.log('Transaction created:', transaction.id)

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

    console.log('Calling EBILLING API')

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

    if (!ebillingResponse.ok) {
      console.error('EBILLING API error:', ebillingData)
      
      // Update transaction as failed
      await supabase
        .from('payment_transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id)

      return new Response(
        JSON.stringify({ error: 'Payment initiation failed' }),
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
