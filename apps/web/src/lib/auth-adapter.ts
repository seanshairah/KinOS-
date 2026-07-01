import type {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters";
import { getPool } from "@kinos/db";

/**
 * Auth.js adapter over our own Neon tables (app_user, auth_session,
 * auth_account, auth_verification_token) with uuid ids. Auth tables are
 * only ever touched here, under the owner role — they carry no RLS since
 * they exist before a user context does.
 */

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  email_verified: Date | null;
  image: string | null;
}

function toAdapterUser(row: UserRow): AdapterUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? "",
    emailVerified: row.email_verified,
    image: row.image,
  };
}

export function pgAdapter(): Adapter {
  const q = <T,>(text: string, params: unknown[]) =>
    getPool()
      .query(text, params as never[])
      .then((r) => r.rows as T[]);

  return {
    async createUser(user) {
      const rows = await q<UserRow>(
        `insert into app_user (name, email, email_verified, image)
         values ($1, $2, $3, $4) returning *`,
        [user.name ?? null, user.email, user.emailVerified, user.image ?? null],
      );
      return toAdapterUser(rows[0]!);
    },

    async getUser(id) {
      const rows = await q<UserRow>(`select * from app_user where id = $1`, [id]);
      return rows[0] ? toAdapterUser(rows[0]) : null;
    },

    async getUserByEmail(email) {
      const rows = await q<UserRow>(`select * from app_user where email = $1`, [email]);
      return rows[0] ? toAdapterUser(rows[0]) : null;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const rows = await q<UserRow>(
        `select u.* from app_user u
         join auth_account a on a.user_id = u.id
         where a.provider = $1 and a.provider_account_id = $2`,
        [provider, providerAccountId],
      );
      return rows[0] ? toAdapterUser(rows[0]) : null;
    },

    async updateUser(user) {
      const rows = await q<UserRow>(
        `update app_user set
           name = coalesce($2, name),
           email = coalesce($3, email),
           email_verified = coalesce($4, email_verified),
           image = coalesce($5, image)
         where id = $1 returning *`,
        [user.id, user.name ?? null, user.email ?? null, user.emailVerified ?? null, user.image ?? null],
      );
      return toAdapterUser(rows[0]!);
    },

    async deleteUser(userId) {
      await q(`delete from app_user where id = $1`, [userId]);
    },

    async linkAccount(account: AdapterAccount) {
      await q(
        `insert into auth_account
           (provider, provider_account_id, user_id, type, access_token, refresh_token,
            expires_at, id_token, scope, token_type, session_state)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          account.provider,
          account.providerAccountId,
          account.userId,
          account.type,
          account.access_token ?? null,
          account.refresh_token ?? null,
          account.expires_at ?? null,
          account.id_token ?? null,
          account.scope ?? null,
          account.token_type ?? null,
          (account.session_state as string | undefined) ?? null,
        ],
      );
      return account;
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await q(
        `delete from auth_account where provider = $1 and provider_account_id = $2`,
        [provider, providerAccountId],
      );
    },

    async createSession(session) {
      await q(
        `insert into auth_session (session_token, user_id, expires) values ($1, $2, $3)`,
        [session.sessionToken, session.userId, session.expires],
      );
      return session;
    },

    async getSessionAndUser(sessionToken) {
      const rows = await q<UserRow & { session_token: string; user_id: string; expires: Date }>(
        `select s.session_token, s.user_id, s.expires, u.*
         from auth_session s join app_user u on u.id = s.user_id
         where s.session_token = $1`,
        [sessionToken],
      );
      const row = rows[0];
      if (!row) return null;
      const session: AdapterSession = {
        sessionToken: row.session_token,
        userId: row.user_id,
        expires: row.expires,
      };
      return { session, user: toAdapterUser(row) };
    },

    async updateSession(session) {
      const rows = await q<{ session_token: string; user_id: string; expires: Date }>(
        `update auth_session set expires = coalesce($2, expires)
         where session_token = $1
         returning session_token, user_id, expires`,
        [session.sessionToken, session.expires ?? null],
      );
      const row = rows[0];
      if (!row) return null;
      return {
        sessionToken: row.session_token,
        userId: row.user_id,
        expires: row.expires,
      };
    },

    async deleteSession(sessionToken) {
      await q(`delete from auth_session where session_token = $1`, [sessionToken]);
    },

    async createVerificationToken(token: VerificationToken) {
      await q(
        `insert into auth_verification_token (identifier, token, expires) values ($1, $2, $3)`,
        [token.identifier, token.token, token.expires],
      );
      return token;
    },

    async useVerificationToken({ identifier, token }) {
      const rows = await q<{ identifier: string; token: string; expires: Date }>(
        `delete from auth_verification_token
         where identifier = $1 and token = $2
         returning identifier, token, expires`,
        [identifier, token],
      );
      return rows[0] ?? null;
    },
  };
}
