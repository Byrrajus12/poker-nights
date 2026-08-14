ALTER TABLE public.group_members
  ADD COLUMN payment_handle text,
  ADD COLUMN payment_method text
  CHECK (payment_method IN ('venmo', 'cashapp', 'zelle', 'cash'));
