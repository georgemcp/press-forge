-- Restrict customer-editable profile fields, make design assets private, and
-- reserve subscription export quota atomically.

revoke update on table public.users from anon, authenticated;
grant update (
  full_name,
  company_name,
  role,
  company_website,
  phone,
  monthly_print_jobs,
  primary_use_case,
  plan_interest,
  marketing_consent,
  onboarding_completed_at
) on table public.users to authenticated;

update storage.buckets
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/png']
where id = 'design-assets';

drop policy if exists "Public read access for design assets" on storage.objects;
drop policy if exists "Users can upload to their own folder" on storage.objects;
drop policy if exists "Users can read their own files" on storage.objects;
drop policy if exists "Users can delete their own files" on storage.objects;

create or replace function public.claim_subscription_export(
  p_user_id uuid,
  p_stripe_subscription_id text,
  p_stripe_session_id text,
  p_proof_job_id text,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_limit integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_usage integer;
begin
  if p_period_end <= p_period_start or p_limit < 1 or p_limit > 1000 then
    raise exception 'Invalid subscription export reservation.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_stripe_subscription_id || ':' || p_period_start::text || ':' || p_period_end::text, 0)
  );

  select count(*)::integer
  into current_usage
  from public.subscription_export_usage
  where stripe_subscription_id = p_stripe_subscription_id
    and created_at >= p_period_start
    and created_at < p_period_end
    and status in ('processing', 'completed');

  if current_usage >= p_limit then
    raise exception 'Subscription export limit reached.';
  end if;

  insert into public.subscription_export_usage (
    user_id,
    stripe_subscription_id,
    stripe_session_id,
    proof_job_id,
    status,
    period_start,
    period_end
  ) values (
    p_user_id,
    p_stripe_subscription_id,
    p_stripe_session_id,
    p_proof_job_id,
    'processing',
    p_period_start,
    p_period_end
  );
end;
$$;

revoke all on function public.claim_subscription_export(uuid, text, text, text, timestamptz, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.claim_subscription_export(uuid, text, text, text, timestamptz, timestamptz, integer) to service_role;
