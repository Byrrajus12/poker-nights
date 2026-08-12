-- Create a helper function that bypasses RLS to check group membership
create or replace function public.is_group_member(gid uuid)
returns boolean as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$ language sql security definer stable;

-- Create a helper to check if user is a group admin
create or replace function public.is_group_admin(gid uuid)
returns boolean as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- Fix group_members policies (these all self-reference and will recurse)
drop policy "group_members_select" on public.group_members;
create policy "group_members_select" on public.group_members
  for select using (public.is_group_member(group_id));

drop policy "group_members_insert" on public.group_members;
create policy "group_members_insert" on public.group_members
  for insert with check (
    public.is_group_admin(group_id)
    or user_id = auth.uid()
    or (user_id is null and public.is_group_member(group_id))
  );

drop policy "group_members_update" on public.group_members;
create policy "group_members_update" on public.group_members
  for update using (
    user_id = auth.uid()
    or public.is_group_admin(group_id)
  );

-- Fix groups update policy (also references group_members)
drop policy "groups_update_admin" on public.groups;
create policy "groups_update_admin" on public.groups
  for update using (public.is_group_admin(id));

-- Fix sessions policies
drop policy "sessions_select" on public.sessions;
create policy "sessions_select" on public.sessions
  for select using (public.is_group_member(group_id));

drop policy "sessions_insert" on public.sessions;
create policy "sessions_insert" on public.sessions
  for insert with check (
    auth.uid() = banker_id
    and public.is_group_member(group_id)
  );

drop policy "sessions_update" on public.sessions;
create policy "sessions_update" on public.sessions
  for update using (
    auth.uid() = banker_id
    or public.is_group_admin(group_id)
  );

-- Fix session_players policies
drop policy "session_players_select" on public.session_players;
create policy "session_players_select" on public.session_players
  for select using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and public.is_group_member(s.group_id)
    )
  );

drop policy "session_players_insert" on public.session_players;
create policy "session_players_insert" on public.session_players
  for insert with check (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and s.banker_id = auth.uid()
    )
  );

-- Fix transactions policies
drop policy "transactions_select" on public.transactions;
create policy "transactions_select" on public.transactions
  for select using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and public.is_group_member(s.group_id)
    )
  );

drop policy "transactions_insert" on public.transactions;
create policy "transactions_insert" on public.transactions
  for insert with check (
    auth.uid() = created_by
    and exists (
      select 1 from public.sessions s
      where s.id = session_id and s.banker_id = auth.uid() and s.status = 'active'
    )
  );

-- Fix settlements policies
drop policy "settlements_select" on public.settlements;
create policy "settlements_select" on public.settlements
  for select using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and public.is_group_member(s.group_id)
    )
  );

drop policy "settlements_insert" on public.settlements;
create policy "settlements_insert" on public.settlements
  for insert with check (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and s.banker_id = auth.uid()
    )
  );

drop policy "settlements_update" on public.settlements;
create policy "settlements_update" on public.settlements
  for update using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id
      and (s.banker_id = auth.uid() or public.is_group_admin(s.group_id))
    )
  );