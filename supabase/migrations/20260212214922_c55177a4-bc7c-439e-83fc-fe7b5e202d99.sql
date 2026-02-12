
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  generated_name text;
BEGIN
    -- Auto-generate a unique display name from email prefix + random suffix
    generated_name := split_part(NEW.email, '@', 1) || '_' || substr(md5(random()::text), 1, 4);
    
    INSERT INTO public.profiles (id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', generated_name));
    
    -- Auto-assign mentee role by default
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'mentee');
    
    RETURN NEW;
END;
$function$;
