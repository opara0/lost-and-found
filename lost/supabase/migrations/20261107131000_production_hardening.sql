do $$
declare
    updated_bucket_count integer;
begin
    update storage.buckets
    set file_size_limit = 52428800,
        allowed_mime_types = array['image/*', 'video/*']
    where id = 'lost-found-media';

    get diagnostics updated_bucket_count = row_count;
    if updated_bucket_count = 0 then
        raise exception 'Storage bucket lost-found-media must exist before applying this migration.';
    end if;
end;
$$;

create or replace function public.review_claim(p_claim_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    locked_post_id text;
    post_owner_id uuid;
begin
    if p_status is null or p_status not in ('accepted', 'rejected') then
        raise exception 'Claim decision must be accepted or rejected.';
    end if;

    select post.id::text, post.user_id
    into locked_post_id, post_owner_id
    from public.posts as post
    join public.claim_answers as claim on claim.post_id = post.id::text
    where claim.id = p_claim_id
        and post.user_id = (select auth.uid())
        and claim.status = 'pending'
    for update of post;

    if not found then
        raise exception 'Pending claim not found or you are not its post owner.';
    end if;

    if p_status = 'accepted' and exists (
        select 1
        from public.claim_answers as accepted_claim
        where accepted_claim.post_id = locked_post_id
            and accepted_claim.status = 'accepted'
            and accepted_claim.id <> p_claim_id
    ) then
        raise exception 'Another claim for this item has already been accepted.';
    end if;

    update public.claim_answers
    set status = p_status,
        updated_at = now()
    where id = p_claim_id
        and status = 'pending';

    if not found then
        raise exception 'This claim has already been reviewed.';
    end if;

    if p_status = 'accepted' then
        insert into public.claim_chats (claim_id, post_id, owner_id, claimer_id)
        select claim.id, claim.post_id, post_owner_id, claim.claimer_id
        from public.claim_answers as claim
        where claim.id = p_claim_id
        on conflict (claim_id) do nothing;
    end if;
end;
$$;

revoke all on function public.review_claim(uuid, text) from public, anon;
grant execute on function public.review_claim(uuid, text) to authenticated;

do $$
begin
    if exists (
        select 1 from pg_publication where pubname = 'supabase_realtime'
    ) and not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
            and schemaname = 'public'
            and tablename = 'claim_answers'
    ) then
        alter publication supabase_realtime add table public.claim_answers;
    end if;

    if exists (
        select 1 from pg_publication where pubname = 'supabase_realtime'
    ) and not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
            and schemaname = 'public'
            and tablename = 'claim_chat_messages'
    ) then
        alter publication supabase_realtime add table public.claim_chat_messages;
    end if;
end;
$$;

notify pgrst, 'reload schema';
