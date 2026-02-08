import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface SuggestionForEmail {
  id: string;
  source_name: string;
  target_name: string;
  suggested_relation: string;
  inference_logic: string | null;
}

interface CreatorGroup {
  email: string;
  display_name: string;
  suggestions: SuggestionForEmail[];
}

/**
 * Generates the HTML email for lineage revelation.
 * Groups multiple suggestions into a single email to avoid spam.
 */
function generateRevelationEmail(
  creatorName: string,
  suggestions: SuggestionForEmail[],
  appUrl: string
): string {
  const isSingle = suggestions.length === 1;
  const s = suggestions[0];

  const suggestionsHtml = suggestions
    .map(
      (sug) => `
      <tr>
        <td style="padding: 16px; border-bottom: 1px solid #3a3a3a;">
          <p style="margin: 0 0 8px; color: #ffffff; font-size: 15px; font-weight: 500;">
            🌿 ${sug.source_name} → <span style="color: #D4AF37; font-weight: 700;">${sug.suggested_relation}</span> → ${sug.target_name}
          </p>
          ${
            sug.inference_logic
              ? `<p style="margin: 0; color: #888888; font-size: 12px; font-style: italic;">Logique : ${sug.inference_logic}</p>`
              : ""
          }
        </td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvelle découverte de lignage</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #1a1a1a;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 520px; width: 100%; background-color: #2a2a2a; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #3a3a3a;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                🌳 Floorence
              </h1>
              <p style="margin: 8px 0 0; color: #888888; font-size: 14px; font-style: italic;">
                Intelligence de Lignage
              </p>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 32px 16px;">
              <h2 style="margin: 0 0 8px; color: #ffffff; font-size: 20px; font-weight: 500;">
                Bonjour ${creatorName},
              </h2>
              <p style="margin: 0 0 16px; color: #b0b0b0; font-size: 15px; line-height: 1.6;">
                ${
                  isSingle
                    ? `Grâce à votre contribution sur l'espace mémoriel de <strong style="color:#ffffff;">${s.source_name}</strong>, l'intelligence de Floorence a analysé les liens de parenté globaux.`
                    : `L'intelligence de Floorence a analysé les liens de parenté autour de vos espaces mémoriels et a fait <strong style="color:#D4AF37;">${suggestions.length} découvertes passionnantes</strong>.`
                }
              </p>
              ${
                isSingle
                  ? `<p style="margin: 0 0 16px; color: #b0b0b0; font-size: 15px; line-height: 1.6;">
                      Une découverte passionnante vient d'apparaître : il semblerait que 
                      <strong style="color:#ffffff;">${s.target_name}</strong> soit le 
                      <strong style="color:#D4AF37;">${s.suggested_relation}</strong> de votre proche.
                    </p>`
                  : ""
              }
            </td>
          </tr>

          <!-- Suggestions List -->
          ${
            !isSingle
              ? `
          <tr>
            <td style="padding: 0 32px 16px;">
              <p style="margin: 0 0 12px; color: #999999; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                Liens détectés
              </p>
              <table role="presentation" style="width: 100%; background-color: #222222; border-radius: 8px; overflow: hidden;">
                ${suggestionsHtml}
              </table>
            </td>
          </tr>`
              : ""
          }

          <!-- CTA -->
          <tr>
            <td style="padding: 16px 32px 24px;">
              <p style="margin: 0 0 20px; color: #b0b0b0; font-size: 14px; line-height: 1.6;">
                En tant que créateur de cet espace, <strong style="color:#ffffff;">vous seul détenez la vérité</strong>. 
                Nous vous invitons à vous connecter pour valider ou rejeter ${isSingle ? "ce lien potentiel" : "ces liens potentiels"} 
                dans votre menu <em>« Liens Potentiels Suggérés »</em>.
              </p>
              <p style="margin: 0 0 24px; color: #888888; font-size: 13px; line-height: 1.5;">
                Votre validation permettra de sceller officiellement ${isSingle ? "cette connexion" : "ces connexions"} 
                et d'agrandir le maillage social de votre famille.
              </p>
              
              <div style="text-align: center;">
                <a href="${appUrl}/liens-suggeres" 
                   style="display: inline-block; background: linear-gradient(135deg, #D4AF37, #C5A028); color: #1a1a1a; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 700; letter-spacing: 0.5px;">
                  Confirmer ${isSingle ? "la Vérité" : "les Vérités"}
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #222222; text-align: center; border-top: 1px solid #3a3a3a;">
              <p style="margin: 0; color: #666666; font-size: 12px;">
                © ${new Date().getFullYear()} Floorence. Tous droits réservés.
              </p>
              <p style="margin: 8px 0 0; color: #555555; font-size: 11px;">
                L'IA propose, l'Homme dispose. Cet email a été envoyé automatiquement suite à une analyse de lignage.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Fetch all pending suggestions that haven't been notified yet
    const { data: pendingSuggestions, error: fetchError } = await supabaseAdmin
      .from("suggested_links")
      .select("id, source_memorial_id, target_memorial_id, suggested_relation, inference_logic")
      .eq("status", "pending")
      .is("notified_at", null)
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("Error fetching pending suggestions:", fetchError);
      throw new Error("Erreur lors de la récupération des suggestions");
    }

    if (!pendingSuggestions || pendingSuggestions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Aucune suggestion à notifier", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${pendingSuggestions.length} un-notified suggestions`);

    // Collect all memorial IDs
    const allMemorialIds = new Set<string>();
    pendingSuggestions.forEach((s) => {
      if (s.source_memorial_id) allMemorialIds.add(s.source_memorial_id);
      if (s.target_memorial_id) allMemorialIds.add(s.target_memorial_id);
    });

    // Fetch memorial details (name + creator)
    const { data: memorials } = await supabaseAdmin
      .from("memorials")
      .select("id, first_name, last_name, created_by, heir_user_id")
      .in("id", Array.from(allMemorialIds));

    const memorialMap = new Map<
      string,
      { name: string; createdBy: string | null; heirId: string | null }
    >();
    (memorials || []).forEach((m) => {
      memorialMap.set(m.id, {
        name: `${m.first_name} ${m.last_name}`,
        createdBy: m.created_by,
        heirId: m.heir_user_id,
      });
    });

    // Group suggestions by creator (user who owns the memorial)
    const creatorSuggestions = new Map<string, SuggestionForEmail[]>();

    for (const s of pendingSuggestions) {
      const sourceMemorial = memorialMap.get(s.source_memorial_id || "");
      const targetMemorial = memorialMap.get(s.target_memorial_id || "");

      if (!sourceMemorial || !targetMemorial) continue;

      const enriched: SuggestionForEmail = {
        id: s.id,
        source_name: sourceMemorial.name,
        target_name: targetMemorial.name,
        suggested_relation: s.suggested_relation || "",
        inference_logic: s.inference_logic,
      };

      // Add to each relevant creator
      const ownerIds = new Set<string>();
      if (sourceMemorial.createdBy) ownerIds.add(sourceMemorial.createdBy);
      if (sourceMemorial.heirId) ownerIds.add(sourceMemorial.heirId);
      if (targetMemorial.createdBy) ownerIds.add(targetMemorial.createdBy);
      if (targetMemorial.heirId) ownerIds.add(targetMemorial.heirId);

      ownerIds.forEach((userId) => {
        const existing = creatorSuggestions.get(userId) || [];
        existing.push(enriched);
        creatorSuggestions.set(userId, existing);
      });
    }

    // Fetch user emails and display names
    const userIds = Array.from(creatorSuggestions.keys());
    
    // Get emails from auth.users via admin API
    const userEmails = new Map<string, string>();
    const userNames = new Map<string, string>();

    for (const userId of userIds) {
      try {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (userData?.user?.email) {
          userEmails.set(userId, userData.user.email);
        }
      } catch (e) {
        console.error(`Failed to get user ${userId}:`, e);
      }
    }

    // Get display names from profiles
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    (profiles || []).forEach((p) => {
      if (p.display_name) userNames.set(p.user_id, p.display_name);
    });

    // Send grouped emails
    const origin = "https://floorence.lovable.app";
    let sentCount = 0;
    const notifiedIds: string[] = [];

    for (const [userId, suggestions] of creatorSuggestions) {
      const email = userEmails.get(userId);
      if (!email) {
        console.log(`No email found for user ${userId}, skipping`);
        continue;
      }

      const displayName = userNames.get(userId) || email.split("@")[0];
      const isSingle = suggestions.length === 1;
      const s = suggestions[0];

      const subject = isSingle
        ? `🌳 Nouvelle branche détectée : ${s.target_name} pourrait être ${s.suggested_relation} de ${s.source_name}`
        : `🌳 ${suggestions.length} nouvelles branches de votre lignée détectées sur Floorence`;

      const html = generateRevelationEmail(displayName, suggestions, origin);

      try {
        const emailResponse = await resend.emails.send({
          from: "Floorence <noreply@floorence.org>",
          reply_to: "contact@floorence.org",
          to: [email],
          subject,
          html,
        });

        if ((emailResponse as any)?.error) {
          console.error(`Email error for ${email}:`, (emailResponse as any).error);
          continue;
        }

        console.log(`✅ Email sent to ${email} with ${suggestions.length} suggestion(s)`);
        sentCount++;

        // Collect all suggestion IDs for this creator
        suggestions.forEach((sug) => {
          if (!notifiedIds.includes(sug.id)) notifiedIds.push(sug.id);
        });
      } catch (emailErr) {
        console.error(`Failed to send email to ${email}:`, emailErr);
      }
    }

    // Mark all notified suggestions
    if (notifiedIds.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from("suggested_links")
        .update({ notified_at: new Date().toISOString() })
        .in("id", notifiedIds);

      if (updateError) {
        console.error("Error updating notified_at:", updateError);
      }
    }

    console.log(`📧 Notification complete: ${sentCount} email(s) sent, ${notifiedIds.length} suggestion(s) marked`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        suggestions_notified: notifiedIds.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-lineage-revelation:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Une erreur est survenue" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
