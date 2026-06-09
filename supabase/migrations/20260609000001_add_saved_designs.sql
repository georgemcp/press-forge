-- Press Forge: Saved Designs Table
-- Stores user designs so customers can revisit and edit them later.

CREATE TABLE IF NOT EXISTS public.saved_designs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL DEFAULT 'Untitled Design',
  brief       text NOT NULL DEFAULT '',
  enhanced_brief jsonb,
  layout_spec jsonb NOT NULL,
  design_rationale text,
  product_type text NOT NULL DEFAULT 'business_card',
  reference_image_urls text[] DEFAULT '{}',
  iteration_count integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fast user-specific queries
CREATE INDEX IF NOT EXISTS idx_saved_designs_user_id ON public.saved_designs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_designs_updated_at ON public.saved_designs(updated_at DESC);

-- RLS: Users can only access their own designs
ALTER TABLE public.saved_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own designs"
ON public.saved_designs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own designs"
ON public.saved_designs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own designs"
ON public.saved_designs FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own designs"
ON public.saved_designs FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Auto-update updated_at on modification
CREATE OR REPLACE FUNCTION public.update_saved_designs_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_saved_designs_updated_at
BEFORE UPDATE ON public.saved_designs
FOR EACH ROW EXECUTE FUNCTION public.update_saved_designs_updated_at();
