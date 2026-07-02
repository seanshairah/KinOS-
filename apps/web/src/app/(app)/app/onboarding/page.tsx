import { redirect } from "next/navigation";
import { withUser } from "@kinos/db";
import { requireUserId, getFamilyContext } from "@/lib/data/context";
import {
  createOrbitAction,
  createWorkspaceAction,
  inviteMemberAction,
} from "@/lib/actions/workspace";
import { OnboardingJourney, type JourneyState } from "@/components/onboarding-journey";

/**
 * Onboarding is the activation event, staged as an experience: the
 * family builds its own sky, chapter by chapter. It ends only when the
 * family has a workspace → an Orbit → a second member invited → a first
 * check-in → a first duty. Each step records into activation_event.
 */

async function loadState(userId: string, inviteLink: string | null): Promise<JourneyState> {
  const ctx = await getFamilyContext(userId);
  if (!ctx) {
    return {
      workspace: false,
      orbit: false,
      member: false,
      checkin: false,
      duty: false,
      firstSubjectId: null,
      familyName: null,
      subjectName: null,
      inviteLink: null,
    };
  }
  return withUser(userId, async (db) => {
    const steps = await db.query(`select step from activation_event`);
    const done = new Set(steps.rows.map((r) => r.step as string));
    const subject = await db.query(
      `select id, display_name from care_subject order by created_at limit 1`,
    );
    const members = await db.query(`select count(*)::int as n from family_member`);
    const invites = await db.query(
      `select count(*)::int as n from invitation where status = 'pending'`,
    );
    return {
      workspace: true,
      orbit: done.has("orbit_created") || Boolean(subject.rows[0]),
      member: done.has("member_added") || members.rows[0]!.n > 1 || invites.rows[0]!.n > 0,
      checkin: done.has("first_checkin"),
      duty: done.has("first_duty"),
      firstSubjectId: (subject.rows[0]?.id as string | undefined) ?? null,
      familyName: ctx.workspace.name,
      subjectName: (subject.rows[0]?.display_name as string | undefined) ?? null,
      inviteLink,
    };
  });
}

async function createOrbit(formData: FormData): Promise<void> {
  "use server";
  await createOrbitAction(formData);
  redirect("/app/onboarding");
}

async function inviteMember(formData: FormData): Promise<void> {
  "use server";
  const result = await inviteMemberAction(formData);
  redirect(
    result.ok && result.message
      ? `/app/onboarding?invite=${encodeURIComponent(result.message)}`
      : "/app/onboarding",
  );
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const state = await loadState(userId, params.invite ?? null);

  return (
    <OnboardingJourney
      state={state}
      createWorkspace={createWorkspaceAction}
      createOrbit={createOrbit}
      inviteMember={inviteMember}
    />
  );
}
