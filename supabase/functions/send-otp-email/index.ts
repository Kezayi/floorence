import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OtpEmailRequest {
  email: string;
  otp: string;
  type: "signup" | "login";
}

const generateEmailHtml = (otp: string, type: "signup" | "login") => {
  const title = type === "signup" ? "Bienvenue sur Floorence" : "Connexion à Floorence";
  const subtitle = type === "signup" 
    ? "Merci de vous être inscrit. Voici votre code de vérification :"
    : "Voici votre code de connexion :";

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
              
              <!-- OTP Code -->
              <div style="background: linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%); border: 1px solid #4a4a4a; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ffffff; font-family: monospace;">
                  ${otp}
                </div>
              </div>
              
              <p style="margin: 0; color: #888888; font-size: 13px; text-align: center; line-height: 1.5;">
                Ce code expire dans <strong style="color: #b0b0b0;">5 minutes</strong>.<br>
                Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email.
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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, otp, type }: OtpEmailRequest = await req.json();

    // Validate required fields
    if (!email || !otp) {
      throw new Error("Email and OTP are required");
    }

    const emailType = type || "login";
    const subject = emailType === "signup" 
      ? "🕯️ Bienvenue sur Floorence - Votre code de vérification"
      : "🕯️ Votre code de connexion Floorence";

    console.log(`Sending ${emailType} OTP email to ${email}`);

    const emailResponse = await resend.emails.send({
      from: "Floorence <noreply@floorence.com>",
      to: [email],
      subject: subject,
      html: generateEmailHtml(otp, emailType),
    });

    console.log("OTP email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending OTP email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
