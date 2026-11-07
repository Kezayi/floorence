import { handler } from "./helpers/fic01Serve.ts";
import { fixture } from "./helpers/ribengaClosureClient.ts";
import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// All clients and fetches are replaced; no database or AI requests leave this process.
Deno.env.set("LOVABLE_API_KEY", "fixture");
Deno.env.set("SUPABASE_URL", "http://fixture.invalid");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fixture");
const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const H = "00000000-0000-4000-8000-00000000000c";
let prompt = "";
let answer = { answer: "Aucune preuve disponible.", source_refs: [] as string[] };
globalThis.fetch = async () => { throw new Error("Unexpected network call"); };
await import("../functions/social-search/index.ts");
function setup() {
  fixture.queries = []; fixture.writes = []; fixture.rows.clear(); prompt = "";
  fixture.rows.set("user_roles", [{ user_id: "fixture-admin", role: "admin" }]);
  const memorial = (id: string, first_name: string) => ({ id, first_name, last_name: "Test", is_active: true, is_published: true, deleted_at: null });
  fixture.rows.set("memorials", [memorial(A, "Alpha"), memorial(B, "Beta"), { ...memorial(H, "Private"), is_published: false }]);
  const post = (id: string, extra = {}) => ({ id, created_at: "2026-01-01", memorial_id: A, user_id: "fixture-person", author_name: "Iris Test", relation_link: "Fille", relation_category: "autres", candle_count: 1, flower_count: 0, is_hidden: false, editorial_hidden: false, deleted_at: null, content: id, ...extra });
  fixture.rows.set("guestbook_posts", [post("visible"), post("editorial-secret", { editorial_hidden: true }), post("hidden-secret", { is_hidden: true }), post("deleted-secret", { deleted_at: "2026-01-01" }), post("private-secret", { memorial_id: H })]);
  fixture.rows.set("memorial_relations", [{ memorial_id_1: A, memorial_id_2: B, relation_type: "Père", status: "accepted" }, { memorial_id_1: A, memorial_id_2: H, relation_type: "Frère", status: "accepted" }]);
  answer = { answer: "Aucune preuve disponible.", source_refs: [] };
  globalThis.fetch = async (url, init) => {
    assertEquals(String(url), "https://ai.gateway.lovable.dev/v1/chat/completions");
    prompt = JSON.parse(String(init?.body)).messages[0].content;
    return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: JSON.stringify(answer) } }] })}\n\ndata: [DONE]\n\n`);
  };
}
async function ask(question = "Quel lien entre Alpha Test et Beta Test ?") {
  if (!handler) throw new Error("Missing handler");
  const response = await handler(new Request("http://fixture.invalid", { method: "POST", headers: { authorization: "Bearer fixture" }, body: JSON.stringify({ question }) }));
  const text = await response.text();
  const events = text.split("\n").filter((line) => line.startsWith("data: {")).map((line) => JSON.parse(line.slice(6)));
  return { response, events };
}
Deno.test("actual handler excludes editorial-hidden, hidden, deleted and private sources", async () => {
  setup(); answer.source_refs = ["tribute:visible"];
  const { events } = await ask();
  assert(prompt.includes("tribute:visible"));
  for (const secret of ["editorial-secret", "hidden-secret", "deleted-secret", "private-secret", "Private Test"]) assert(!prompt.includes(secret));
  assertEquals(events.find((e) => e.type === "relation_sources")?.memorial_ids, [A]);
  assertEquals(fixture.queries.find((q) => q.table === "guestbook_posts")?.filters, [["is_hidden", false], ["editorial_hidden", false], ["deleted_at", null]]);
});
Deno.test("actual handler preserves parent-child orientation and does not call accepted links certified", async () => {
  setup(); await ask();
  assert(prompt.includes(`Alpha Test [[mem:${A}]] est « Père » de Beta Test [[mem:${B}]]`));
  assert(!prompt.includes('ou "Source : Lien certifié"'));
  assert(!prompt.includes("Les données actuelles sont fictives (test)"));
});
Deno.test("actual handler fails closed on invented source references", async () => {
  setup(); answer.source_refs = ["tribute:editorial-secret"];
  const { events } = await ask();
  assertEquals(events.find((e) => e.type === "relation_sources"), { type: "relation_sources", memorial_ids: [], valid: false, tribute_links: [] });
});
Deno.test("actual handler with no evidence emits no path provenance, ordinary answer retained", async () => {
  setup(); const { events } = await ask();
  assertEquals(events.find((e) => e.type === "relation_sources")?.memorial_ids, []);
  assertEquals(events.find((e) => e.choices)?.choices[0].delta.content, "Aucune preuve disponible.");
});
Deno.test("actual handler names an empty memorial rather than ranking another memorial", async () => {
  setup(); fixture.rows.set("profiles", [{ user_id: "fixture-person", civility: "Mme" }]);
  const { events } = await ask("Quelle femme avec le plus fort ISP autour de Beta Test ?");
  const text = events.find((e) => e.choices)?.choices[0].delta.content;
  assert(text.includes("Beta Test")); assert(text.includes("Aucun maximum calculable"));
  assert(!text.includes("Plus fort ISP : Iris"));
});