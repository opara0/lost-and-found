alter table public.claim_answers
    add column if not exists status text not null default 'pending';

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.claim_answers'::regclass
            and conname = 'claim_answers_status_valid'
    ) then
        alter table public.claim_answers
            add constraint claim_answers_status_valid
            check (status in ('pending', 'accepted', 'rejected'));
    end if;
end;
$$;

revoke update on public.claim_answers from authenticated;
grant update (answers, updated_at) on public.claim_answers to authenticated;

drop policy if exists "Signed-in users can submit claims for others' posts" on public.claim_answers;
create policy "Signed-in users can submit pending claims for others' posts"
    on public.claim_answers
    for insert
    to authenticated
    with check (
        claimer_id = (select auth.uid())
        and status = 'pending'
        and exists (
            select 1
            from public.posts
            where public.posts.id::text = claim_answers.post_id
                and public.posts.user_id <> (select auth.uid())
        )
    );

create or replace function public.review_claim(p_claim_id uuid, p_status text)
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
end;
$$;

revoke all on function public.review_claim(uuid, text) from public, anon;
grant execute on function public.review_claim(uuid, text) to authenticated;

notify pgrst, 'reload schema';
