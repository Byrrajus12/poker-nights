DROP POLICY "sessions_insert" ON public.sessions;
CREATE POLICY "sessions_insert" ON public.sessions
  FOR INSERT WITH CHECK (
    auth.uid() = banker_id
    AND public.is_group_admin(group_id)
  );