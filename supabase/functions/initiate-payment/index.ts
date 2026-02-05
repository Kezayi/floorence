import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Input validation schema
const PaymentInputSchema = z.object({
  amount: z.number().int().positive().max(10000000, 'Le montant dépasse le maximum autorisé'),
  paymentType: z.enum(['tribute', 'donation', 'memorial_creation']).default('tribute'),
  memorialId: z.string().uuid().optional().nullable(),
  payerEmail: z.string().email().optional(),
  payerName: z.string().max(100).optional(),
  payerPhone: z.string().max(20).optional(),
  metadata: z.object({
    candleCount: z.number().int().min(0).max(100).optional(),
    flowerCount: z.number().int().min(0).max(100).optional(),
    relationCategory: z.string().max(50).optional(),
    messagePreview: z.string().max(200).optional(),
  }).optional().default({})
})

// EBILLING API endpoints (using LAB for testing, PROD for production)
// LAB: https://lab.billing-easy.net or https://test.billing-easy.net
// PROD: https://staging.billing-easy.net
const EBILLING_BASE_URL = Deno.env.get('EBILLING_ENVIRONMENT') === 'production' 
  ? 'https://staging.billing-easy.net'
  : 'https://lab.billing-easy.net'

const EBILLING_API_URL = `${EBILLING_BASE_URL}/api/v1/merchant/e_bills`

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // EBILLING uses Username and SharedKey for Basic Auth
    const EBILLING_USERNAME = Deno.env.get('EBILLING_USERNAME') || Deno.env.get('EBILLING_API_KEY')
    const EBILLING_SHARED_KEY = Deno.env.get('EBILLING_SHARED_KEY') || Deno.env.get('EBILLING_SECRET_KEY')

    if (!EBILLING_USERNAME || !EBILLING_SHARED_KEY) {
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

    // Verify user token and get user info
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await supabase.auth.getUser(token)

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = userData.user.id
    const userEmail = userData.user.email || ''

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

    const { amount, paymentType, memorialId, metadata, payerEmail, payerName, payerPhone } = validationResult.data

    // Generate unique reference for this transaction
    const reference = `FLO-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Determine redirect URLs
    const baseUrl = req.headers.get('origin') || 'https://floorence.lovable.app'
    const successUrl = `${baseUrl}/paiement/succes?reference=${reference}`
    const cancelUrl = `${baseUrl}/paiement/annule?reference=${reference}`

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

    // Determine description based on payment type
    const getDescription = (type: string) => {
      switch(type) {
        case 'memorial_creation': return 'Création espace mémoriel Floorence'
        case 'tribute': return 'Hommage Floorence'
        case 'donation': return 'Contribution Floorence'
        default: return 'Paiement Floorence'
      }
    }

    // Call EBILLING API to create e_bill
    // API uses Basic Auth with Username:SharedKey
    const ebillingPayload = {
      payer_msisdn: payerPhone || '000000000',
      payer_email: payerEmail || userEmail,
      payer_name: payerName || userEmail.split('@')[0] || 'Client Floorence',
      amount: String(amount),
      external_reference: reference,
      short_description: getDescription(paymentType),
      expiry_period: '60' // 60 minutes expiry
    }

    // Create Basic Auth header
    const basicAuth = base64Encode(`${EBILLING_USERNAME}:${EBILLING_SHARED_KEY}`)

    console.log('Calling EBILLING API:', EBILLING_API_URL)

    const ebillingResponse = await fetch(EBILLING_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${basicAuth}`
      },
      body: JSON.stringify(ebillingPayload)
    })

    // deno-lint-ignore no-explicit-any
    let ebillingData: any
    try {
      ebillingData = await ebillingResponse.json()
    } catch {
      console.error('EBILLING API returned non-JSON response, status:', ebillingResponse.status)
      ebillingData = { error: 'Invalid response from payment service' }
    }

    console.log('EBILLING API response:', ebillingResponse.status, JSON.stringify(ebillingData))

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

    // Extract bill_id from response
    const billId = ebillingData.e_bill?.bill_id || ebillingData.bill_id
    
    if (!billId) {
      console.error('No bill_id in EBILLING response:', ebillingData)
      return new Response(
        JSON.stringify({ error: 'Invalid response from payment service' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update transaction with EBILLING bill_id
    await supabase
      .from('payment_transactions')
      .update({ ebilling_transaction_id: String(billId) })
      .eq('id', transaction.id)

    // Construct the hosted payment page URL
    // Format: {base_url}?invoice={bill_id}&redirect_url={success_url}&redirect_failed_url={failed_url}
    const paymentUrl = `${EBILLING_BASE_URL}?invoice=${billId}&redirect_url=${encodeURIComponent(successUrl)}&redirect_failed_url=${encodeURIComponent(cancelUrl)}`

    console.log('Payment URL generated:', paymentUrl)

    // Return the payment URL to redirect the user 
    return new Response(
      JSON.stringify({
        success: true,
        reference: reference,
        transactionId: transaction.id,
        billId: billId,
        paymentUrl: paymentUrl,
        expiresAt: ebillingData.e_bill?.expire_at || null
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
