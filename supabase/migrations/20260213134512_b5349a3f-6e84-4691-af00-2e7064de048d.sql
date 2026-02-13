-- Create trigger to auto-update seller rating_avg when a review is inserted
CREATE TRIGGER update_mentor_rating_on_review
AFTER INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_mentor_rating();

-- Also update total_sessions count when a session is completed
CREATE OR REPLACE FUNCTION public.increment_total_sessions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        UPDATE public.profiles
        SET total_sessions = COALESCE(total_sessions, 0) + 1
        WHERE id = NEW.mentor_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER increment_sessions_on_complete
AFTER UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.increment_total_sessions();