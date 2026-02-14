import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface UpdateSettingRequest {
  key: string;
  value: unknown;
}

// Map setting keys to human-readable labels
const settingLabels: Record<string, string> = {
  candle_price: "Prix du cierge",
  flower_price: "Prix de la fleur",
  memorial_price_future: "Prix création (obsèques futures)",
  memorial_price_past: "Prix création (obsèques passées)",
  contribution_link_template: "Lien de contribution externe",
  donation_enabled: "Donations activées",
  notification_frequency: "Fréquence des notifications",
  notification_window: "Fenêtre mensuelle des notifications",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user is admin
    const { data: isAdmin, error: roleError } = await supabaseUser.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      console.error("Role check error:", roleError, "isAdmin:", isAdmin);
      return new Response(
        JSON.stringify({ error: "Accès refusé - Admin requis" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body: UpdateSettingRequest = await req.json();
    const { key, value } = body;

    if (!key) {
      return new Response(
        JSON.stringify({ error: "Clé de paramètre requise" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get current value before update for audit details
    const { data: currentSetting } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", key)
      .single();

    const oldValue = currentSetting?.value;

    // Update the setting
    const { error: updateError } = await supabaseAdmin
      .from("system_settings")
      .update({ 
        value: value as any, 
        updated_at: new Date().toISOString(),
        updated_by: user.id 
      })
      .eq("key", key);

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    // Log audit action
    const settingLabel = settingLabels[key] || key;
    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      action_type: "update_setting",
      performed_by: user.id,
      performed_by_email: user.email,
      details: {
        setting_key: key,
        setting_label: settingLabel,
        old_value: oldValue,
        new_value: value,
      },
    });

    if (auditError) {
      console.error("Audit log error:", auditError);
      // Don't fail the request if audit logging fails
    }

    console.log(`Setting ${key} updated by ${user.email}`);

    return new Response(
      JSON.stringify({ success: true, message: `${settingLabel} mis à jour` }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in admin-settings:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Une erreur est survenue" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
