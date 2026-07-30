-- One row per browser per Toronto calendar day. The random browser identifier
-- contains no IP address, account data, or other directly identifying value.
create table if not exists public.daily_visits (
  date date not null,
  visitor_id text not null,
  visit_count integer not null default 1 check (visit_count > 0),
  primary key (date, visitor_id)
);

create unique index if not exists daily_visits_date_visitor_idx
  on public.daily_visits (date, visitor_id);

alter table public.daily_visits enable row level security;

-- The app only writes through this function so increments remain atomic.
create or replace function public.record_daily_visit(visitor_identifier text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if visitor_identifier !~ '^[a-zA-Z0-9-]{16,80}$' then
    raise exception 'Invalid visitor identifier';
  end if;

  insert into public.daily_visits (date, visitor_id, visit_count)
  values ((now() at time zone 'America/Toronto')::date, visitor_identifier, 1)
  on conflict (date, visitor_id)
  do update set visit_count = public.daily_visits.visit_count + 1;
end;
$$;

revoke all on function public.record_daily_visit(text) from public;
grant execute on function public.record_daily_visit(text) to anon, authenticated;

-- The existing server-rendered localhost dashboard uses the anonymous client.
-- IDs are random installation identifiers and are displayed only as aggregates.
grant select on public.daily_visits to anon, authenticated;

drop policy if exists "Analytics can be read" on public.daily_visits;
create policy "Analytics can be read"
  on public.daily_visits
  for select
  to anon, authenticated
  using (true);
