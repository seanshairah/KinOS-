-- ============================================================
-- Rate limiting — a sliding-window counter for the public edges
-- (sign-in codes, demo entrance, device webhooks). Service-path only:
-- no app-role grants; the helper below does check + record in one
-- statement so racing requests can't slip under the limit.
-- ============================================================

create table rate_limit_hit (
  key text not null,
  at timestamptz not null default now()
);
create index idx_rate_limit on rate_limit_hit (key, at desc);

-- True when the caller is within `p_limit` hits per `p_window_seconds`.
-- Records the hit only when allowed, so blocked attempts don't extend
-- the window forever.
create or replace function rate_limit_check(p_key text, p_limit int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare hits int;
begin
  select count(*) into hits from rate_limit_hit
    where key = p_key and at > now() - make_interval(secs => p_window_seconds);
  if hits >= p_limit then
    return false;
  end if;
  insert into rate_limit_hit (key) values (p_key);
  return true;
end $$;

-- Housekeeping: anything older than a day is noise.
create or replace function rate_limit_sweep() returns void
language sql security definer set search_path = public as $$
  delete from rate_limit_hit where at < now() - interval '1 day'
$$;
