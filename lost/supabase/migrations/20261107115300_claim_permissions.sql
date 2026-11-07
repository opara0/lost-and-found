alter table public.claim_answers enable row level security;

grant select, insert on public.claim_answers to authenticated;

drop policy if exists "Claimers and post owners can read claim answers"
    on public.claim_answers;
create policy "Claimers and post owners can read claim answers"
    on public.claim_answers
    for select
    to authenticated
    using (
        claimer_id = (select auth.uid())
        or exists (
            select 1
            from public.posts
            where public.posts.id::text = claim_answers.post_id
                and public.posts.user_id = (select auth.uid())
        )
    );

drop policy if exists "Signed-in users can submit pending claims for others' posts"
    on public.claim_answers;
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

notify pgrst, 'reload schema';
