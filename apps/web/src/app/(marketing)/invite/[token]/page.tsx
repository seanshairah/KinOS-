import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { serviceQuery, isDatabaseConfigured } from "@kinos/db";
import { Eyebrow, OrbitMark } from "@kinos/ui";
import { acceptInvitationAction } from "@/lib/actions/workspace";
import { currentUserId } from "@/lib/auth";

export const metadata: Metadata = { title: "You're invited" };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isDatabaseConfigured()) redirect("/setup");

  // Look up the invitation service-side (the invitee has no membership yet).
  const res = await serviceQuery<{
    workspace_name: string;
    role: string;
    status: string;
    expired: boolean;
  }>(
    `select w.name as workspace_name, i.role, i.status, (i.expires_at < now()) as expired
     from invitation i join family_workspace w on w.id = i.workspace_id
     where i.token = $1`,
    [token],
  );
  const invite = res.rows[0];
  const valid = invite && invite.status === "pending" && !invite.expired;

  const userId = await currentUserId();

  return (
    <section className="flex min-h-[70vh] items-center py-16">
      <div className="mx-auto w-full max-w-[460px] px-7">
        <OrbitMark size={44} className="text-dusk" />
        {!valid ? (
          <>
            <h1 className="mt-6 font-serif text-[30px] font-light leading-[1.2]">
              This invitation is no longer open.
            </h1>
            <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-soft">
              It may have been used, revoked, or it expired. Ask the family admin to send a
              fresh one — invitations stay valid for 14 days.
            </p>
          </>
        ) : (
          <>
            <Eyebrow className="mt-6">You&apos;re invited</Eyebrow>
            <h1 className="mt-3 font-serif text-[30px] font-light leading-[1.2]">
              Join {invite.workspace_name} on KinOS
            </h1>
            <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-soft">
              You&apos;ve been invited as{" "}
              <b className="text-ink">{invite.role.replace("_", " ")}</b> — helping look
              after the people this family loves, together.
            </p>
            {userId ? (
              <form action={acceptInvitationAction} className="mt-6 flex flex-col gap-3">
                <input type="hidden" name="token" value={token} />
                <input
                  name="yourName"
                  required
                  placeholder="Your first name"
                  className="rounded-card border border-line bg-paper-3 px-4 py-3 text-[15px] placeholder:text-ink-faint focus:border-dusk-2"
                />
                <button className="rounded-pill bg-dusk px-6 py-3 text-[14px] font-semibold text-white hover:bg-dusk-2">
                  Accept and join the family
                </button>
              </form>
            ) : (
              <div className="mt-6">
                <a
                  href={`/sign-in?next=/invite/${token}`}
                  className="inline-block rounded-pill bg-dusk px-6 py-3 text-[14px] font-semibold text-white no-underline hover:bg-dusk-2"
                >
                  Sign in to accept
                </a>
                <p className="mt-3 text-[12.5px] text-ink-faint">
                  Use the email this invitation was sent to, then come back to this link.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
