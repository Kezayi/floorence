type Row = Record<string, unknown>;
export const fixture = {
  rows: new Map<string, Row[]>(),
  queries: [] as Array<{ table: string; filters: Array<[string, unknown]> }>,
  writes: [] as unknown[],
};
export function createClient() {
  return {
    auth: { getUser: async () => ({ data: { user: { id: "fixture-admin" } }, error: null }) },
    from(table: string) {
      const query = { table, filters: [] as Array<[string, unknown]> };
      fixture.queries.push(query);
      const chain = {
        select() { return chain; }, limit() { return chain; },
        eq(key: string, value: unknown) { query.filters.push([key, value]); return chain; },
        is(key: string, value: unknown) { query.filters.push([key, value]); return chain; },
        in() { return chain; },
        async insert(row: unknown) { fixture.writes.push(row); return { error: null }; },
        then(resolve: (value: unknown) => void) {
          const data = (fixture.rows.get(table) ?? []).filter((row) => query.filters.every(([key, value]) => row[key] === value));
          return Promise.resolve(resolve({ data, error: null }));
        },
      };
      return chain;
    },
  };
}