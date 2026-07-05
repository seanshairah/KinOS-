"use client";

import Link from "next/link";
import { useState } from "react";
import { OrbitSystem, type SatelliteSpec } from "@/components/orbit/orbit-system";

/**
 * OnboardingJourney — the activation flow as an experience, not a form.
 * The visitor builds their family's sky: each completed chapter adds a
 * light to a living orbit beside the words. By the end, the orbit they
 * were promised on the landing page is theirs, with their names on it.
 */

export interface JourneyState {
  workspace: boolean;
  orbit: boolean;
  member: boolean;
  checkin: boolean;
  duty: boolean;
  firstSubjectId: string | null;
  familyName: string | null;
  subjectName: string | null;
  inviteLink: string | null;
}

type FormAction = (formData: FormData) => void | Promise<void>;

const inputClass =
  "w-full rounded-card border border-line bg-[#211f42]/60 px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-faint focus:border-halo/60 focus:outline-none";

/** The sky fills as the chapters complete. */
function buildSatellites(state: JourneyState): readonly SatelliteSpec[] {
  const sats: SatelliteSpec[] = [];
  if (state.member) {
    sats.push({
      id: "member",
      ring: 1,
      angle: 2.1,
      speed: -0.05,
      size: 12,
      hue: "halo",
      lines: ["Someone who shares the care", "Invited · their light joins yours"],
    });
  }
  if (state.checkin) {
    sats.push({
      id: "checkin",
      ring: 0,
      angle: 0.6,
      speed: 0.07,
      size: 10,
      hue: "calm",
      lines: ["First check-in", "The family knows."],
    });
  }
  if (state.duty) {
    sats.push({
      id: "duty",
      ring: 2,
      angle: -0.8,
      speed: 0.04,
      size: 11,
      hue: "ink",
      lines: ["First duty", "Responsibility, with a name on it"],
    });
  }
  return sats;
}

