/** FIN-OPS-01 — recette transactions are kept in history but excluded from cockpit KPIs. */
export const isTestTransaction = (t: { ebilling_reference?: string | null; metadata?: unknown }) => {
  const meta = (t.metadata && typeof t.metadata === 'object' ? t.metadata : {}) as Record<string, unknown>;
  return /TEST/i.test(t.ebilling_reference ?? '') || (typeof meta.test === 'string' && meta.test.length > 0);
};
