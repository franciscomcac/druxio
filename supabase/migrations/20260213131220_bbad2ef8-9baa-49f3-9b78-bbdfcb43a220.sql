
-- Function to notify experts when a job is posted in their category
CREATE OR REPLACE FUNCTION public.notify_experts_on_new_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  SELECT
    ec.user_id,
    'new_request',
    'New Request in ' || NEW.category,
    COALESCE(NEW.title, 'A new request has been posted'),
    jsonb_build_object('job_id', NEW.id, 'category', NEW.category, 'subcategory', NEW.subcategory)
  FROM public.expert_categories ec
  WHERE ec.category = NEW.category
    AND ec.user_id != NEW.buyer_id;

  RETURN NEW;
END;
$$;

-- Trigger on new job insert
CREATE TRIGGER notify_experts_on_job_insert
AFTER INSERT ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.notify_experts_on_new_job();
