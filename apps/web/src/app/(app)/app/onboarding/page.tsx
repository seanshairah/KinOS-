import Link from "next/link";
import { withUser } from "@kinos/db";
import { Eyebrow, OrbitMark, Panel, cx } from "@kinos/ui";
import { requireUserId, getFamilyContext } from "@/lib/data/context";
import { createOrbitAction, createWorkspaceAction, inviteMemberAction } from "@/lib/actions/workspace";

/**
 * Onboarding is the activation event. It ends only when the family has:
 * a workspace → an Orbit → a second member invited → a first check-in →
 * a first duty. Each step records into activation_event for the funnel.
 */

interface StepState {
  workspace: boolean;
  orbit: boolean;
  member: boolean;
  checkin: boolean;
  duty: boolean;
  firstSubjectId: string | null;
}

async function loadState(userId: string): Promise<StepState> {
  const ctx = await getFamilyContext(userId);
  if (!ctx) {
    return { workspace: false, orbit: false, member: false, checkin: false, duty: false, firstSubjectId: null };
  }
  return withUser(userId, async (db) => {
    const steps = await db.query(`select step from activation_event`);
    const done = new Set(steps.rows.map((r) => r.step as string));
    const subject = await db.query(`select id from care_subject order by created_at limit 1`);
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
      firstSubjectId: subject.rows[0]?.id ?? null,
    };
  });
}

function Step({
  n,
  title,
  done,
  active,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  active: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-orbit border p-5 transition-colors",
        done ? "border-calm-soft bg-paper-2" : active ? "border-line bg-paper-3 shadow-card" : "border-line bg-paper-2 opacity-60",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cx(
            "grid h-7 w-7 flex-none place-items-center rounded-full font-mono text-[12px]",
            done ? "bg-calm text-white" : "border border-line-2 text-ink-faint",
          )}
        >
          {done ? "✓" : n}
        </span>
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      </div>
      {active && !done && <div className="mt-4">{children}</div>}
    </div>
  );
}

const inputClass =
  "rounded-card border border-line bg-paper px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-faint focus:border-dusk-2 w-full";

export default async function OnboardingPage() {
  const userId = await requireUserId();
  const state = await loadState(userId);
  const allDone = state.workspace && state.orbit && state.member && state.checkin && state.duty;

  return (
    <div className="mx-auto max-w-[620px]">
      <OrbitMark size={40} className="text-dusk" />
      <Eyebrow className="mt-5">Setting up</Eyebrow>
      <h1 className="mt-2 font-serif text-[30px] font-light leading-[1.15]">
        Bring your family into one calm orbit.
      </h1>
      <p className="mt-2 text-[14.5px] leading-[1.6] text-ink-soft">
        Five small steps. By the end, KinOS will already be watching over the first day.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <Step n={1} title="Name your family space" done={state.workspace} active={!state.workspace}>
          <form action={createWorkspaceAction} className="flex flex-col gap-3">
            <input name="familyName" required placeholder="e.g. Moyo Family" className={inputClass} />
            <input name="yourName" required placeholder="Your first name" className={inputClass} />
            <button className="self-start rounded-pill bg-dusk px-5 py-2.5 text-[13.5px] font-medium text-white hover:bg-dusk-2">
              Create the space
            </button>
          </form>
        </Step>

        <Step n={2} title="Add your first Orbit — the person you care for" done={state.orbit} active={state.workspace && !state.orbit}>
          <form
            action={async (formData: FormData) => {
              "use server";
              await createOrbitAction(formData);
            }}
            className="flex flex-col gap-3"
          >
            <input name="displayName" required placeholder="What the family calls them — Mum, Baba, Gogo…" className={inputClass} />
            <select name="kind" className={inputClass} defaultValue="elder">
              <option value="elder">An elderly parent or relative</option>
              <option value="child">A child</option>
              <option value="recovery">Someone recovering</option>
              <option value="disability">Someone with ongoing support needs</option>
              <option value="self">Myself</option>
            </select>
            <input name="timezone" defaultValue="Africa/Harare" className={inputClass} aria-label="Timezone" />
            <button className="self-start rounded-pill bg-dusk px-5 py-2.5 text-[13.5px] font-medium text-white hover:bg-dusk-2">
              Add this Orbit
            </button>
          </form>
        </Step>

        <Step n={3} title="Invite someone who shares the care" done={state.member} active={state.orbit && !state.member}>
          <form
            action={async (formData: FormData) => {
              "use server";
              await inviteMemberAction(formData);
            }}
            className="flex flex-col gap-3"
          >
            <input name="email" type="email" required placeholder="Their email" className={inputClass} />
            <select name="role" className={inputClass} defaultValue="member">
              <option value="member">Family member — sees and shares everything family-level</option>
              <option value="caregiver">Caregiver — logs visits and care, sees what you allow</option>
              <option value="viewer">Viewer — a quiet window, nothing more</option>
              <option value="care_recipient">The person themselves — simple check-ins</option>
            </select>
            <label className="flex items-center gap-2 text-[13px] text-ink-soft">
              <input type="checkbox" name="scopes" value="health" /> Allow health-level entries (for caregivers)
            </label>
            <button className="self-start rounded-pill bg-dusk px-5 py-2.5 text-[13.5px] font-medium text-white hover:bg-dusk-2">
              Send the invitation
            </button>
          </form>
        </Step>

        <Step n={4} title="Do the first check-in" done={state.checkin} active={state.member && !state.checkin}>
          {state.firstSubjectId && (
            <Link
              href={`/app/orbits/${state.firstSubjectId}/check-in`}
              className="inline-block rounded-pill bg-dusk px-5 py-2.5 text-[13.5px] font-medium text-white no-underline hover:bg-dusk-2"
            >
              Open the check-in
            </Link>
          )}
        </Step>

        <Step n={5} title="Assign the first duty" done={state.duty} active={state.checkin && !state.duty}>
          {state.firstSubjectId && (
            <Link
              href={`/app/orbits/${state.firstSubjectId}#duties`}
              className="inline-block rounded-pill bg-dusk px-5 py-2.5 text-[13.5px] font-medium text-white no-underline hover:bg-dusk-2"
            >
              Create a duty
            </Link>
          )}
        </Step>
      </div>

      {allDone && (
        <Panel dusk className="mt-6">
          <p className="font-serif text-[20px] leading-snug">
            Your family space is alive. The first Daily Brief arrives with the morning.
          </p>
          <Link
            href="/app"
            className="mt-4 inline-block rounded-pill bg-white px-5 py-2.5 text-[13.5px] font-semibold text-dusk no-underline"
          >
            Go to Orbit View
          </Link>
        </Panel>
      )}
    </div>
  );
}
