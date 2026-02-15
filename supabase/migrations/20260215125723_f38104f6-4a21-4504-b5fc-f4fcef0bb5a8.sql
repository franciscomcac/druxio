
-- Add total_spent column to profiles
ALTER TABLE public.profiles ADD COLUMN total_spent numeric DEFAULT 0.00;

-- Backfill total_spent from completed session_payment transactions
UPDATE public.profiles p
SET total_spent = COALESCE((
  SELECT SUM(t.amount)
  FROM public.transactions t
  WHERE t.user_id = p.id
    AND t.type = 'session_payment'
    AND t.status = 'completed'
), 0);

-- Create trigger to auto-update total_spent when a transaction is inserted
CREATE OR REPLACE FUNCTION public.update_total_spent()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'session_payment' AND NEW.status = 'completed' THEN
    UPDATE public.profiles
    SET total_spent = COALESCE(total_spent, 0) + NEW.amount
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_total_spent_on_transaction
AFTER INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_total_spent();
