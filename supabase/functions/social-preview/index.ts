import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Regex to detect social media crawlers
const CRAWLER_REGEX = /facebookexternalhit|Facebot|Twitterbot|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Pinterest|Discordbot|Googlebot|bingbot/i;

const DEFAULT_IMAGE = 'https://floorence.lovable.app/icons/icon-512x512.png';
const APP_BASE_URL = 'https://floorence.lovable.app';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    
    if (!slug) {
      return new Response(JSON.stringify({ error: 'Missing slug' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const userAgent = req.headers.get('user-agent') || '';
    const isCrawler = CRAWLER_REGEX.test(userAgent);
    
    console.log(`[social-preview] slug: ${slug}, crawler: ${isCrawler}, ua: ${userAgent.substring(0, 100)}`);

    // Fetch memorial data first (needed for both crawlers and redirect)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    // Try to find memorial by slug OR legacy_slug
    let { data: memorial } = await supabase
      .from('memorials')
      .select('slug, first_name, last_name, photo_url, photos, default_photo_index, birth_date, death_date, biography')
      .eq('slug', slug)
      .eq('is_active', true)
      .eq('is_published', true)
      .is('merged_into', null)
      .maybeSingle();

    // If not found by current slug, try legacy_slug
    if (!memorial) {
      const { data: legacyMemorial } = await supabase
        .from('memorials')
        .select('slug, first_name, last_name, photo_url, photos, default_photo_index, birth_date, death_date, biography')
        .eq('legacy_slug', slug)
        .eq('is_active', true)
        .eq('is_published', true)
        .is('merged_into', null)
        .maybeSingle();
      
      if (legacyMemorial) {
        memorial = legacyMemorial;
      }
    }

    if (!memorial) {
      // Memorial not found - redirect to 404
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': `${APP_BASE_URL}/404` },
      });
    }

    // Always use the CANONICAL (current) slug for URLs - this ensures 301 behavior
    const canonicalUrl = `${APP_BASE_URL}/memorial/${memorial.slug}`;

    // Redirect non-crawlers to the SPA with canonical URL
    if (!isCrawler) {
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': canonicalUrl },
      });
    }

    // Build OG data for crawlers
    const fullName = `${memorial.first_name} ${memorial.last_name}`;
    const birthYear = memorial.birth_date ? new Date(memorial.birth_date).getFullYear() : null;
    const deathYear = memorial.death_date ? new Date(memorial.death_date).getFullYear() : null;
    
    // Title: "Nom Complet (YYYY - YYYY) | Floorence : Honorer · Relier · Transmettre"
    let ogTitle = fullName;
    if (birthYear && deathYear) {
      ogTitle += ` (${birthYear} - ${deathYear})`;
    }
    
    // Calculate age for description
    let age: number | null = null;
    if (memorial.birth_date && memorial.death_date) {
      const birth = new Date(memorial.birth_date);
      const death = new Date(memorial.death_date);
      age = death.getFullYear() - birth.getFullYear();
      if (death.getMonth() < birth.getMonth() || 
          (death.getMonth() === birth.getMonth() && death.getDate() < birth.getDate())) {
        age--;
      }
    }
    
    // Description: use biography excerpt if available, otherwise default emotional copy
    const biography = (memorial as any).biography;
    let ogDescription: string;
    if (biography && biography.length > 30) {
      const truncated = biography.length > 120 ? biography.substring(0, 117) + '…' : biography;
      ogDescription = `${truncated} — Découvrez l'espace mémoriel de ${fullName}`;
    } else {
      ogDescription = `Découvrez l'espace mémoriel de ${fullName}`;
    }
    if (age !== null) {
      ogDescription += ` (${age} ans)`;
    }
    ogDescription += ` et rejoignez son maillage familial sur Floorence.`;

    // Get best photo - prefer photos array with default index, fallback to photo_url
    let imageUrl = DEFAULT_IMAGE;
    if (memorial.photos && memorial.photos.length > 0) {
      const photoIndex = Math.min(memorial.default_photo_index ?? 0, memorial.photos.length - 1);
      imageUrl = memorial.photos[photoIndex];
    } else if (memorial.photo_url) {
      imageUrl = memorial.photo_url;
    }

    const brandedTitle = `${ogTitle} | Floorence : Honorer \xb7 Relier \xb7 Transmettre`;

    // Generate minimal HTML with all necessary OG tags
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(brandedTitle)}</title>
<meta name="description" content="${escapeHtml(ogDescription)}">
<link rel="canonical" href="${escapeHtml(canonicalUrl)}">

<!-- Open Graph / Facebook -->
<meta property="og:type" content="profile">
<meta property="og:url" content="${escapeHtml(canonicalUrl)}">
<meta property="og:title" content="${escapeHtml(brandedTitle)}">
<meta property="og:description" content="${escapeHtml(ogDescription)}">
<meta property="og:image" content="${escapeHtml(imageUrl)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:site_name" content="Floorence">
<meta property="og:locale" content="fr_FR">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(brandedTitle)}">
<meta name="twitter:description" content="${escapeHtml(ogDescription)}">
<meta name="twitter:image" content="${escapeHtml(imageUrl)}">

<!-- Redirect -->
<meta http-equiv="refresh" content="0; url=${escapeHtml(canonicalUrl)}">
</head>
<body>
<p>Redirection vers <a href="${escapeHtml(canonicalUrl)}">${escapeHtml(fullName)}</a>...</p>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('[social-preview] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
