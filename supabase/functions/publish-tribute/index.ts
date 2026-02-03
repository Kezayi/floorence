import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Valid relation categories
const VALID_RELATION_CATEGORIES = [
  'family',
  'friend',
  'colleague',
  'neighbor',
  'acquaintance',
  'other'
] as const

// Input validation schema
const TributeInputSchema = z.object({
  paymentReference: z.string().max(100).optional().nullable(),
  memorialId: z.string().uuid('Invalid memorial ID format'),
  content: z.string()
    .min(1, 'Message content is required')
    .max(5000, 'Message content exceeds 5000 characters'),
  relationCategory: z.enum(VALID_RELATION_CATEGORIES, {
    errorMap: () => ({ message: 'Invalid relation category' })
  }),
  photos: z.array(z.string().url().or(z.string().startsWith('data:image/')))
    .max(3, 'Maximum 3 photos allowed')
    .default([]),
  candleCount: z.number().int().min(0).max(100).default(0),
  flowerCount: z.number().int().min(0).max(100).default(0),
})

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify user authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Verify user token using getUser (getClaims is deprecated)
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !userData?.user) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = userData.user.id
    
    // Get author name from user metadata or profile
    let authorName = userData.user.user_metadata?.full_name || 
                     userData.user.user_metadata?.display_name ||
                     userData.user.email?.split('@')[0] || 
                     'Utilisateur anonyme'
    
    // Try to get display name from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', userId)
      .maybeSingle()
    
    if (profile?.display_name) {
      authorName = profile.display_name
    }

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

    const validationResult = TributeInputSchema.safeParse(rawBody)
    
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

    const { 
      paymentReference, 
      memorialId, 
      content, 
      relationCategory, 
      photos, 
      candleCount, 
      flowerCount 
    } = validationResult.data

    console.log('Publishing tribute:', { memorialId, userId, hasPaymentRef: !!paymentReference })

    // If there's a payment reference, verify the payment is completed
    if (paymentReference) {
      const { data: transaction, error: txError } = await supabase
        .from('payment_transactions')
        .select('status, user_id')
        .eq('ebilling_reference', paymentReference)
        .maybeSingle()

      if (txError) {
        console.error('Error fetching transaction:', txError)
        return new Response(
          JSON.stringify({ error: 'Failed to verify payment' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!transaction) {
        return new Response(
          JSON.stringify({ error: 'Payment not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify the transaction belongs to this user
      if (transaction.user_id !== userId) {
        console.error('User mismatch:', { txUserId: transaction.user_id, userId })
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Transaction does not belong to user' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check payment status
      if (transaction.status === 'failed' || transaction.status === 'cancelled') {
        return new Response(
          JSON.stringify({ error: 'Payment was not successful' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Check if post with this payment reference already exists (idempotency)
    if (paymentReference) {
      const { data: existingPost } = await supabase
        .from('guestbook_posts')
        .select('id')
        .eq('payment_reference', paymentReference)
        .maybeSingle()

      if (existingPost) {
        console.log('Tribute already exists for payment:', paymentReference)
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Tribute already published',
            postId: existingPost.id 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Insert the guestbook post
    const { data: post, error: insertError } = await supabase
      .from('guestbook_posts')
      .insert({
        memorial_id: memorialId,
        user_id: userId,
        author_name: authorName,
        relation_category: relationCategory,
        content: content,
        photos: photos,
        candle_count: candleCount,
        flower_count: flowerCount,
        payment_reference: paymentReference || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting post:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to publish tribute' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Tribute published successfully:', post.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Tribute published successfully',
        postId: post.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Publish tribute error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
