DROP POLICY IF EXISTS "System creates transactions" ON public.transactions;

CREATE POLICY "Only backend creates transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "Users can create own withdrawals" ON public.withdrawals;

CREATE POLICY "Only backend creates withdrawals"
ON public.withdrawals
FOR INSERT
TO authenticated
WITH CHECK (false);