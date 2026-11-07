alter table public.posts
    add column if not exists questions jsonb not null default '[]'::jsonb;

create table if not exists public.claim_answers (
    id uuid primary key default gen_random_uuid(),
    post_id text not null,
    claimer_id uuid not null references auth.users (id) on delete cascade,
    answers jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint claim_answers_post_claimer_unique unique (post_id, claimer_id),
    constraint claim_answers_are_array check (jsonb_typeof(answers) = 'array')
);

alter table public.claim_answers enable row level security;

revoke all on public.claim_answers from anon, authenticated;
grant select, insert, update on public.claim_answers to authenticated;

drop policy if exists "Claimers and post owners can read claim answers" on public.claim_answers;
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

drop policy if exists "Signed-in users can submit claims for others' posts" on public.claim_answers;
create policy "Signed-in users can submit claims for others' posts"
    on public.claim_answers
    for insert
    to authenticated
    with check (
        claimer_id = (select auth.uid())
        and exists (
            select 1
            from public.posts
            where public.posts.id::text = claim_answers.post_id
                and public.posts.user_id <> (select auth.uid())
        )
    );

drop policy if exists "Claimers can update their own answers" on public.claim_answers;
create policy "Claimers can update their own answers"
    on public.claim_answers
    for update
    to authenticated
    using (
        claimer_id = (select auth.uid())
        and exists (
            select 1
            from public.posts
            where public.posts.id::text = claim_answers.post_id
                and public.posts.user_id <> (select auth.uid())
        )
    )
    with check (
        claimer_id = (select auth.uid())
        and exists (
            select 1
            from public.posts
            where public.posts.id::text = claim_answers.post_id
                and public.posts.user_id <> (select auth.uid())
        )
    );

notify pgrst, 'reload schema';
