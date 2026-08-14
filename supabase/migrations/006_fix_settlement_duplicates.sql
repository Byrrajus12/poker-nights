-- First, clean up any existing duplicate settlement rows
-- Keep only the first row per (session_id, to_member_id)
DELETE FROM public.settlements a
USING public.settlements b
WHERE a.session_id = b.session_id
  AND a.to_member_id = b.to_member_id
  AND a.id > b.id;

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.settlements
  ADD CONSTRAINT settlements_session_recipient_unique
  UNIQUE (session_id, to_member_id);

-- Add unique partial index: one cashout per player per session
CREATE UNIQUE INDEX transactions_one_cashout_per_player
  ON public.transactions (session_id, member_id)
  WHERE type = 'cashout';
