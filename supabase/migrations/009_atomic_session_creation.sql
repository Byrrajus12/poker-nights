create or replace function public.create_session_with_players(
  p_group_id uuid,
  p_member_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_session_id uuid;
  player_count integer;
begin
  select count(distinct selected.member_id)
  into player_count
  from unnest(p_member_ids) as selected(member_id);

  if player_count < 2 then
    raise exception 'A session requires at least two players.';
  end if;

  if exists (
    select 1
    from unnest(p_member_ids) as selected(member_id)
    left join public.group_members as member
      on member.id = selected.member_id
      and member.group_id = p_group_id
    where member.id is null
  ) then
    raise exception 'Every selected player must belong to the group.';
  end if;

  insert into public.sessions (group_id, banker_id, status)
  values (p_group_id, auth.uid(), 'active')
  returning id into new_session_id;

  insert into public.session_players (session_id, member_id)
  select new_session_id, selected.member_id
  from (
    select distinct member_id
    from unnest(p_member_ids) as players(member_id)
  ) as selected;

  return new_session_id;
end;
$$;

revoke all on function public.create_session_with_players(uuid, uuid[]) from public;
grant execute on function public.create_session_with_players(uuid, uuid[]) to authenticated;
