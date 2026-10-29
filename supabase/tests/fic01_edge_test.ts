import { handler } from './helpers/fic01Serve.ts';
import { fixture } from './helpers/fic01Client.ts';
import { assert, assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
Deno.env.set('LOVABLE_API_KEY', 'synthetic');
Deno.env.set('SUPABASE_URL', 'http://invalid.test');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'synthetic');
let prompt = '';
globalThis.fetch = async (_url, init) => {
  prompt = JSON.parse(String(init?.body)).messages[0].content;
  const prose = JSON.stringify({ answer: 'WRONG: Paul is winner', source_refs: ['memorial:memorial-fixture'] });
  return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: prose } }] })}\n\ndata: [DONE]\n\n`);
};
await import('../functions/social-search/index.ts');
const ask = async (question: string) => {
  fixture.queries = []; fixture.history = []; prompt = '';
  if (!handler) throw new Error('handler missing');
  const response = await handler(new Request('http://local.test', { method: 'POST', headers: { authorization: 'Bearer fictional' }, body: JSON.stringify({ question }) }));
  return { response, text: await response.text() };
};
Deno.test('actual Edge filters women before max, overrides AI, no private identity sent', async () => {
  const { text } = await ask('Quelle femme avec le plus fort ISP autour de Alpha Test ?');
  assert(text.includes('Iris Test — ISP = 0.1000'));
  assert(!text.includes('WRONG'));
  assert(!prompt.includes('woman-account') && !prompt.includes('man-account'));
  assertEquals(fixture.queries.find((q) => q.table === 'profiles')?.select, 'user_id, civility');
});
Deno.test('missing identity fails closed without changing total', async () => {
  fixture.identityError = true;
  const { text } = await ask('Quelle femme a le plus fort ISP ?');
  assert(text.includes('Aucun maximum calculable')); fixture.identityError = false;
});
Deno.test('duplicate profile prevents unique declared identity', async () => {
  fixture.identities.push({ user_id: 'woman-account', civility: 'Mme' });
  const { text } = await ask('Quelle femme a le plus fort ISP ?');
  assert(text.includes('Aucun maximum calculable')); fixture.identities.pop();
});
Deno.test('kinship does not query civility or replace ordinary answer', async () => {
  const { text } = await ask('Quel lien de parenté entre Alpha et Paul ?');
  assert(!fixture.queries.some((q) => q.table === 'profiles'));
  assert(text.includes('WRONG')); assert(prompt.includes('Désolé, je ne trouve pas'));
});
Deno.test('no role denies access before any private profile lookup', async () => {
  fixture.role = '';
  const { response } = await ask('Quelle femme a le plus fort ISP ?');
  assertEquals(response.status, 403); assert(!fixture.queries.some((q) => q.table === 'profiles'));
  fixture.role = 'admin';
});