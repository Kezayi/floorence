import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// G1-SEC2: internal-only. Authorization comes exclusively from the verified bearer token
// (service-role key or a signature-verified JWT whose role claim is service_role).
// Request body is never read for authorization. Rejected before any DB read/write.
async function isInternalCaller(req: Request, supabaseUrl: string, serviceRoleKey: string): Promise<boolean> {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7).trim();
  if (!token) return false;
  if (serviceRoleKey && token.length === serviceRoleKey.length) {
    let diff = 0;
    for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ serviceRoleKey.charCodeAt(i);
    if (diff === 0) return true;
  }
  try {
    const verifier = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await verifier.auth.getClaims(token);
    return !error && data?.claims?.role === "service_role";
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!req.headers.get("authorization")) return json({ error: "Non autorisé" }, 401);
  if (!(await isInternalCaller(req, supabaseUrl, serviceRoleKey))) return json({ error: "Accès refusé" }, 403);

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // FIN-OPS-01: single source of truth = SQL function (orphans without Digitech invoice only,
    // test transactions excluded). Scheduled directly by pg_cron; this endpoint stays internal-only.
    const { data: count, error } = await supabase.rpc("expire_orphan_stale_transactions");

    if (error) throw error;

    console.log(`Expired ${count ?? 0} orphan stale transactions`);
    return json({ success: true, expired: count ?? 0 });
  } catch (err) {
    console.error("Error expiring transactions:", (err as Error).message);
    return json({ error: "Erreur interne" }, 500);
  }
});
