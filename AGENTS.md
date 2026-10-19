
- eBilling environment is chosen only by EBILLING_ENV (lab default); production needs full config plus host allowlists (EBILLING_PROD_ALLOWED_*_HOSTS) — prevents accidental real payments.
- Gesture prices: system_settings (candle_price/flower_price) is the only writable source, edited via the audited admin-settings function; ritual_prices is a DB-trigger mirror read by billing — keeps one price grid with audit trail.

- Payment cron jobs: expiry runs in-DB (`expire_orphan_stale_transactions`, orphans without bill_id only); reconciliation worker requires vault-held `x-cron-token` or service-role key — no anon key in cron, no public trigger.
- RAGet corpus: `rag_chunks` is a derived index rebuilt per memorial by `rag_reindex_memorial` via triggers; read only through admin-gated `rag_hybrid_search` (RRF of FTS/trigram/vector) — visibility is rechecked at query time, and embeddings come only from local CPU multilingual-e5-small (passage:/query: prefixes, L2-normalized) written via admin-only `rag_set_embeddings` with content md5 check; vector branch keeps cosine distance <= 0.185; no external AI.
- Guestbook editorial approval is independent of payment visibility: inserts and content edits are pending, only admin/moderator can approve via the audited RPC, public reads require approved — payment fulfillment must never grant editorial approval.
