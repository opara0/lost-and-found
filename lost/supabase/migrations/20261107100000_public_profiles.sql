create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    first_name text not null default '',
    last_name text not null default '',
    avatar_url text not null default ''
);

alter table public.profiles
    add column if not exists first_name text not null default '',
    add column if not exists last_name text not null default '',
    add column if not exists avatar_url text not null default '';

revoke all on public.profiles from anon, authenticated;
grant select (id, first_name, last_name, avatar_url) on public.profiles to anon, authenticated;

alter table public.profiles enable row level security;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
    on public.profiles
    for select
    to anon, authenticated
    using (true);

create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, first_name, last_name, avatar_url)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'first_name', ''),
        coalesce(new.raw_user_meta_data ->> 'last_name', ''),
        coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
    )
    on conflict (id) do update
    set first_name = excluded.first_name,
        last_name = excluded.last_name,
        avatar_url = excluded.avatar_url;

    return new;
end;
$$;

revoke all on function public.sync_profile_from_auth() from public, anon, authenticated;

drop trigger if exists sync_profile_from_auth on auth.users;
create trigger sync_profile_from_auth
    after insert or update of raw_user_meta_data on auth.users
    for each row
    execute function public.sync_profile_from_auth();

insert into public.profiles (id, first_name, last_name, avatar_url)
select
    id,
    coalesce(raw_user_meta_data ->> 'first_name', ''),
    coalesce(raw_user_meta_data ->> 'last_name', ''),
    coalesce(raw_user_meta_data ->> 'avatar_url', '')
from auth.users
on conflict (id) do update
set first_name = excluded.first_name,
    last_name = excluded.last_name,
    avatar_url = excluded.avatar_url;
