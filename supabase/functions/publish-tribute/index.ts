import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { checkTributeGestures } from '../_shared/gestureRules.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// In-memory rate limiter (persists within function isolate lifetime)
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 30_000 // 30 seconds between tributes per user
 
 // Valid relation categories (French labels used by frontend for "Maillage" feature)
 const VALID_RELATION_CATEGORIES = [
   // Famille directe
   "Son Père", "Sa Mère", "Son Fils", "Sa Fille",
   "Son Grand-père", "Sa Grand-mère", "Son Petit-fils", "Sa Petite-fille",
   "Son Arrière-grand-père", "Sa Arrière-grand-mère", "Son Arrière-petit-fils", "Sa Arrière-petite-fille",
   "Son Frère", "Sa Sœur",
   // Famille élargie
   "Son Oncle", "Sa Tante", "Son Neveu", "Sa Nièce", "Son Cousin", "Sa Cousine",
   "Son Grand-oncle", "Sa Grande-tante", "Son Petit-neveu", "Sa Petite-nièce",
   "Son Petit-cousin", "Sa Petite-cousine",
   // Alliés
   "Son Époux", "Son Épouse", "Son Beau-père", "Sa Belle-mère",
   "Son Beau-fils", "Sa Belle-fille", "Son Beau-frère", "Sa Belle-sœur",
   "Son Bel-oncle", "Sa Belle-tante",
   // Socio cœur
   "Son Frère d'une autre mère", "Sa Sœur d'une autre mère",
   "Son Ami", "Son Collègue", "Son Co-équipier", "Sa Co-équipière",
   "Son Parrain", "Sa Marraine", "Son Filleul", "Sa Filleule",
   // Autres
   "Son Client", "Sa Cliente", "Son Fournisseur", "Son Prestataire",
   "Son Associé(e)", "Son Élève", "Son Étudiant(e)", "Son Disciple",
   "Son Camarade de classe", "Son Voisin", "Sa Voisine",
   "Son Copropriétaire", "Son Locataire", "Son Bailleur",
   // Legacy categories (for backward compatibility)
   "Son Demi-frère", "Sa Demi-sœur", "Son Gendre", "Son Co-époux", "Sa Co-épouse",
   "Son Frère de cœur", "Sa Sœur de cœur", "Son Ami(e)", "Son Ami(e) d'enfance",
   "Son Parrain/Marraine", "Son Filleul(e)", "Son Camarade de promotion", "Son Compagnon d'armes",
   "Son Voisin(e)", "Son Professeur", "Son Mentor", "Son Employeur",
   "Son Pasteur/Imam", "Son Chef coutumier", "Une connaissance", "Un admirateur", "Un anonyme",
   "Sa Grand-tante",
   "family", "friend", "colleague", "neighbor", "acquaintance", "other"
 ] as const
 
 // Input validation schema - BETA: No payment reference needed
 const TributeInputSchema = z.object({
   memorialId: z.string().uuid('Invalid memorial ID format'),
   content: z.string()
     .min(1, 'Message content is required')
     .max(5000, 'Message content exceeds 5000 characters'),
   relationCategory: z.string().min(1, 'Relation category is required'),
   relationLink: z.string().min(1, 'Relation link is required').optional().default(''),
   photos: z.array(z.string().url().or(z.string().startsWith('data:image/')))
     .max(3, 'Maximum 3 photos allowed')
     .default([]),
   candleCount: z.number().int().min(0).max(100).default(0),
   flowerCount: z.number().int().min(0).max(100).default(0),
   // GEO-02: country declared at deposit + explicit public consent (default: not shown).
   countryCode: z.string().regex(/^[A-Z]{2}$/).nullable().optional().default(null),
   countryPublic: z.boolean().optional().default(false),
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
 
     // Verify user token using getUser
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
     
      // Rate limiting: max 1 tribute per 30 seconds per user
      const now = Date.now()
      const lastRequest = rateLimitMap.get(userId)
      if (lastRequest && now - lastRequest < RATE_LIMIT_MS) {
        const remainingSeconds = Math.ceil((RATE_LIMIT_MS - (now - lastRequest)) / 1000)
        console.log(`[RATE LIMIT] User ${userId} rate-limited, ${remainingSeconds}s remaining`)
        return new Response(
          JSON.stringify({ 
            error: `Veuillez patienter ${remainingSeconds} secondes avant votre prochain hommage.`,
            rateLimited: true
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Record this request timestamp
      rateLimitMap.set(userId, now)

      // Clean up old entries to prevent memory leaks (keep last 500)
      if (rateLimitMap.size > 500) {
        const entries = [...rateLimitMap.entries()]
        entries.sort((a, b) => a[1] - b[1])
        for (let i = 0; i < entries.length - 250; i++) {
          rateLimitMap.delete(entries[i][0])
        }
      }

      // Get author name from user metadata or profile
      let authorName = userData.user.user_metadata?.full_name || 
                       userData.user.user_metadata?.display_name ||
                       userData.user.email?.split('@')[0] || 
                       'Utilisateur anonyme'
     
     // Try to get display name from profiles table
     const { data: profile } = await supabase
       .from('profiles')
       .select('display_name, avatar_url')
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
       memorialId, 
       content, 
       relationCategory, 
       relationLink,
       photos, 
       candleCount, 
       flowerCount,
       countryCode,
       countryPublic
     } = validationResult.data
     // GEO-02: the country is stored on the tribute only with explicit public consent.
     const authorCountryCode = countryPublic && countryCode ? countryCode : null
 
      // Check server-side monetization mode
      const { data: monetizationSetting } = await supabase
        .from('global_settings')
        .select('value_bool')
        .eq('key', 'is_monetized')
        .maybeSingle()

      const isMonetized = monetizationSetting?.value_bool ?? false
      // GESTURES-UNLIMITED: any quantity, one type per payment (amount ceiling checked in ebilling).
      if (candleCount > 0 || flowerCount > 0) {
        const gestureCheck = checkTributeGestures(candleCount, flowerCount)
        if (!gestureCheck.ok) {
          return new Response(JSON.stringify({ error: gestureCheck.error }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }
      // MON-02: written tributes are always free; only candles/flowers (always paid) keep it hidden until payment.
      const mustStayHidden = candleCount > 0 || flowerCount > 0

      console.log('[publish-tribute] Publishing tribute:', { memorialId, userId, authorName, isMonetized, is_hidden: isMonetized })
  
      // Insert with is_hidden based on monetization:
      // - Free mode: is_hidden = false (visible immediately)
      // - Paid mode: is_hidden = true (unlocked only by ebilling-callback or manual sync)
      const { data: post, error: insertError } = await supabase
        .from('guestbook_posts')
        .insert({
          memorial_id: memorialId,
          user_id: userId,
          author_name: authorName,
          // Public author portrait comes from the verified account, never the request body.
          author_photo_url: profile?.avatar_url || null,
          relation_category: relationCategory,
          relation_link: relationLink || null,
          content: content,
          photos: photos,
          candle_count: candleCount,
          flower_count: flowerCount,
          author_country_code: authorCountryCode,
          is_hidden: mustStayHidden,
          payment_reference: null,
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
 
     console.log('[publish-tribute] Tribute published:', post.id, { is_hidden: isMonetized })
 
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
