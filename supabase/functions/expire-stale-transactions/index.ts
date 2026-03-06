import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Expire transactions pending for more than 30 minutes
    const { data, error } = await supabase
      .from("payment_transactions")
      .update({ status: "timeout", updated_at: new Date().toISOString() })
      .eq("status", "pending")
      .lt("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .select("id");

    if (error) throw error;

    const count = data?.length ?? 0;
    console.log(`Expired ${count} stale transactions`);

    return new Response(
      JSON.stringify({ success: true, expired: count }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error expiring transactions:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
