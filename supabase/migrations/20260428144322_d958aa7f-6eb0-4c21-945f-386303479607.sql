CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_unique_order_release
ON public.transactions (stripe_payment_id)
WHERE stripe_payment_id IS NOT NULL AND stripe_payment_id LIKE 'release_%';