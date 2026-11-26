-- Run this whole file once in Supabase -> SQL Editor.

create table if not exists public.elevators (
  id smallint primary key,
  status text not null default 'working' check (status in ('working', 'broken')),
  status_changed_at timestamptz not null default now()
);

-- Display name, set it manually, e.g.: update elevators set name = 'Лівий ліфт' where id = 1;
alter table public.elevators add column if not exists name text;

insert into public.elevators (id) values (1), (2) on conflict do nothing;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  elevator_id smallint not null references public.elevators (id),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  user_name text not null default '',
  kind text not null check (kind in ('broken', 'working')),
  comment text check (comment is null or char_length(comment) <= 280),
  changed boolean not null default false, -- did this report change the elevator status?
  created_at timestamptz not null default now()
);

create index if not exists reports_created_idx on public.reports (created_at desc);

-- Fill in user, name, rate limit, "changed" flag
create or replace function public.reports_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cur text;
  uname text;
begin
  new.user_id := auth.uid();
  if new.user_id is null then
    raise exception 'not authenticated';
  end if;

  if exists (
    select 1 from reports
    where user_id = new.user_id and elevator_id = new.elevator_id
      and created_at > now() - interval '60 seconds'
  ) then
    raise exception 'rate_limited';
  end if;

  select coalesce(
           nullif(split_part(raw_user_meta_data ->> 'full_name', ' ', 1), ''),
           nullif(split_part(email, '@', 1), ''),
           'anonymous')
    into uname from auth.users where id = new.user_id;
  new.user_name := left(uname, 40);

  select status into cur from elevators where id = new.elevator_id;
  new.changed := (cur is distinct from new.kind);
  new.created_at := now();
  return new;
end $$;

drop trigger if exists reports_before_insert on public.reports;
create trigger reports_before_insert before insert on public.reports
  for each row execute function public.reports_before_insert();

-- Update elevator status after a report
create or replace function public.reports_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.changed then
    update elevators set status = new.kind, status_changed_at = new.created_at
    where id = new.elevator_id;
  end if;
  return new;
end $$;

drop trigger if exists reports_after_insert on public.reports;
create trigger reports_after_insert after insert on public.reports
  for each row execute function public.reports_after_insert();

-- Row level security
alter table public.elevators enable row level security;
alter table public.reports enable row level security;

drop policy if exists "elevators readable" on public.elevators;
create policy "elevators readable" on public.elevators for select using (true);

drop policy if exists "reports readable" on public.reports;
create policy "reports readable" on public.reports for select using (true);

drop policy if exists "reports insert own" on public.reports;
create policy "reports insert own" on public.reports for insert to authenticated
  with check (user_id = auth.uid());

-- Realtime
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'elevators') then
    alter publication supabase_realtime add table public.elevators;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reports') then
    alter publication supabase_realtime add table public.reports;
  end if;
end $$;

-- Table privileges (newer Supabase projects don't grant these automatically)
grant usage on schema public to anon, authenticated;
grant select on public.elevators to anon, authenticated;
grant select on public.reports to anon, authenticated;
grant insert on public.reports to authenticated;

-- Email subscriptions
create table if not exists public.subscriptions (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  email text not null default '',
  created_at timestamptz not null default now()
);

create or replace function public.subscriptions_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  select email into new.email from auth.users where id = new.user_id;
  return new;
end $$;

drop trigger if exists subscriptions_before_insert on public.subscriptions;
create trigger subscriptions_before_insert before insert on public.subscriptions
  for each row execute function public.subscriptions_before_insert();

alter table public.subscriptions enable row level security;
drop policy if exists "subs own select" on public.subscriptions;
create policy "subs own select" on public.subscriptions for select to authenticated using (user_id = auth.uid());
drop policy if exists "subs own insert" on public.subscriptions;
create policy "subs own insert" on public.subscriptions for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "subs own delete" on public.subscriptions;
create policy "subs own delete" on public.subscriptions for delete to authenticated using (user_id = auth.uid());
grant select, insert, delete on public.subscriptions to authenticated;
