-- ============================================================
-- Waitlist — the public front door now that kinos.family is live.
-- Service-path only (no app-role grants; like health_source_link), so
-- a leaked app role can't read the list. Public capture goes through the
-- security-definer RPC below, which validates shape, dedupes, and never
-- reveals whether an address was already on the list.
-- ============================================================

create table waitlist_signup (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text,
  referrer text,
  created_at timestamptz not null default now()
);
create index idx_waitlist_created on waitlist_signup (created_at desc);

alter table waitlist_signup enable row level security;
-- No policies, no app-role grants: only the RPC and service paths touch it.

-- Join the waitlist. Idempotent on email; returns nothing, so the caller
-- can't probe membership. Runs as owner (security definer) — the public
-- endpoint calls this instead of holding table rights.
create or replace function join_waitlist(p_email text, p_source text default null, p_referrer text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into waitlist_signup (email, source, referrer)
    values (lower(trim(p_email)), p_source, p_referrer)
    on conflict (email) do nothing;
end $$;

grant execute on function join_waitlist(text, text, text) to kinos_app;
