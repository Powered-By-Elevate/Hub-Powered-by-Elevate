-- Make account setup instant: auto-confirm a new auth user the moment they're
-- created, IF their email has a valid, unused, unexpired HR setup token. This
-- removes the "Email not confirmed" race entirely (no dependence on the email
-- confirmation toggle or the activate-account edge function), while random
-- uninvited signups still require normal confirmation.
--
-- This is the durable layer; the app also prefers the activate-account edge
-- function and retries gracefully, so any one of these alone is sufficient.
-- Safe to re-run.

CREATE OR REPLACE FUNCTION public.auto_confirm_invited_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL AND EXISTS (
    SELECT 1
    FROM public.setup_tokens t
    LEFT JOIN public.employees e ON e.id = t.employee_id
    WHERE t.used = false
      AND t.expires_at > now()
      AND (lower(t.email) = lower(NEW.email) OR lower(e.email) = lower(NEW.email))
  ) THEN
    NEW.email_confirmed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_confirm_invited_user ON auth.users;
CREATE TRIGGER trg_auto_confirm_invited_user
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_invited_user();
