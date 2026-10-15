import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { classifyMemorial, readMemorialPrice } from '../_shared/memorialPricing.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Forbidden author names
const FORBIDDEN_NAMES = [
  'super admin',
  'admin',
  'administrateur',
  'test',
  'utilisateur',
  'anonymous',
  'anonyme',
  'system',
  'système',
  'modérateur',
  'moderateur',
  'moderator',
  'floorence',
  'support',
  'helpdesk',
]

// Input validation schema
const CreateMemorialSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deathDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  funeralDate: z.string().optional(),
  funeralLocation: z.string().max(200).optional(),
  biography: z.string().max(2000).optional(),
  authorRelation: z.string().min(1),
  heirEmail: z.string().email(),
  enableContributions: z.boolean().optional(),
  photoUrl: z.string().url().optional(),
  photos: z.array(z.string().url()).max(3).optional(),
  notificationFrequency: z.enum(['immediate', 'weekly_saturday', 'monthly_window', 'none']).optional(),
  notificationStartDay: z.number().int().min(1).max(31).optional(),
  notificationEndDay: z.number().int().min(1).max(31).optional(),
})

// Generate secure slug using initials + random ID format
const generateSecureSlug = async (
  supabase: ReturnType<typeof createClient>,
  firstName: string,
  lastName: string
): Promise<string> => {
  const firstInitial = firstName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .charAt(0)
    .toLowerCase()
  const lastInitial = lastName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .charAt(0)
    .toLowerCase()
  const initials = `${firstInitial}${lastInitial}`

  const randomBytes = new Uint8Array(4)
  crypto.getRandomValues(randomBytes)
  const randomId = Array.from(randomBytes)
    .map(b => b.toString(36).padStart(2, '0'))
    .join('')
    .substring(0, 6)

  let slug = `${initials}-${randomId}`

  const { data: existing } = await supabase
    .from('memorials')
    .select('slug')
    .eq('slug', slug)
    .single()

  if (existing) {
    const extraRandom = Array.from(crypto.getRandomValues(new Uint8Array(2)))
      .map(b => b.toString(36))
      .join('')
    slug = `${initials}-${randomId}${extraRandom}`
  }

  return slug
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Corps de requête invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validationResult = CreateMemorialSchema.safeParse(rawBody)
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.issues)
      return new Response(
        JSON.stringify({ 
          error: 'Données invalides', 
          details: validationResult.error.issues 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = validationResult.data

    // Check for forbidden author names in profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single()

    if (profile?.display_name) {
      const normalizedName = profile.display_name.toLowerCase().trim()
      if (FORBIDDEN_NAMES.some(fn => normalizedName.includes(fn))) {
        return new Response(
          JSON.stringify({ 
            error: 'Veuillez mettre à jour votre profil avec votre vrai nom avant de créer un espace mémoriel.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ── G1-FIX7: server-side category + active price (system_settings) ──
    const classification = classifyMemorial(data.deathDate, data.funeralDate || null)
    if (!classification.ok) {
      return new Response(
        JSON.stringify({ error: classification.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const category = classification.category

    const supabaseAdmin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const price = await readMemorialPrice(supabaseAdmin, category)
    if (price === null) {
      return new Response(
        JSON.stringify({ error: 'Tarif indisponible, réessayez plus tard' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const { data: monetization } = await supabaseAdmin
      .from('global_settings').select('value_bool').eq('key', 'is_monetized').maybeSingle()
    const isMonetized = monetization?.value_bool ?? false
    const requiresPayment = isMonetized && price > 0

    const slug = await generateSecureSlug(supabase, data.firstName, data.lastName)

    const photosArray = data.photos && data.photos.length > 0
      ? data.photos
      : data.photoUrl
        ? [data.photoUrl]
        : []

    // Insert through the server role: end users can never publish directly (trg_guard_memorial_publication).
    const { data: memorial, error: createError } = await supabaseAdmin
      .from('memorials')
      .insert({
        first_name: data.firstName,
        last_name: data.lastName,
        birth_date: data.birthDate,
        death_date: data.deathDate,
        funeral_date: data.funeralDate || null,
        funeral_location: data.funeralLocation || null,
        biography: data.biography || null,
        heir_email: data.heirEmail,
        donation_enabled: data.enableContributions ?? true,
        photo_url: photosArray[0] || null,
        photos: photosArray,
        creator_relation: data.authorRelation,
        slug: slug,
        created_by: user.id,
        is_active: true,
        is_published: !requiresPayment,
        notification_frequency: data.notificationFrequency || null,
        notification_start_day: data.notificationStartDay ?? null,
        notification_end_day: data.notificationEndDay ?? null,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating memorial:', createError)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création de l\'espace mémoriel' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[create-memorial] ${memorial.id} category=${category} price=${price} published=${!requiresPayment}`)

    return new Response(
      JSON.stringify({
        success: true,
        category,
        price,
        currency: 'XAF',
        requires_payment: requiresPayment,
        published: !requiresPayment,
        memorial: {
          id: memorial.id,
          slug: memorial.slug,
          share_token: memorial.share_token,
          firstName: memorial.first_name,
          lastName: memorial.last_name,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Create memorial error:', error)
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
