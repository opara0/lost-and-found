alter table public.claim_answers
    drop constraint if exists claim_answers_status_valid;

alter table public.claim_answers
    add constraint claim_answers_status_valid
    check (status in ('pending', 'accepted', 'rejected', 'withdrawn'));

create or replace function public.withdraw_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.claim_answers
    set status = 'withdrawn',
        updated_at = now()
    where id = p_claim_id
        and claimer_id = (select auth.uid())
        and status in ('pending', 'accepted');

    if not found then
        raise exception 'Pending or accepted claim not found, or you are not its claimer.';
    end if;
end;
$$;

revoke all on function public.withdraw_claim(uuid) from public, anon;
grant execute on function public.withdraw_claim(uuid) to authenticated;

notify pgrst, 'reload schema';
