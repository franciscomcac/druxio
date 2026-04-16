
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id uuid;
  sender_name text;
  preview text;
BEGIN
  -- Find the other participant in the session
  SELECT CASE
    WHEN s.mentee_id = NEW.sender_id THEN s.mentor_id
    ELSE s.mentee_id
  END INTO recipient_id
  FROM public.sessions s
  WHERE s.id = NEW.session_id;

  IF recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get sender display name
  SELECT COALESCE(p.display_name, 'Someone') INTO sender_name
  FROM public.profiles p
  WHERE p.id = NEW.sender_id;

  -- Truncate preview
  preview := LEFT(NEW.content, 80);

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    recipient_id,
    'new_message',
    'New message from ' || sender_name,
    preview,
    jsonb_build_object('session_id', NEW.session_id, 'sender_id', NEW.sender_id)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_message();
