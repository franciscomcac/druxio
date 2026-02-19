-- Re-create the trigger that fires handle_new_user on every new signup
-- (The function already exists but the trigger was missing)
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
