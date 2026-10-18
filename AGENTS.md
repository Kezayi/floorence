
- eBilling environment is chosen only by EBILLING_ENV (lab default); production needs full config plus host allowlists (EBILLING_PROD_ALLOWED_*_HOSTS) — prevents accidental real payments.
- Gesture prices: system_settings (candle_price/flower_price) is the only writable source, edited via the audited admin-settings function; ritual_prices is a DB-trigger mirror read by billing — keeps one price grid with audit trail.

- Payment cron jobs: expiry runs in-DB (`expire_orphan_stale_transactions`, orphans without bill_id only); reconciliation worker requires vault-held `x-cron-token` or service-role key — no anon key in cron, no public trigger.
- RAGet corpus: `rag_chunks` is a derived index rebuilt per memorial by `rag_reindex_memorial` via triggers; read only through admin-gated `rag_hybrid_search` (RRF of FTS/trigram/vector) — visibility is rechecked at query time, and no external AI may fill embeddings or generation.
