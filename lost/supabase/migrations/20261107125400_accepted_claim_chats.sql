create table if not exists public.claim_chats (
    id uuid primary key default gen_random_uuid(),
    claim_id uuid not null unique references public.claim_answers (id) on delete cascade,
    post_id text not null,
    owner_id uuid not null references auth.users (id) on delete cascade,
    claimer_id uuid not null references auth.users (id) on delete cascade,
    created_at timestamptz not null default now()
);

create table if not exists public.claim_chat_messages (
    id uuid primary key default gen_random_uuid(),
    chat_id uuid not null references public.claim_chats (id) on delete cascade,
    sender_id uuid not null references auth.users (id) on delete cascade,
    body text not null check (char_length(btrim(body)) between 1 and 2000),
    created_at timestamptz not null default now()
);

alter table public.claim_chats enable row level security;
alter table public.claim_chat_messages enable row level security;

revoke all on public.claim_chats, public.claim_chat_messages from anon, authenticated;
grant select on public.claim_chats, public.claim_chat_messages to authenticated;
grant insert (chat_id, sender_id, body) on public.claim_chat_messages to authenticated;

drop policy if exists "Chat participants can read chats" on public.claim_chats;
create policy "Chat participants can read chats"
    on public.claim_chats
    for select
    to authenticated
    using (
        owner_id = (select auth.uid())
        or claimer_id = (select auth.uid())
    );

drop policy if exists "Chat participants can read messages" on public.claim_chat_messages;
create policy "Chat participants can read messages"
    on public.claim_chat_messages
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.claim_chats
            where public.claim_chats.id = claim_chat_messages.chat_id
                and (
                    public.claim_chats.owner_id = (select auth.uid())
                    or public.claim_chats.claimer_id = (select auth.uid())
                )
        )
    );

drop policy if exists "Accepted chat participants can send messages" on public.claim_chat_messages;
create policy "Accepted chat participants can send messages"
    on public.claim_chat_messages
    for insert
    to authenticated
    with check (
        sender_id = (select auth.uid())
        and exists (
            select 1
            from public.claim_chats
            join public.claim_answers
                on public.claim_answers.id = public.claim_chats.claim_id
            where public.claim_chats.id = claim_chat_messages.chat_id
                and public.claim_answers.status = 'accepted'
                and (
                    public.claim_chats.owner_id = (select auth.uid())
                    or public.claim_chats.claimer_id = (select auth.uid())
                )
        )
    );

drop function if exists public.review_claim(uuid, text);
create function public.review_claim(p_claim_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if p_status not in ('accepted', 'rejected') then
        raise exception 'Claim decision must be accepted or rejected.';
    end if;

    update public.claim_answers
    set status = p_status,
        updated_at = now()
    where id = p_claim_id
        and status = 'pending'
        and exists (
            select 1
            from public.posts
            where public.posts.id::text = public.claim_answers.post_id
                and public.posts.user_id = (select auth.uid())
        );

    if not found then
        raise exception 'Pending claim not found or you are not its post owner.';
    end if;

    if p_status = 'accepted' then
        insert into public.claim_chats (claim_id, post_id, owner_id, claimer_id)
        select
            claim.id,
            claim.post_id,
            post.user_id,
            claim.claimer_id
        from public.claim_answers as claim
        join public.posts as post on post.id::text = claim.post_id
        where claim.id = p_claim_id
        on conflict (claim_id) do nothing;
    end if;
end;
$$;

revoke all on function public.review_claim(uuid, text) from public, anon;
grant execute on function public.review_claim(uuid, text) to authenticated;

insert into public.claim_chats (claim_id, post_id, owner_id, claimer_id)
select claim.id, claim.post_id, post.user_id, claim.claimer_id
from public.claim_answers as claim
join public.posts as post on post.id::text = claim.post_id
where claim.status = 'accepted'
on conflict (claim_id) do nothing;

notify pgrst, 'reload schema';
