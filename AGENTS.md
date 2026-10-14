
- eBilling environment is chosen only by EBILLING_ENV (lab default); production needs full config plus host allowlists (EBILLING_PROD_ALLOWED_*_HOSTS) — prevents accidental real payments.
- Gesture prices: system_settings (candle_price/flower_price) is the only writable source, edited via the audited admin-settings function; ritual_prices is a DB-trigger mirror read by billing — keeps one price grid with audit trail.
