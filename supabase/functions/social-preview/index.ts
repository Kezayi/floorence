import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const canonicalUrl = `${APP_BASE_URL}/memorial/${slug}`;
    
    console.log(`[social-preview] slug: ${slug}, crawler: ${isCrawler}`);

    // Redirect non-crawlers to the SPA
    if (!isCrawler) {
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': canonicalUrl },
      });
    }

    // Fetch memorial data
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    let { data: memorial } = await supabase
      .from('memorials')
      .select('slug, first_name, last_name, photo_url, photos, default_photo_index, birth_date, death_date')
      .eq('slug', slug)
      .eq('is_active', true)
      .eq('is_published', true)
      .is('merged_into', null)
      .maybeSingle();

    // Try legacy slug if not found
    if (!memorial) {
      const { data: legacyMemorial } = await supabase
        .from('memorials')
        .select('slug, first_name, last_name, photo_url, photos, default_photo_index, birth_date, death_date')
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
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': `${APP_BASE_URL}/404` },
      });
    }

    // Build OG data
    const fullName = `${memorial.first_name} ${memorial.last_name}`;
    const birthYear = memorial.birth_date ? new Date(memorial.birth_date).getFullYear() : null;
    const deathYear = memorial.death_date ? new Date(memorial.death_date).getFullYear() : null;
    
    let ogTitle = `Hommage à ${fullName}`;
    if (birthYear && deathYear) ogTitle += ` (${birthYear} - ${deathYear})`;
    
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
    
    let ogDescription = `Rejoignez la communauté de mémoire de ${fullName}`;
    if (age !== null) ogDescription += ` (${age} ans)`;
    ogDescription += ` sur Floorence. Laissez un message ou un geste de recueillement.`;

    // Get photo
    let imageUrl = DEFAULT_IMAGE;
    if (memorial.photos && memorial.photos.length > 0) {
      const idx = Math.min(memorial.default_photo_index ?? 0, memorial.photos.length - 1);
      imageUrl = memorial.photos[idx];
    } else if (memorial.photo_url) {
      imageUrl = memorial.photo_url;
    }

    const finalUrl = `${APP_BASE_URL}/memorial/${memorial.slug}`;

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(ogTitle)} | Floorence</title>
<meta property="og:type" content="profile">
<meta property="og:url" content="${escapeHtml(finalUrl)}">
<meta property="og:title" content="${escapeHtml(ogTitle)}">
<meta property="og:description" content="${escapeHtml(ogDescription)}">
<meta property="og:image" content="${escapeHtml(imageUrl)}">
<meta property="og:site_name" content="Floorence">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(ogTitle)}">
<meta name="twitter:description" content="${escapeHtml(ogDescription)}">
<meta name="twitter:image" content="${escapeHtml(imageUrl)}">
<meta name="description" content="${escapeHtml(ogDescription)}">
<link rel="canonical" href="${escapeHtml(finalUrl)}">
<meta http-equiv="refresh" content="0; url=${escapeHtml(finalUrl)}">
</head>
<body><p>Redirection...</p></body>
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
