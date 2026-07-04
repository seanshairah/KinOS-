import { notFound } from "next/navigation";
import { withUser } from "@kinos/db";
import { Eyebrow, OrbitAvatar } from "@kinos/ui";
import { OfflineCheckinForm } from "@/components/offline-checkin-form";
import { requireFamilyContext } from "@/lib/data/context";
import { getT } from "@/lib/i18n";

/**
 * The check-in — dead simple by design, sized for elderly hands.
 * Four big moods, one optional note, done. The form itself is resilient to
 * a dropped connection: tapped without signal, the check-in is held on the
 * device and sent the moment the connection returns.
 */

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireFamilyContext();
  const subject = await withUser(ctx.userId, async (db) => {
    const res = await db.query(`select * from care_subject where id = $1`, [id]);
    return res.rows[0] ?? null;
  });
  if (!subject) notFound();

  const { t } = await getT();

  return (
    <div className="mx-auto max-w-[560px]">
      <div className="flex items-center gap-4">
        <OrbitAvatar name={subject.display_name} size={52} />
        <div>
          <Eyebrow>{t("checkin.title")}</Eyebrow>
          <h1 className="mt-1 font-serif text-[30px] font-light leading-tight">
            {t("checkin.how", { name: subject.display_name })}
          </h1>
        </div>
      </div>

      <OfflineCheckinForm
        subjectId={subject.id}
        subjectName={subject.display_name}
        labels={{
          moodGood: t("mood.good"),
          moodOkay: t("mood.okay"),
          moodLow: t("mood.low"),
          moodUnwell: t("mood.unwell"),
          eatenQ: t("eaten.q"),
          eatenYes: t("eaten.yes"),
          eatenNo: t("eaten.no"),
          notePrompt: t("note.prompt"),
          notePlaceholder: t("note.placeholder"),
          send: t("checkin.send"),
          sending: t("checkin.sending"),
          saved: t("checkin.saved"),
          offlineNote: t("checkin.offlineNote"),
          pick: t("checkin.pick"),
          cantHold: t("checkin.cantHold"),
          didntSend: t("checkin.didntSend"),
        }}
      />
    </div>
  );
}
