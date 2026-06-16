-- Trim Proof: client and job naming for saved designs.
-- Lets print shops and recurring teams separate customer jobs in the app.

ALTER TABLE public.saved_designs
ADD COLUMN IF NOT EXISTS client_name text NOT NULL DEFAULT '';

ALTER TABLE public.saved_designs
ADD COLUMN IF NOT EXISTS job_name text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_saved_designs_user_client_updated
ON public.saved_designs(user_id, client_name, updated_at DESC);
