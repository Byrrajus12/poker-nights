-- Add per-platform handle columns to users
ALTER TABLE public.users
  ADD COLUMN venmo_handle text,
  ADD COLUMN cashapp_handle text,
  ADD COLUMN zelle_handle text;

-- Add per-platform handle columns to group_members
ALTER TABLE public.group_members
  ADD COLUMN venmo_handle text,
  ADD COLUMN cashapp_handle text,
  ADD COLUMN zelle_handle text;

-- Drop the old single-handle columns from group_members
ALTER TABLE public.group_members
  DROP COLUMN IF EXISTS payment_handle,
  DROP COLUMN IF EXISTS payment_method;