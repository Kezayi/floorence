import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Blocklist patterns for inappropriate content
const BLOCKED_PATTERNS = [
  /politi(que|cien)/i,
  /élection/i,
  /parti\s/i,
  /président/i,
  /insult/i,
  /haine/i,
  /violen(ce|t)/i,
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { defuntName, relation, souvenir } = await req.json();

    if (!defuntName || !relation || !souvenir) {
      return new Response(
        JSON.stringify({ error: "Champs requis : defuntName, relation, souvenir" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize inputs
    const sanitize = (s: string) => s.slice(0, 200).replace(/[<>{}]/g, "");
    const cleanRelation = sanitize(relation);
    const cleanSouvenir = sanitize(souvenir);
    const cleanName = sanitize(defuntName);

    // Check for blocked content in inputs
    const allInput = `${cleanRelation} ${cleanSouvenir}`;
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(allInput)) {
        return new Response(
          JSON.stringify({ error: "Le contenu soumis contient des termes inappropriés." }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const systemPrompt = `Tu es un assistant mémoriel spécialisé dans les traditions gabonaises. Ton ton est solennel, chaleureux et profondément respectueux.

Règles strictes :
- Rédige un message court (maximum 250 caractères) pour le Livre d'Or de ${cleanName}.
- Utilise des expressions culturellement appropriées comme : « Que la terre lui soit légère », « Une grande âme nous a quittés », ou « Nos pensées accompagnent la famille en ces moments de douleur ».
- Adapte le vouvoiement ou le tutoiement selon le lien de parenté fourni.
- Ne mentionne JAMAIS de politique, de religion spécifique controversée, ou de contenu inapproprié.
- Réponds UNIQUEMENT avec le texte du message, sans guillemets, sans explication.`;

    const userPrompt = `Lien avec le défunt : ${cleanRelation}
Souvenir ou qualité : ${cleanSouvenir}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Service temporairement indisponible. Réessayez dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erreur de génération" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const tribute = data.choices?.[0]?.message?.content?.trim() || "";

    // Post-generation content filter
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(tribute)) {
        return new Response(
          JSON.stringify({ error: "Le texte généré n'a pas passé le filtre de contenu. Veuillez réessayer." }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ tribute }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-tribute error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
