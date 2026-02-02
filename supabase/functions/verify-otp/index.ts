import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerifyOtpRequest {
  email: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, code }: VerifyOtpRequest = await req.json();

    // Validate input
    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: "Email et code requis" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Find the latest valid OTP for this email
    const { data: otpRecord, error: fetchError } = await supabaseAdmin
      .from("otp_codes")
      .select("*")
      .eq("email", normalizedEmail)
      .is("verified_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      console.log("No valid OTP found for email:", normalizedEmail);
      return new Response(
        JSON.stringify({ error: "Code expiré ou invalide. Veuillez demander un nouveau code." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if max attempts exceeded
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      // Invalidate the code
      await supabaseAdmin
        .from("otp_codes")
        .delete()
        .eq("id", otpRecord.id);

      return new Response(
        JSON.stringify({ error: "Trop de tentatives. Veuillez demander un nouveau code." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if code matches
    if (otpRecord.code !== normalizedCode) {
      // Increment attempts
      await supabaseAdmin
        .from("otp_codes")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);

      const remainingAttempts = otpRecord.max_attempts - otpRecord.attempts - 1;
      return new Response(
        JSON.stringify({ 
          error: `Code incorrect. ${remainingAttempts} tentative(s) restante(s).` 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Code is valid! Mark as verified
    await supabaseAdmin
      .from("otp_codes")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", otpRecord.id);

    // Check if user exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      // User exists, use their ID
      userId = existingUser.id;
      console.log("Existing user found:", userId);
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
      });

      if (createError || !newUser.user) {
        console.error("Error creating user:", createError);
        throw new Error("Erreur lors de la création du compte");
      }

      userId = newUser.user.id;
      isNewUser = true;
      console.log("New user created:", userId);
    }

    // Generate a magic link for the user to sign in (this creates a valid session)
    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
      options: {
        redirectTo: `${req.headers.get("origin") || "https://floorence.lovable.app"}/compte`,
      },
    });

    if (magicLinkError || !magicLinkData) {
      console.error("Error generating magic link:", magicLinkError);
      throw new Error("Erreur lors de la génération du lien de connexion");
    }

    // Extract the token from the magic link
    const linkUrl = new URL(magicLinkData.properties.action_link);
    const tokenHash = linkUrl.searchParams.get("token_hash");
    const type = linkUrl.searchParams.get("type");

    console.log("OTP verification successful for:", normalizedEmail);

    return new Response(
      JSON.stringify({ 
        success: true,
        isNewUser,
        // Return the verification URL that the client can use
        verificationUrl: `${Deno.env.get("SUPABASE_URL")}/auth/v1/verify?token_hash=${tokenHash}&type=${type}&redirect_to=${encodeURIComponent(req.headers.get("origin") || "https://floorence.lovable.app")}/compte`
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in verify-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Une erreur est survenue" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
