export const fixture = { role: "admin", identities: [{ user_id: "woman-account", civility: "Mme" }, { user_id: "man-account", civility: "M." }], queries: [] as { table: string; select?: string }[], history: [] as unknown[], identityError: false };
export function createClient() {
  return {
    auth: { getUser: async () => ({ data: { user: { id: "authorized-fixture" } }, error: null }) },
    from(table: string) {
      const query: { table: string; select?: string } = { table }; fixture.queries.push(query);
      const chain = {
        select(s: string) { query.select = s; return chain; },
        eq() { return chain; }, in() { return chain; }, is() { return chain; }, limit() { return chain; },
        async insert(row: unknown) { fixture.history.push(row); return { error: null }; },
        then(resolve: (value: unknown) => void) {
          const data = table === 'user_roles' ? fixture.role ? [{ role: fixture.role }] : [] :
            table === 'profiles' ? fixture.identities : table === 'memorials' ? [{ id: 'memorial-fixture', first_name: 'Alpha', last_name: 'Test', is_active: true, is_published: true }] :
            table === 'guestbook_posts' ? [
              { id: 'post-a', memorial_id: 'memorial-fixture', user_id: 'woman-account', author_name: 'Iris Test', relation_category: 'famille_directe', candle_count: 1, flower_count: 0 },
              { id: 'post-b', memorial_id: 'memorial-fixture', user_id: 'man-account', author_name: 'Paul Test', relation_category: 'autres', candle_count: 9, flower_count: 0 },
            ] : [];
          return Promise.resolve(resolve({ data, error: table === 'profiles' && fixture.identityError ? new Error('unavailable') : null }));
        },
      };
      return chain;
    },
  };
}