function Chapter({
  index,
  title,
  doneLine,
  done,
  active,
  children,
}: {
  index: number;
  title: string;
  doneLine: string;
  done: boolean;
  active: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative pl-9">
      {/* the thread — each chapter is a stop along one line of light */}
      <span
        aria-hidden
        className={`absolute left-[7px] top-[26px] h-[calc(100%-18px)] w-px ${done ? "bg-halo/40" : "bg-halo/15"}`}
      />
      <span
        aria-hidden
        className={`absolute left-0 top-[7px] grid h-[15px] w-[15px] place-items-center rounded-full border transition-all duration-500 ${
          done
            ? "border-calm bg-calm/20"
            : active
              ? "border-halo bg-halo/25 shadow-[0_0_12px_rgba(169,167,224,.5)]"
              : "border-halo/25 bg-transparent"
        }`}
      >
        {done && <span className="h-[5px] w-[5px] rounded-full bg-calm" />}
      </span>

      <div className={`pb-8 transition-opacity duration-500 ${done || active ? "opacity-100" : "opacity-35"}`}>
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10.5px] tracking-[0.14em] text-halo">
            {String(index).padStart(2, "0")}
          </span>
          <h2 className="font-serif text-[19px] font-light leading-snug text-ink">
            {done ? doneLine : title}
          </h2>
        </div>
        {active && !done && (
          <div className="mt-4" style={{ animation: "reveal-up .6s ease both" }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="lift self-start rounded-pill bg-white px-5 py-2.5 text-[13.5px] font-semibold text-dusk hover:bg-dusk-ink">
      {children}
    </button>
  );
}

export function OnboardingJourney({
  state,
  createWorkspace,
  createOrbit,
  inviteMember,
}: {
  state: JourneyState;
  createWorkspace: FormAction;
  createOrbit: FormAction;
  inviteMember: FormAction;
}) {
  const [copied, setCopied] = useState(false);
  const allDone = state.workspace && state.orbit && state.member && state.checkin && state.duty;
  const doneCount = [state.workspace, state.orbit, state.member, state.checkin, state.duty].filter(Boolean).length;

  return (
    <div className="mx-auto grid max-w-[1040px] items-start gap-10 lg:grid-cols-[1fr_minmax(320px,420px)]">
      {/* ——— the chapters ——— */}
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-halo">
          {allDone ? "your sky is complete" : `building your family's sky · ${doneCount} of 5`}
        </p>
        <h1 className="mt-3 font-serif text-[clamp(28px,4vw,38px)] font-light leading-[1.12] text-ink">
          {allDone ? (
            <>The people you love, in one calm orbit — <em className="italic">yours</em>.</>
          ) : (
            <>Five small moments, and the sky starts watching with you.</>
          )}
        </h1>

        <div className="mt-9">
          <Chapter
            index={1}
            title="Every family begins with a name."
            doneLine={`${state.familyName ?? "Your family"} — the space exists.`}
            done={state.workspace}
            active={!state.workspace}
          >
            <form action={createWorkspace} className="flex max-w-[400px] flex-col gap-3">
              <input name="familyName" required placeholder="What do you call yourselves — Moyo Family, The Dubes…" className={inputClass} />
              <input name="yourName" required placeholder="Your first name" className={inputClass} />
              <SubmitButton>Name the space</SubmitButton>
            </form>
          </Chapter>

          <Chapter
            index={2}
            title="Who sits at the centre of it all?"
            doneLine={`${state.subjectName ?? "Your loved one"} sits at the centre now.`}
            done={state.orbit}
            active={state.workspace && !state.orbit}
          >
            <form action={createOrbit} className="flex max-w-[400px] flex-col gap-3">
              <input name="displayName" required placeholder="What the family calls them — Mum, Baba, Gogo…" className={inputClass} />
              <select name="kind" className={inputClass} defaultValue="elder">
                <option value="elder">An elderly parent or relative</option>
                <option value="child">A child</option>
                <option value="recovery">Someone recovering</option>
                <option value="disability">Someone with ongoing support needs</option>
                <option value="self">Myself</option>
              </select>
              <input name="timezone" defaultValue="Africa/Harare" className={inputClass} aria-label="Their timezone" />
              <select name="template" className={inputClass} defaultValue="" aria-label="Start from a shape of care">
                <option value="">Start from a blank page</option>
                <option value="elderly_parent">Elderly parent — check-ins, medication, clinic runs</option>
                <option value="child_school">Child at school — the school run, forms, routines</option>
                <option value="post_surgery">Post-surgery recovery — follow-ups and gentle days</option>
                <option value="chronic_care">Ongoing condition — refills and routine reviews</option>
                <option value="caregiver_managed">Caregiver-managed care — visits and the evening brief</option>
                <option value="diaspora_parent">Parent back home — check-in texts and the Money Pot</option>
              </select>
              <p className="text-[11.5px] leading-relaxed text-ink-faint">
                A template just sets up the first duties and a care-plan sketch — everything
                stays yours to edit.
              </p>
              <SubmitButton>Place them at the centre</SubmitButton>
            </form>
          </Chapter>

          <Chapter
            index={3}
            title="An orbit needs more than one light."
            doneLine="A second light is on its way — the care is shared."
            done={state.member}
            active={state.orbit && !state.member}
          >
            <form action={inviteMember} className="flex max-w-[400px] flex-col gap-3">
              <input name="email" type="email" required placeholder="Their email — a sibling, a caregiver, an auntie" className={inputClass} />
              <select name="role" className={inputClass} defaultValue="member">
                <option value="member">Family member — sees and shares everything family-level</option>
                <option value="caregiver">Caregiver — logs visits and care, sees what you allow</option>
                <option value="viewer">Viewer — a quiet window, nothing more</option>
                <option value="care_recipient">The person themselves — simple check-ins</option>
              </select>
              <label className="flex items-center gap-2 text-[13px] text-ink-soft">
                <input type="checkbox" name="scopes" value="health" /> Allow health-level entries (for caregivers)
              </label>
              <SubmitButton>Send the invitation</SubmitButton>
            </form>
          </Chapter>

          <Chapter
            index={4}
            title="The first check-in — one gentle tap."
            doneLine="The first check-in landed. The family knows."
            done={state.checkin}
            active={state.member && !state.checkin}
          >
            {state.firstSubjectId && (
              <Link
                href={`/app/orbits/${state.firstSubjectId}/check-in`}
                className="lift inline-block rounded-pill bg-white px-5 py-2.5 text-[13.5px] font-semibold text-dusk no-underline hover:bg-dusk-ink"
              >
                Open {state.subjectName ? `${state.subjectName}'s` : "the"} check-in
              </Link>
            )}
          </Chapter>

          <Chapter
            index={5}
            title="The first duty — someone holds it."
            doneLine="The first duty has a name on it. Nothing falls through."
            done={state.duty}
            active={state.checkin && !state.duty}
          >
            {state.firstSubjectId && (
              <Link
                href={`/app/orbits/${state.firstSubjectId}#duties`}
                className="lift inline-block rounded-pill bg-white px-5 py-2.5 text-[13.5px] font-semibold text-dusk no-underline hover:bg-dusk-ink"
              >
                Create a duty
              </Link>
            )}
          </Chapter>
        </div>

        {state.inviteLink && !allDone && (
          <div className="mt-2 rounded-card border border-halo/25 bg-paper-2 p-4">
            <p className="text-[13px] text-ink-soft">
              The invitation also lives at this link — share it any way your family talks:
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <code className="break-all font-mono text-[11.5px] text-halo">{state.inviteLink}</code>
              <button
                type="button"
                className="rounded-pill border border-halo/40 px-3 py-1 font-mono text-[11px] text-ink hover:border-halo"
                onClick={() => {
                  navigator.clipboard?.writeText(state.inviteLink!).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  });
                }}
              >
                {copied ? "copied" : "copy"}
              </button>
            </div>
          </div>
        )}

        {allDone && (
          <div className="mt-4" style={{ animation: "reveal-up .7s ease both" }}>
            <p className="max-w-[46ch] text-[14.5px] leading-[1.6] text-ink-soft">
              From tonight, the evening gathers itself: check-ins, signals, duties, and at the
              day&apos;s end a brief in your family&apos;s words. The first one arrives with the morning.
            </p>
            <Link
              href="/app"
              className="lift mt-5 inline-block rounded-pill bg-white px-6 py-3 text-[14px] font-semibold text-dusk no-underline hover:bg-dusk-ink"
            >
              Step into the Orbit View
            </Link>
          </div>
        )}
      </div>

      {/* ——— the sky they're building ——— */}
      <div className="relative mx-auto hidden w-full max-w-[420px] lg:block" aria-hidden>
        <OrbitSystem size={400} satellites={buildSatellites(state)} assemble interactive={false} />
        <div className="pointer-events-none absolute inset-x-0 top-[56%] text-center">
          {state.subjectName && (
            <div className="font-serif text-[17px] font-light text-white">{state.subjectName}</div>
          )}
          {state.familyName && (
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-halo">
              {state.familyName}
            </div>
          )}
        </div>
        <p className="mt-3 text-center font-mono text-[10.5px] uppercase tracking-[0.18em] text-halo/80">
          {allDone ? "your family's sky — alive" : "your family's sky · it fills as you go"}
        </p>
      </div>
    </div>
  );
}
