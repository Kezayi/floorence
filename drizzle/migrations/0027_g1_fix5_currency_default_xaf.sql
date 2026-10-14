-- G1-FIX5: new transactions default to XAF. Reversible: ALTER ... SET DEFAULT 'XOF'. Historical rows untouched.
ALTER TABLE public.payment_transactions ALTER COLUMN currency SET DEFAULT 'XAF';