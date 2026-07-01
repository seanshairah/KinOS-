import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { isDatabaseConfigured } from "@kinos/db";
import { pgAdapter } from "./auth-adapter";

/**
 * Auth.js v5 — email magic links via Resend, sessions in Neon.
 * Without RESEND_API_KEY (local dev) the magic link is printed to the
 * server console so sign-in still works end to end.
 */

export const authConfigured = isDatabaseConfigured();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: authConfigured ? pgAdapter() : undefined,
  session: { strategy: "database" },
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/sign-in/sent",
  },
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY ?? "resend-not-configured",
      from: process.env.NOTIFICATIONS_FROM_EMAIL ?? "KinOS <brief@kinos.family>",
      ...(process.env.RESEND_API_KEY
        ? {}
        : {
            async sendVerificationRequest({ identifier, url }) {
              console.log(`\n[kinos] magic link for ${identifier}:\n${url}\n`);
            },
          }),
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  trustHost: true,
});

/** The signed-in user id, or null. */
export async function currentUserId(): Promise<string | null> {
  if (!authConfigured) return null;
  const session = await auth();
  return session?.user?.id ?? null;
}
