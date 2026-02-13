-- Create withdrawals table to track withdrawal requests
CREATE TABLE public.withdrawals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  method text NOT NULL, -- 'paypal' or 'crypto'
  paypal_email text, -- for PayPal withdrawals
  crypto_token text, -- e.g. 'USDT', 'USDC', 'BTC', 'LTC', 'ETH'
  crypto_network text, -- e.g. 'TRC-20', 'ERC-20', 'Solana', 'Bitcoin', 'Litecoin'
  crypto_address text, -- wallet address
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  transaction_id uuid, -- links to transactions table
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Users can view their own withdrawals
CREATE POLICY "Users can view own withdrawals" ON public.withdrawals
FOR SELECT USING (user_id = auth.uid());

-- Users can create their own withdrawals
CREATE POLICY "Users can create own withdrawals" ON public.withdrawals
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can manage all withdrawals
CREATE POLICY "Admins can manage withdrawals" ON public.withdrawals
FOR ALL USING (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_withdrawals_updated_at
BEFORE UPDATE ON public.withdrawals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();