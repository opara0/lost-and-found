alter table public.claim_answers
    add column if not exists claimer_hidden_at timestamptz;

create or replace function public.hide_rejected_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.claim_answers
    set claimer_hidden_at = now()
    where id = p_claim_id
        and claimer_id = (select auth.uid())
        and status = 'rejected'
        and claimer_hidden_at is null;

    if not found then
        raise exception 'Rejected claim not found, already removed, or you are not its claimer.';
    end if;
end;
$$;

revoke all on function public.hide_rejected_claim(uuid) from public, anon;
grant execute on function public.hide_rejected_claim(uuid) to authenticated;

notify pgrst, 'reload schema';
