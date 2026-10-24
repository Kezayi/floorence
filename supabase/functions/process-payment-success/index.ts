import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Generates a minimal valid PDF certificate (raw PDF spec, zero dependencies).
 */
function generateCertificatePDF(params: {
  payerName: string;
  deceasedName: string;
  details: string;
  date: string;
  reference: string;
  amount: number;
}): Uint8Array {
  const { payerName, deceasedName, details, date, reference, amount } = params;

  // Helper to encode text for PDF (Latin-1 safe)
  const sanitize = (s: string) =>
    s.replace(/[()\\]/g, "\\$&").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");

  const lines = [
    `Certificat d'Hommage - Floorence`,
    ``,
    `Ce certificat atteste que ${sanitize(payerName)}`,
    `a honore la memoire de ${sanitize(deceasedName)}`,
    `par le depot de ${sanitize(details)}.`,
    ``,
    `Montant : ${amount} XAF`,
    `Date (Libreville) : ${sanitize(date)}`,
    `Reference : ${sanitize(reference)}`,
    ``,
    `---`,
    `Floorence - Honorer. Relier. Transmettre.`,
    `www.floorence.org`,
  ];

  // Build PDF content stream
  const textContent = lines
    .map((line, i) => {
      const fontSize = i === 0 ? 18 : 11;
      const yOffset = i === 0 ? 0 : 14;
      if (i === 0) {
        return `BT /F1 ${fontSize} Tf 72 750 Td (${line}) Tj ET`;
      }
      return `BT /F1 ${fontSize} Tf 72 ${750 - i * yOffset - 30} Td (${line}) Tj ET`;
    })
    .join("\n");

  const stream = `stream\n${textContent}\nendstream`;
  const streamLength = new TextEncoder().encode(textContent).length;

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]
   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj

4 0 obj
<< /Length ${streamLength} >>
${stream}
endobj

5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
0
%%EOF`;

  return new TextEncoder().encode(pdf);
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // SEC-06: internal-only — the sole legitimate caller (_shared/paymentSuccess.ts) sends the service-role key.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceKey || req.headers.get("Authorization") !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json();
    const { transaction_id } = body;

    if (!transaction_id) {
      return new Response(
        JSON.stringify({ error: "Missing transaction_id" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch transaction
    const { data: tx, error: txErr } = await supabaseAdmin
      .from("payment_transactions")
      .select("*")
      .eq("id", transaction_id)
      .single();

    if (txErr || !tx) {
      console.error("[process-payment-success] Transaction not found:", transaction_id);
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // SEC-06: certificates only for confirmed gesture/tribute payments.
    if (tx.status !== "success" || tx.payment_type === "memorial") {
      return new Response(
        JSON.stringify({ error: "Transaction not eligible" }),
        { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get user email from auth.users
    const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(tx.user_id);
    if (userErr || !userData?.user?.email) {
      console.warn("[process-payment-success] No email found for user:", tx.user_id);
      // Still generate and store PDF, just skip email
    }

    const userEmail = userData?.user?.email;

    // Get payer display name from profiles
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name, first_name, last_name")
      .eq("user_id", tx.user_id)
      .single();

    const payerName = profile?.display_name
      || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ")
      || "Anonyme";

    const deceasedName = tx.deceased_name_snapshot || "Inconnu";
    const candleCount = tx.candle_count || 0;
    const flowerCount = tx.flower_count || 0;

    const detailParts: string[] = [];
    if (candleCount > 0) detailParts.push(`${candleCount} cierge(s)`);
    if (flowerCount > 0) detailParts.push(`${flowerCount} fleur(s)`);
    const details = detailParts.length > 0 ? detailParts.join(" et ") : "gestes rituels";

    // Format date in Libreville timezone
    const txDate = new Date(tx.created_at);
    const dateStr = txDate.toLocaleDateString("fr-FR", {
      timeZone: "Africa/Libreville",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Generate PDF
    const pdfBytes = generateCertificatePDF({
      payerName,
      deceasedName,
      details,
      date: dateStr,
      reference: tx.ebilling_reference || tx.id,
      amount: tx.amount || 0,
    });

    // Store PDF in certificates bucket
    const fileName = `cert-${tx.ebilling_reference || tx.id}.pdf`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("certificates")
      .upload(fileName, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) {
      console.error("[process-payment-success] Upload error:", uploadErr);
    } else {
      console.log("[process-payment-success] PDF stored:", fileName);
    }

    // Send email via Resend if we have the user's email
    if (userEmail) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (!RESEND_API_KEY) {
        console.warn("[process-payment-success] RESEND_API_KEY not configured, skipping email");
      } else {
        // Convert PDF to base64 for attachment
        const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Floorence <notify@floorence.org>",
            to: [userEmail],
            subject: `Certificat d'Hommage - ${deceasedName}`,
            html: `
              <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 32px;">
                <h1 style="color: #1a1a2e; font-size: 24px; border-bottom: 2px solid #c9a96e; padding-bottom: 12px;">
                  Certificat d'Hommage
                </h1>
                <p style="color: #333; line-height: 1.7; font-size: 16px;">
                  Cher(e) <strong>${payerName}</strong>,
                </p>
                <p style="color: #333; line-height: 1.7; font-size: 16px;">
                  Nous vous remercions d'avoir honoré la mémoire de 
                  <strong>${deceasedName}</strong> par le dépôt de 
                  <strong>${details}</strong>.
                </p>
                <div style="background: #f8f6f0; border-left: 4px solid #c9a96e; padding: 16px; margin: 24px 0; border-radius: 4px;">
                  <p style="margin: 4px 0; color: #555;"><strong>Montant :</strong> ${tx.amount} XAF</p>
                  <p style="margin: 4px 0; color: #555;"><strong>Date :</strong> ${dateStr}</p>
                  <p style="margin: 4px 0; color: #555;"><strong>Référence :</strong> ${tx.ebilling_reference || tx.id}</p>
                </div>
                <p style="color: #333; line-height: 1.7; font-size: 16px;">
                  Votre certificat d'hommage est joint à cet email en pièce jointe PDF.
                </p>
                <p style="color: #888; font-size: 13px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
                  Floorence — Honorer. Relier. Transmettre.<br/>
                  <a href="https://floorence.org" style="color: #c9a96e;">www.floorence.org</a>
                </p>
              </div>
            `,
            attachments: [
              {
                filename: `certificat-hommage-${deceasedName.replace(/\s+/g, "-")}.pdf`,
                content: pdfBase64,
                type: "application/pdf",
              },
            ],
          }),
        });

        const emailData = await emailRes.json();
        if (!emailRes.ok) {
          console.error("[process-payment-success] Resend error:", JSON.stringify(emailData));
        } else {
          console.log("[process-payment-success] Email sent to:", userEmail);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, certificate: fileName, email_sent: !!userEmail }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[process-payment-success] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
