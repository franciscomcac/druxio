
-- Dispute status enum
CREATE TYPE public.dispute_status AS ENUM ('negotiation', 'escalated', 'resolved_refund', 'resolved_release', 'resolved_resumed');

-- Disputes table
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  raised_by UUID NOT NULL,
  reason TEXT NOT NULL,
  status public.dispute_status NOT NULL DEFAULT 'negotiation',
  admin_notes TEXT,
  evidence_buyer TEXT[] DEFAULT '{}',
  evidence_seller TEXT[] DEFAULT '{}',
  negotiation_deadline TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  escalated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id)
);

-- Enable RLS
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Participants can view disputes on their own orders
CREATE POLICY "Participants can view their disputes"
  ON public.disputes FOR SELECT TO authenticated
  USING (
    raised_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = disputes.job_id AND j.buyer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.job_id = disputes.job_id AND q.expert_id = auth.uid() AND q.status = 'accepted'
    )
    OR public.is_admin(auth.uid())
  );

-- Only buyers can raise disputes
CREATE POLICY "Buyers can raise disputes"
  ON public.disputes FOR INSERT TO authenticated
  WITH CHECK (
    raised_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.buyer_id = auth.uid()
    )
  );

-- Participants can update evidence fields, admins can update anything
CREATE POLICY "Participants and admins can update disputes"
  ON public.disputes FOR UPDATE TO authenticated
  USING (
    raised_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.job_id = disputes.job_id AND q.expert_id = auth.uid() AND q.status = 'accepted'
    )
    OR public.is_admin(auth.uid())
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.disputes;
