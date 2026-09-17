ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS auto_release_hours integer NOT NULL DEFAULT 17,
  ADD COLUMN IF NOT EXISTS auto_release_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS rows_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS checklist_auto_reset boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.employee_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  password text NOT NULL,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_credentials TO authenticated;
GRANT ALL ON public.employee_credentials TO service_role;

ALTER TABLE public.employee_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "only admin manages employee credentials"
ON public.employee_credentials FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_employee_credentials_updated_at
BEFORE UPDATE ON public.employee_credentials
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();