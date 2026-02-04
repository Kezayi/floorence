import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

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
})

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with user's JWT
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    })

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse and validate request body
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

    // Generate unique slug
    const baseSlug = `${data.firstName}-${data.lastName}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Check for existing slugs and generate unique one
    const { data: existingSlugs } = await supabase
      .from('memorials')
      .select('slug')
      .ilike('slug', `${baseSlug}%`)

    let slug = baseSlug
    if (existingSlugs && existingSlugs.length > 0) {
      const existingSet = new Set(existingSlugs.map(m => m.slug))
      let counter = 1
      while (existingSet.has(slug)) {
        slug = `${baseSlug}-${counter}`
        counter++
      }
    }

    console.log('Creating memorial with slug:', slug)

    // Create the memorial (unpublished)
    const { data: memorial, error: createError } = await supabase
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
        photo_url: data.photoUrl || null,
        slug: slug,
        created_by: user.id,
        is_active: true,
        is_published: false, // Will be set to true after payment
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

    console.log('Memorial created successfully:', memorial.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        memorial: {
          id: memorial.id,
          slug: memorial.slug,
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
