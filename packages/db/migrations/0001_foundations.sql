-- ============================================================
-- KinOS foundations: extensions, auth tables, and the RLS runtime.
-- Target: Neon Postgres. Migrations run as the database owner; the
-- application executes user queries as the non-owner role `kinos_app`
-- (SET LOCAL ROLE per transaction), which row-level security binds.
-- ============================================================

create extension if not exists pgcrypto;
create extension if not exists vector;

-- ---------- identity (Auth.js custom adapter tables) ----------

create table app_user (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique,
  email_verified timestamptz,
  image text,
  created_at timestamptz not null default now()
);

create table auth_session (
  session_token text primary key,
  user_id uuid not null references app_user on delete cascade,
  expires timestamptz not null
);
create index idx_auth_session_user on auth_session (user_id);

create table auth_account (
  provider text not null,
  provider_account_id text not null,
  user_id uuid not null references app_user on delete cascade,
  type text not null,
  access_token text,
  refresh_token text,
  expires_at bigint,
  id_token text,
  scope text,
  token_type text,
  session_state text,
  primary key (provider, provider_account_id)
);
create index idx_auth_account_user on auth_account (user_id);

create table auth_verification_token (
  identifier text not null,
  token text not null,
  expires timestamptz not null,
  primary key (identifier, token)
);

-- ---------- RLS runtime ----------

-- The application role. NOLOGIN: the app authenticates as the owner and
-- downgrades with SET LOCAL ROLE inside each transaction, so kinos_app can
-- never bypass row-level security and holds no credentials of its own.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'kinos_app') then
    create role kinos_app nologin;
  end if;
  -- The migrating (owner) role must be able to SET ROLE kinos_app —
  -- explicit on Neon, where the owner is not a superuser.
  execute format('grant kinos_app to %I', current_user);
end $$;

-- The authenticated user for the current transaction, set by the data
-- layer via  select set_config('app.user_id', $1, true).
create or replace function app_user_id() returns uuid
language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

grant usage on schema public to kinos_app;
