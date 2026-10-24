import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// In-memory rate limiter: 3 attempts per 15-minute window
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 15 * 60_000; // 15 minutes
const RATE_LIMIT_MAX = 3;

interface SendMagicLinkRequest {
  email: string;
  redirectTo?: string;
}

const generateEmailHtml = (magicLink: string, isNewUser: boolean) => {
  const title = isNewUser ? "Bienvenue sur Floorence" : "Connexion à Floorence";
  const subtitle = isNewUser
    ? "Merci de vous être inscrit. Cliquez sur le bouton ci-dessous pour accéder à votre compte :"
    : "Cliquez sur le bouton ci-dessous pour vous connecter :";

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #1a1a1a;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 480px; width: 100%; background-color: #2a2a2a; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #3a3a3a;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">
                🕯️ Floorence
              </h1>
              <p style="margin: 8px 0 0; color: #888888; font-size: 14px; font-style: italic;">
                Aux bons soins des vivants
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 20px; font-weight: 500; text-align: center;">
                ${title}
              </h2>
              <p style="margin: 0 0 24px; color: #b0b0b0; font-size: 15px; line-height: 1.6; text-align: center;">
                ${subtitle}
              </p>
              
              <!-- Magic Link Button -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${magicLink}" 
                   style="display: inline-block; background-color: #1F2937; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">
                  ${isNewUser ? "Activer mon compte" : "Me connecter"}
                </a>
              </div>
              
              <p style="margin: 0 0 16px; color: #888888; font-size: 13px; text-align: center; line-height: 1.5;">
                Ce lien expire dans <strong style="color: #b0b0b0;">1 heure</strong>.<br>
                Si vous n'avez pas demandé ce lien, vous pouvez ignorer cet email.
              </p>
              
              <p style="margin: 0; color: #666666; font-size: 11px; text-align: center; line-height: 1.5; word-break: break-all;">
                Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
                <span style="color: #888888;">${magicLink}</span>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #222222; text-align: center; border-top: 1px solid #3a3a3a;">
              <p style="margin: 0; color: #666666; font-size: 12px;">
                © ${new Date().getFullYear()} Floorence. Tous droits réservés.
              </p>
              <p style="margin: 8px 0 0; color: #555555; font-size: 11px;">
                Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, redirectTo }: SendMagicLinkRequest = await req.json();

    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Email invalide" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting: sliding window of 3 attempts per 15 minutes
    const now = Date.now();
    const attempts = rateLimitMap.get(normalizedEmail) || [];
    // Remove expired attempts
    const recentAttempts = attempts.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    
    if (recentAttempts.length >= RATE_LIMIT_MAX) {
      const oldestAttempt = recentAttempts[0];
      const remainingMs = RATE_LIMIT_WINDOW_MS - (now - oldestAttempt);
      const remainingMinutes = Math.ceil(remainingMs / 60_000);
      console.log(`[RATE LIMIT] Email ${normalizedEmail} rate-limited, ${remainingMinutes}min remaining`);
      return new Response(
        JSON.stringify({ 
          error: `Trop de tentatives. Veuillez patienter ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.` 
        }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Record this attempt
    recentAttempts.push(now);
    rateLimitMap.set(normalizedEmail, recentAttempts);

    // Clean up old entries to prevent memory leaks (keep last 500 emails)
    if (rateLimitMap.size > 1000) {
      const entries = [...rateLimitMap.entries()];
      // Sort by most recent attempt
      entries.sort((a, b) => Math.max(...b[1]) - Math.max(...a[1]));
      for (let i = 500; i < entries.length; i++) {
        rateLimitMap.delete(entries[i][0]);
      }
    }

    const origin = req.headers.get("origin") || "https://floorence.org";
    const finalRedirect = redirectTo || `${origin}/compte`;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Try to create user first — if already exists, we catch the error
    let isNewUser = false;
    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: true,
    });

    if (createError) {
      // Check if user already exists (expected case)
      const errorMsg = createError.message?.toLowerCase() || "";
      if (errorMsg.includes("already") || errorMsg.includes("registered") || errorMsg.includes("exists") || errorMsg.includes("duplicate")) {
        isNewUser = false;
        console.log(`User ${normalizedEmail} already exists, generating magic link`);
      } else {
        console.error("Error creating user:", createError);
        throw new Error("Erreur lors de la création du compte");
      }
    } else {
      isNewUser = true;
      console.log(`New user created: ${normalizedEmail}`);
    }

    // Generate magic link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
      options: {
        redirectTo: finalRedirect,
      },
    });

    if (linkError || !linkData) {
      console.error("Error generating magic link:", linkError);
      throw new Error("Erreur lors de la génération du lien");
    }

    const magicLink = linkData.properties.action_link;

    // Send email via Resend (no test mode bypass — always send real emails)
    console.log(`Sending magic link to ${normalizedEmail}, isNewUser: ${isNewUser}`);

    const emailResponse = await resend.emails.send({
      from: "Floorence <noreply@floorence.org>",
      reply_to: "contact@floorence.org",
      to: [normalizedEmail],
      subject: isNewUser
        ? "Bienvenue sur Floorence - Activez votre compte"
        : "Connexion sécurisée à votre espace Floorence",
      html: generateEmailHtml(magicLink, isNewUser),
    });

    console.log("Magic link email sent, id:", (emailResponse as any)?.data?.id ?? null);

    // If Resend returns an error, bubble it up
    if ((emailResponse as any)?.error) {
      const err = (emailResponse as any).error;
      throw new Error(err?.message || "Erreur lors de l'envoi de l'email");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Lien de connexion envoyé",
        isNewUser,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-magic-link:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Une erreur est survenue" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
