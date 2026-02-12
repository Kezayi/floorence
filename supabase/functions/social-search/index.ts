import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string") {
      return new Response(JSON.stringify({ error: "Question requise" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Gather social context ──────────────────────────────────────────

    // 1. All memorials (name + dates)
    const { data: memorials } = await supabase
      .from("memorials")
      .select("id, first_name, last_name, birth_date, death_date, is_demo, total_posts, total_candles, total_flowers")
      .eq("is_active", true)
      .eq("is_published", true)
      .limit(200);

    // 2. All guestbook posts (author, relation, gestures)
    const { data: posts } = await supabase
      .from("guestbook_posts")
      .select("id, memorial_id, author_name, relation_category, relation_group, candle_count, flower_count, content, user_id, is_demo")
      .eq("is_hidden", false)
      .limit(500);

    // 3. All accepted memorial relations (lineage links)
    const { data: relations } = await supabase
      .from("memorial_relations")
      .select("memorial_id_1, memorial_id_2, relation_type, status")
      .eq("status", "accepted")
      .limit(500);

    // ── Build context for LLM ──────────────────────────────────────────

    const memorialMap = new Map(
      (memorials || []).map((m: any) => [m.id, `${m.first_name} ${m.last_name}`])
    );

    const contextLines: string[] = [];

    // Memorial summaries
    for (const m of memorials || []) {
      contextLines.push(
        `MÉMORIAL: ${m.first_name} ${m.last_name} (${m.birth_date || "?"} – ${m.death_date || "?"}) | ${m.total_posts || 0} hommages, ${m.total_candles || 0} cierges, ${m.total_flowers || 0} fleurs ${m.is_demo ? "[DÉMO]" : ""}`
      );
    }

    // Relation links between memorials
    for (const r of relations || []) {
      const n1 = memorialMap.get(r.memorial_id_1) || "?";
      const n2 = memorialMap.get(r.memorial_id_2) || "?";
      contextLines.push(`LIEN: ${n1} ↔ ${n2} (${r.relation_type})`);
    }

    // Guestbook posts (author → memorial with relation)
    for (const p of posts || []) {
      const mName = memorialMap.get(p.memorial_id) || "?";
      contextLines.push(
        `HOMMAGE #${p.id.slice(0, 8)}: ${p.author_name} → ${mName} | Lien: ${p.relation_category} (${p.relation_group || "non classé"}) | Cierges: ${p.candle_count}, Fleurs: ${p.flower_count} ${p.is_demo ? "[DÉMO]" : ""}`
      );
    }

    const systemPrompt = `Tu es l'Intelligence Sociale de Floorence, une plateforme mémorielle gabonaise.
Tu analyses le maillage social autour des défunts pour aider les administrateurs.

RÈGLES ABSOLUES :
1. CITE TOUJOURS tes sources : "Source : Hommage #ID" ou "Source : Lien certifié".
2. Ne JAMAIS inventer de lien. Si tu ne trouves pas, dis-le clairement.
3. Priorise la fiabilité des liens dans cet ordre :
   - Famille directe (sang) → confiance maximale
   - Socio cœur (fraternité choisie) → confiance forte
   - Alliés (alliances matrimoniales) → confiance forte
   - Famille élargie → confiance moyenne
   - Autres → confiance faible
4. L'implication émotionnelle se mesure par : nombre de cierges + fleurs + longueur de l'hommage.
5. Réponds toujours en français, de manière structurée et avec empathie.
6. Si on te demande "qui présenter à X", identifie les cercles sociaux communs et les relais de confiance.

CONTEXTE SOCIAL ACTUEL :
${contextLines.join("\n")}`;

    // ── Call Lovable AI (streaming) ────────────────────────────────────

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question },
          ],
          stream: true,
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte, réessayez dans un instant." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés. Rechargez votre espace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "Erreur du moteur IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("social-search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
