import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Notify followers of a memorial when a new event or post is created.
 * Called from the frontend after creating a guestbook post or event.
 * Body: { memorial_id, type: "NEW_MESSAGE" | "NEW_EVENT", title, message }
 */
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

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { memorial_id, type, title, message } = await req.json();

    if (!memorial_id || !type || !title || !message) {
      return new Response(
        JSON.stringify({ error: "Paramètres manquants" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get all followers of this memorial (excluding the actor)
    const { data: followers, error: followError } = await supabaseAdmin
      .from("memorial_follows")
      .select("user_id")
      .eq("memorial_id", memorial_id)
      .neq("user_id", user.id);

    if (followError) {
      console.error("[notify-followers] Error fetching followers:", followError);
      throw followError;
    }

    if (!followers || followers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notified: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Batch insert notifications for all followers
    const notifications = followers.map((f) => ({
      user_id: f.user_id,
      type,
      memorial_id,
      title,
      message,
      is_read: false,
      metadata: { triggered_by: user.id },
    }));

    const { error: insertError } = await supabaseAdmin
      .from("user_notifications")
      .insert(notifications);

    if (insertError) {
      console.error("[notify-followers] Insert error:", insertError);
      throw insertError;
    }

    console.log(`[notify-followers] Notified ${followers.length} followers for memorial ${memorial_id}`);

    return new Response(
      JSON.stringify({ success: true, notified: followers.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[notify-followers] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur interne" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
