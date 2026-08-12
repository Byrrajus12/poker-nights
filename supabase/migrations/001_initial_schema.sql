-- 001_initial_schema.sql
-- Run this in Supabase SQL Editor

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- Tables
-- ============================================================

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  avatar_url text,
  preferred_payment_method text check (preferred_payment_method in ('venmo', 'cashapp', 'zelle')),
  preferred_payment_handle text,
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  invite_code text unique not null,
  created_by uuid not null references public.users(id),
  buyin_presets integer[] not null default '{2000, 4000, 10000}',
  created_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  display_name text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  is_claimed boolean not null default false,
  created_at timestamptz not null default now(),
  unique(group_id, display_name)
);

create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  banker_id uuid not null references public.users(id),
  status text not null default 'active' check (status in ('active', 'settling', 'settled')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text
);

create table public.session_players (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  member_id uuid not null references public.group_members(id),
  joined_at timestamptz not null default now(),
  unique(session_id, member_id)
);

create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  member_id uuid not null references public.group_members(id),
  type text not null check (type in ('buyin', 'cashout')),
  amount integer not null check (amount > 0),
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

create table public.settlements (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  from_member_id uuid not null references public.group_members(id),
  to_member_id uuid not null references public.group_members(id),
  amount integer not null check (amount > 0),
  payment_method text check (payment_method in ('venmo', 'cashapp', 'zelle', 'cash')),
  is_paid boolean not null default false,
  paid_at timestamptz
);

-- ============================================================
-- Indexes
-- ============================================================

create index idx_groups_invite_code on public.groups(invite_code);
create index idx_group_members_group_id on public.group_members(group_id);
create index idx_group_members_user_id on public.group_members(user_id);
create index idx_sessions_group_id on public.sessions(group_id);
create index idx_sessions_status on public.sessions(status);
create index idx_session_players_session_id on public.session_players(session_id);
create index idx_session_players_member_id on public.session_players(member_id);
create index idx_transactions_session_id on public.transactions(session_id);
create index idx_transactions_member_id on public.transactions(member_id);
create index idx_settlements_session_id on public.settlements(session_id);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.sessions enable row level security;
alter table public.session_players enable row level security;
alter table public.transactions enable row level security;
alter table public.settlements enable row level security;

-- Users: can read own row, update own row
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);

-- Groups: members can read, creator can update
create policy "groups_select_member" on public.groups
  for select using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = id and gm.user_id = auth.uid()
    )
  );

-- Also allow reading a group by invite code (for join flow, before user is a member)
create policy "groups_select_by_invite" on public.groups
  for select using (true);
  -- Open read on groups table is fine; the sensitive data is in sessions/transactions.
  -- If you want to restrict, change this to check invite_code in a function param.

create policy "groups_insert" on public.groups
  for insert with check (auth.uid() = created_by);

create policy "groups_update_admin" on public.groups
  for update using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = id and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  );

-- Group members: group members can read all members in their groups
create policy "group_members_select" on public.group_members
  for select using (
    exists (
      select 1 from public.group_members my_membership
      where my_membership.group_id = group_id and my_membership.user_id = auth.uid()
    )
  );

-- Admins and authenticated users can insert members (banker adding players)
create policy "group_members_insert" on public.group_members
  for insert with check (
    -- User is an admin of the group, OR they're claiming/joining themselves
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_id and gm.user_id = auth.uid() and gm.role = 'admin'
    )
    or user_id = auth.uid()
    -- Also allow any authenticated group member to add unclaimed players (banker adding names)
    or (
      user_id is null and exists (
        select 1 from public.group_members gm
        where gm.group_id = group_id and gm.user_id = auth.uid()
      )
    )
  );

-- Group members can update their own entry (claiming), admins can update any
create policy "group_members_update" on public.group_members
  for update using (
    user_id = auth.uid()
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = group_id and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  );

-- Sessions: group members can read sessions in their group
create policy "sessions_select" on public.sessions
  for select using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_id and gm.user_id = auth.uid()
    )
  );

-- Any authenticated group member can create a session
create policy "sessions_insert" on public.sessions
  for insert with check (
    auth.uid() = banker_id
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = group_id and gm.user_id = auth.uid()
    )
  );

-- Banker or admin can update session
create policy "sessions_update" on public.sessions
  for update using (
    auth.uid() = banker_id
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = group_id and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  );

-- Session players: group members can read
create policy "session_players_select" on public.session_players
  for select using (
    exists (
      select 1 from public.sessions s
      join public.group_members gm on gm.group_id = s.group_id
      where s.id = session_id and gm.user_id = auth.uid()
    )
  );

-- Banker can add players to session
create policy "session_players_insert" on public.session_players
  for insert with check (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and s.banker_id = auth.uid()
    )
  );

-- Transactions: group members can read transactions in their sessions
create policy "transactions_select" on public.transactions
  for select using (
    exists (
      select 1 from public.sessions s
      join public.group_members gm on gm.group_id = s.group_id
      where s.id = session_id and gm.user_id = auth.uid()
    )
  );

-- Banker can insert transactions
create policy "transactions_insert" on public.transactions
  for insert with check (
    auth.uid() = created_by
    and exists (
      select 1 from public.sessions s
      where s.id = session_id and s.banker_id = auth.uid() and s.status = 'active'
    )
  );

-- Settlements: group members can read
create policy "settlements_select" on public.settlements
  for select using (
    exists (
      select 1 from public.sessions s
      join public.group_members gm on gm.group_id = s.group_id
      where s.id = session_id and gm.user_id = auth.uid()
    )
  );

-- Banker can insert settlements
create policy "settlements_insert" on public.settlements
  for insert with check (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and s.banker_id = auth.uid()
    )
  );

-- Banker or admin can update settlements (mark as paid)
create policy "settlements_update" on public.settlements
  for update using (
    exists (
      select 1 from public.sessions s
      join public.group_members gm on gm.group_id = s.group_id
      where s.id = session_id
      and (s.banker_id = auth.uid() or (gm.user_id = auth.uid() and gm.role = 'admin'))
    )
  );

-- ============================================================
-- Function: auto-create user profile on signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Function: generate unique invite code
-- ============================================================

create or replace function public.generate_invite_code()
returns text as $$
declare
  code text;
  exists_already boolean;
begin
  loop
    -- Generate 6-char uppercase alphanumeric
    code := upper(substr(md5(random()::text), 1, 6));
    select exists(select 1 from public.groups where invite_code = code) into exists_already;
    if not exists_already then
      return code;
    end if;
  end loop;
end;
$$ language plpgsql;