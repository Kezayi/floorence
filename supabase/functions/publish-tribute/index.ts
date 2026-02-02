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

    // Get user profile for author name
    const { data: userData } = await supabase.auth.getUser(token)
    const authorName = userData?.user?.user_metadata?.full_name || 
                       userData?.user?.email?.split('@')[0] || 
                       'Utilisateur anonyme'

    // Parse request body
    const { 
      paymentReference, 
      memorialId, 
      content, 
      relationCategory, 
      photos, 
      candleCount, 
      flowerCount 
    } = await req.json()

    console.log('Publishing tribute:', { paymentReference, memorialId, userId })

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
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Transaction does not belong to user' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // For now, we'll allow pending payments to proceed (EBILLING callback might be delayed)
      // In production, you might want stricter validation
      if (transaction.status === 'failed' || transaction.status === 'cancelled') {
        return new Response(
          JSON.stringify({ error: 'Payment was not successful' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Check if post with this payment reference already exists
    if (paymentReference) {
      const { data: existingPost } = await supabase
        .from('guestbook_posts')
        .select('id')
        .eq('payment_reference', paymentReference)
        .maybeSingle()

      if (existingPost) {
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
        photos: photos || [],
        candle_count: candleCount || 0,
        flower_count: flowerCount || 0,
        payment_reference: paymentReference
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
