CREATE TABLE IF NOT EXISTS public.banned_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  reason text,
  banned_by uuid,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT banned_ips_ip_address_length CHECK (char_length(trim(ip_address)) BETWEEN 3 AND 64),
  CONSTRAINT banned_ips_reason_length CHECK (reason IS NULL OR char_length(reason) <= 500),
  CONSTRAINT banned_ips_unique_ip UNIQUE (ip_address)
);

ALTER TABLE public.banned_ips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage IP bans" ON public.banned_ips;
CREATE POLICY "Admins can manage IP bans"
ON public.banned_ips
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_banned_ips_updated_at ON public.banned_ips;
CREATE TRIGGER update_banned_ips_updated_at
BEFORE UPDATE ON public.banned_ips
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();