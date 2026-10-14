// TEMPORARY G1-FIX3 test harness — admin-only, no external effects. Delete after use.
import { createClient } from "npm:@supabase/supabase-js@2";

const MEM = "a1ecc0cd-e27a-4d17-ae3e-ac10873c5a96";
const P1 = "f3000000-0000-4000-8000-000000000001";
const P2 = "f3000000-0000-4000-8000-000000000002";
const tx = (c: string) => `f3a00000-0000-4000-8000-00000000000${c}`;

Deno.serve(async (req) => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: u } = await admin.auth.getUser(jwt);
  if (!u?.user) return new Response("unauth", { status: 401 });
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
  if (!isAdmin) return new Response("forbidden", { status: 403 });
  const uid = u.user.id;
  const out: Record<string, unknown> = {};
  const f = (id: string, ref: string) => admin.rpc("fulfill_payment_success", { p_tx_id: id, p_reference: ref });
  const state = async () => ({
    posts: (await admin.from("guestbook_posts").select("id,candle_count,flower_count,is_hidden").in("id", [P1, P2]).order("id")).data,
    txs: (await admin.from("payment_transactions").select("ebilling_reference,status").like("ebilling_reference", "FIX3-%").order("ebilling_reference")).data,
  });
  try {
    // setup
    const ins = await admin.from("guestbook_posts").insert([
      { id: P1, memorial_id: MEM, user_id: uid, author_name: "FIX3 TEST", relation_category: "Autre", content: "visible", candle_count: 2, flower_count: 3, is_hidden: false },
      { id: P2, memorial_id: MEM, user_id: uid, author_name: "FIX3 TEST", relation_category: "Autre", content: "paid", candle_count: 1, flower_count: 4, is_hidden: true, payment_reference: "FIX3-REF-A" },
    ]);
    if (ins.error) throw ins.error;
    const mk = (c: string, type: string, post: string, q: number | string) =>
      ({ id: tx(c), user_id: uid, memorial_id: MEM, amount: 100, currency: "XAF", status: "pending", ebilling_reference: `FIX3-REF-${c.toUpperCase()}`, payment_type: type, metadata: { post_id: post, quantity: q } });
    const it = await admin.from("payment_transactions").insert([
      mk("a", "hommage", P2, 1), mk("b", "cierge", P1, 5), mk("c", "cierge", P1, 7), mk("d", "fleur", P1, "2147483647"), mk("e", "fleur", P1, 2),
    ]);
    if (it.error) throw it.error;
    out.before = await state();
    out.T1_same_tx_concurrent = (await Promise.all([f(tx("b"), "FIX3-REF-B"), f(tx("b"), "FIX3-REF-B"), f(tx("b"), "FIX3-REF-B")])).map((r) => r.data ?? r.error?.message);
    out.T2_distinct_concurrent = (await Promise.all([f(tx("c"), "FIX3-REF-C"), f(tx("e"), "FIX3-REF-E")])).map((r) => r.data ?? r.error?.message);
    out.T3_rollback_overflow = await f(tx("d"), "FIX3-REF-D").then((r) => r.data ?? r.error?.message);
    out.T4_initial_paid = (await Promise.all([f(tx("a"), "FIX3-REF-A"), f(tx("a"), "FIX3-REF-A")])).map((r) => r.data ?? r.error?.message);
    out.T5_repeat_all = (await Promise.all(["a", "b", "c", "e"].map((c) => f(tx(c), `FIX3-REF-${c.toUpperCase()}`)))).map((r) => r.data);
    out.T6_missing = (await f("f3a00000-0000-4000-8000-0000000000ff", "X")).data;
    out.T6_mismatch = (await f(tx("e"), "WRONG")).data;
    out.after = await state();
  } catch (e) {
    out.error = String((e as Error).message ?? e);
  } finally {
    await admin.from("payment_transactions").delete().like("ebilling_reference", "FIX3-%");
    await admin.from("guestbook_posts").delete().in("id", [P1, P2]);
    out.cleanup = await state();
  }
  return new Response(JSON.stringify(out, null, 1), { headers: { "Content-Type": "application/json" } });
});
