import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Regex to detect social media crawlers
const CRAWLER_REGEX = /facebookexternalhit|Facebot|Twitterbot|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Pinterest|Discordbot|Googlebot|bingbot/i;

const DEFAULT_IMAGE = 'https://floorence.org/icons/icon-512x512.png';
const APP_BASE_URL = 'https://floorence.org';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Sélectionne le portrait du défunt : photo par défaut, sinon première photo
 * valide, sinon photo_url. Ne renvoie jamais une valeur vide.
 */
function resolvePortrait(memorial: any): string | null {
  const photos: string[] = Array.isArray(memorial.photos)
    ? memorial.photos.filter((p: unknown) => typeof p === 'string' && p.trim().length > 0)
    : [];

  if (photos.length > 0) {
    const index = Math.min(Math.max(memorial.default_photo_index ?? 0, 0), photos.length - 1);
    return photos[index] ?? photos[0];
  }
  if (typeof memorial.photo_url === 'string' && memorial.photo_url.trim().length > 0) {
    return memorial.photo_url.trim();
  }
  return null;
}

/**
 * Construit une URL d'image absolue, publique et calibrée pour les crawlers
 * (WhatsApp/Facebook) : 1200x1200, qualité 80, servie par la CDN de
 * transformation du Storage. Toute image relative est résolue sur le Storage.
 */
function buildShareImageUrl(raw: string | null): string {
  if (!raw) return DEFAULT_IMAGE;

  const supabaseUrl = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '');
  let url = raw.trim();

  // Chemin relatif dans un bucket public -> URL publique absolue
  if (!/^https?:\/\//i.test(url)) {
    if (!supabaseUrl) return DEFAULT_IMAGE;
    url = `${supabaseUrl}/storage/v1/object/public/${url.replace(/^\/+/, '')}`;
  }

  const OBJECT_PUBLIC = '/storage/v1/object/public/';
  const RENDER_PUBLIC = '/storage/v1/render/image/public/';

  if (!url.includes(OBJECT_PUBLIC)) return url;

  const [base, query] = url.split('?');
  if (query?.includes('width=')) return url;

  return `${base.replace(OBJECT_PUBLIC, RENDER_PUBLIC)}?width=1200&height=1200&resize=cover&quality=80`;
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    const token = url.searchParams.get('token');
    
    if (!slug && !token) {
      return new Response(JSON.stringify({ error: 'Missing slug or token' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const userAgent = req.headers.get('user-agent') || '';
    const isCrawler = CRAWLER_REGEX.test(userAgent);
    
    console.log(`[social-preview] slug: ${slug}, token: ${token}, crawler: ${isCrawler}, ua: ${userAgent.substring(0, 100)}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    let memorial: any = null;

    // Priority: resolve by share_token first (obfuscated sharing), then by slug
    if (token) {
      const { data } = await supabase
        .from('memorials')
        .select('slug, first_name, last_name, photo_url, photos, default_photo_index, birth_date, death_date, biography')
        .eq('share_token', token)
        .eq('is_active', true)
        .eq('is_published', true)
        .is('merged_into', null)
        .maybeSingle();
      memorial = data;
    }

    if (!memorial && slug) {
      // Try current slug
      const { data } = await supabase
        .from('memorials')
        .select('slug, first_name, last_name, photo_url, photos, default_photo_index, birth_date, death_date, biography')
        .eq('slug', slug)
        .eq('is_active', true)
        .eq('is_published', true)
        .is('merged_into', null)
        .maybeSingle();
      memorial = data;

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
    }

    // M2.4B — historical public link of a source associated to a Master: resolve the direct Master only.
    let historicalMasterToken: string | null = null;
    if (!memorial) {
      let srcQ = supabase
        .from('memorials')
        .select('id, merged_into')
        .eq('is_active', true)
        .eq('is_published', true)
        .is('deleted_at', null)
        .not('merged_into', 'is', null);
      srcQ = token ? srcQ.eq('share_token', token) : srcQ.or(`slug.eq.${slug},legacy_slug.eq.${slug}`);
      const { data: src } = await srcQ.maybeSingle();
      if (src?.merged_into && src.merged_into !== src.id) {
        const { data: master } = await supabase
          .from('memorials')
          .select('slug, share_token, first_name, last_name, photo_url, photos, default_photo_index, birth_date, death_date, biography')
          .eq('id', src.merged_into)
          .eq('is_active', true)
          .eq('is_published', true)
          .is('deleted_at', null)
          .is('merged_into', null)
          .maybeSingle();
        if (master?.share_token) {
          memorial = master;
          historicalMasterToken = master.share_token;
        }
      }
    }

    if (!memorial) {
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': `${APP_BASE_URL}/404` },
      });
    }

    // Always use the CANONICAL (current) slug for URLs
    const canonicalUrl = historicalMasterToken
      ? `${APP_BASE_URL}/m/${historicalMasterToken}`
      : `${APP_BASE_URL}/memorial/${memorial.slug}`;

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
    
    // Description: use biography excerpt if available
    const biography = memorial.biography;
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

    // RÈGLE MÉTIER : la photo du défunt doit TOUJOURS apparaître dans le partage.
    const rawImage = resolvePortrait(memorial);
    const imageUrl = buildShareImageUrl(rawImage);
    const imageType = imageUrl.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg';

    const brandedTitle = `${ogTitle} | Floorence : Honorer \xb7 Relier \xb7 Transmettre`;

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
<meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
<meta property="og:image:type" content="${imageType}">
<meta property="og:image:alt" content="${escapeHtml(`Portrait de ${fullName}`)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="1200">

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
        'Cache-Control': 'public, max-age=3600',
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
