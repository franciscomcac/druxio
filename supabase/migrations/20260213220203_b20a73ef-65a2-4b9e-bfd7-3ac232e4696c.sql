
-- Add escrow tracking fields to jobs table
ALTER TABLE public.jobs
ADD COLUMN escrow_txn_id text DEFAULT NULL,
ADD COLUMN escrow_status text DEFAULT NULL;

-- Add index for escrow lookups
CREATE INDEX idx_jobs_escrow_txn_id ON public.jobs (escrow_txn_id) WHERE escrow_txn_id IS NOT NULL;
