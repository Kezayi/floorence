// TEMPORARY G1-FIX7-T harness — admin-only, no external effects. Delete after use.
import { createClient } from "npm:@supabase/supabase-js@2";

const M1 = "f7000000-0000-4000-8000-000000000001";
const M2 = "f7000000-0000-4000-8000-000000000002";
const T1 = "f7a00000-0000-4000-8000-000000000001";
const T3 = "f7a00000-0000-4000-8000-000000000003";

Deno.serve(async (req) => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: u } = await admin.auth.getUser(jwt);
  if (!u?.user) return new Response("unauth", { status: 401 });
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
  if (!isAdmin) return new Response("forbidden", { status: 403 });
  const uid = u.user.id;
  const out: Record<string, unknown> = {};
  const f = (id: string, ref: string) => admin.rpc("fulfill_payment_success", { p_tx_id: id, p_reference: ref });
  const state = async () => ({
    mems: (await admin.from("memorials").select("id,is_published").in("id", [M1, M2]).order("id")).data,
    txs: (await admin.from("payment_transactions").select("id,status,amount,currency").in("id", [T1, T3]).order("id")).data,
  });
  try {
    const mk = (id: string, n: string) => ({ id, slug: `fix7-test-${n}-${Date.now()}`, first_name: "FIX7", last_name: `TEST ${n}`, created_by: uid, is_published: false, death_date: new Date().toISOString().slice(0, 10) });
    const im = await admin.from("memorials").insert([mk(M1, "a"), mk(M2, "b")]);
    if (im.error) throw im.error;
    const it = await admin.from("payment_transactions").insert([
      { id: T1, user_id: uid, memorial_id: M1, amount: 35000, currency: "XAF", status: "pending", ebilling_reference: "FIX7-REF-T1", payment_type: "memorial", metadata: { memorial_id: M1 } },
      { id: T3, user_id: uid, memorial_id: M2, amount: 35000, currency: "XAF", status: "pending", ebilling_reference: "FIX7-REF-T3", payment_type: "memorial", metadata: { memorial_id: M1 } },
    ]);
    if (it.error) throw it.error;
    out.before = await state();
    const r1 = await f(T1, "FIX7-REF-T1");
    out.T1_result = r1.data ?? r1.error;
    out.T1_state = await state();
    const r2 = await f(T1, "FIX7-REF-T1");
    out.T2_result = r2.data ?? r2.error;
    out.T2_state = await state();
    const r3 = await f(T3, "FIX7-REF-T3");
    out.T3_result = r3.data ?? r3.error;
    out.T3_state = await state();
  } catch (e) {
    out.error = (e as Error).message ?? String(e);
  } finally {
    await admin.from("payment_transactions").delete().in("id", [T1, T3]);
    await admin.from("memorials").delete().in("id", [M1, M2]);
    out.cleanup = await state();
  }
  return new Response(JSON.stringify(out, null, 1), { headers: { "Content-Type": "application/json" } });
});
