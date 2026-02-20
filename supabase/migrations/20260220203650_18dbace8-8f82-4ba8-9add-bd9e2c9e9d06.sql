
-- Fix the notification trigger to use prefix matching instead of exact match
-- Jobs store category as "Gaming", expert_categories store "Gaming: Valorant: Boosting"
CREATE OR REPLACE FUNCTION public.notify_experts_on_new_job()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  SELECT DISTINCT
    ec.user_id,
    'new_request',
    'New Request in ' || NEW.category,
    COALESCE(NEW.title, 'A new request has been posted'),
    jsonb_build_object('job_id', NEW.id, 'category', NEW.category, 'subcategory', NEW.subcategory)
  FROM public.expert_categories ec
  WHERE ec.category LIKE NEW.category || ':%'
    AND ec.user_id != NEW.buyer_id;

  RETURN NEW;
END;
$function$;
