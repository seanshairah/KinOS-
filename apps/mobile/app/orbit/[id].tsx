import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { api, ApiError, type OrbitDetail } from "@/lib/api";
import { useSession } from "@/lib/session";
import { NightSky } from "@/components/night-sky";
import { LoadingGlow, RetryNote } from "@/components/screen";
import {
  GhostButton,
  GlassCard,
  PrimaryButton,
  RoomTop,
  SectionLabel,
  StatusChip,
} from "@/components/ui";
import { T } from "@/lib/theme";

/**
 * A loved one's whole room, in the hand — the same care the web holds:
 * their state, the brief, what needs attention, medication you can
 * confirm, appointments you can own, open duties, the care plan, and
 * the emergency door. Everything acts; nothing is only shown.
 */
export default function OrbitDetailScreen() {
  const { token } = useSession();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const [detail, setDetail] = useState<OrbitDetail | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      setError(null);
      setDetail(await api.orbitDetail(token, id));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/sign-in");
        return;
      }
      setError(e instanceof ApiError ? e.message : "Couldn't reach the family space.");
    } finally {
      setRefreshing(false);
    }
  }, [token, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await fn();
      await load();
    } catch {
      await load();
    }
  };

  const tzTime = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <View style={{ flex: 1 }}>
      <NightSky density={22} />
      <RoomTop title={detail?.subject.name ?? name ?? "Orbit"} />
      <ScrollView
        contentContainerStyle={st.body}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={T.halo}
          />
        }
      >
        {detail === null && !error && <LoadingGlow />}
        {error && (
          <RetryNote
            text={error}
            onRetry={() => {
              setRefreshing(true);
              void load();
            }}
          />
        )}

        {detail && (
          <>
            {/* status + emergency door */}
            <View style={st.headRow}>
              <StatusChip status={detail.status} />
              <GhostButton
                label="Emergency"
                onPress={() =>
                  router.push({ pathname: "/emergency/[id]", params: { id: detail.subject.id, name: detail.subject.name } })
                }
              />
            </View>

            {/* the brief — a lit letter */}
            {detail.brief && (
              <GlassCard style={{ backgroundColor: "#FBF8F3" }}>
                <Text style={st.briefMeta}>DAILY BRIEF · {detail.brief.kind.toUpperCase()}</Text>
                <Text style={st.briefBody}>{detail.brief.body}</Text>
              </GlassCard>
            )}

            {/* attention */}
            {detail.attention.length > 0 && (
              <View style={{ gap: 10 }}>
                <SectionLabel>Attention needed</SectionLabel>
                {detail.attention.map((a) => (
                  <GlassCard key={a.id} glow={a.severity === "urgent" ? T.urgent : T.ember}>
                    <Text style={st.itemTitle}>{a.title}</Text>
                    {a.detail ? <Text style={st.itemMeta}>{a.detail}</Text> : null}
                  </GlassCard>
                ))}
              </View>
            )}

            {/* medication — confirm a dose */}
            {detail.medications.length > 0 && (
              <View style={{ gap: 10 }}>
                <SectionLabel>Medication today</SectionLabel>
                {detail.medications.map((m) => (
                  <GlassCard key={m.id}>
                    <View style={st.rowBetween}>
                      <View style={{ flex: 1 }}>
                        <Text style={st.itemTitle}>
                          {m.name}
                          {m.dose ? <Text style={st.itemMeta}> · {m.dose}</Text> : null}
                        </Text>
                        <Text style={st.itemMeta}>{m.times.join(" · ") || "as needed"}</Text>
                      </View>
                      {m.takenToday ? (
                        <View style={[st.doneChip]}>
                          <Text style={st.doneText}>taken ✓</Text>
                        </View>
                      ) : (
                        <PrimaryButton
                          label="Dose taken"
                          tone="calm"
                          onPress={() =>
                            void act(() => api.logDose(token!, m.id, detail.subject.id))
                          }
                        />
                      )}
                    </View>
                  </GlassCard>
                ))}
              </View>
            )}

            {/* appointments — own the transport */}
            {detail.appointments.length > 0 && (
              <View style={{ gap: 10 }}>
                <SectionLabel>Appointments</SectionLabel>
                {detail.appointments.map((a) => (
                  <GlassCard key={a.id}>
                    <Text style={st.itemTitle}>{a.title}</Text>
                    <Text style={st.itemMeta}>
                      {tzTime(a.startsAt)}
                      {a.location ? ` · ${a.location}` : ""}
                    </Text>
                    {a.transportConfirmed ? (
                      <Text style={[st.itemMeta, { color: T.calm }]}>
                        transport ✓ {a.transportOwnerName ?? ""}
                      </Text>
                    ) : (
                      <PrimaryButton
                        label="I'll handle transport"
                        tone="ember"
                        onPress={() => void act(() => api.confirmTransport(token!, a.id))}
                      />
                    )}
                  </GlassCard>
                ))}
              </View>
            )}

            {/* duties */}
            {detail.duties.length > 0 && (
              <View style={{ gap: 10 }}>
                <SectionLabel>Duties</SectionLabel>
                {detail.duties.map((d) => (
                  <GlassCard key={d.id}>
                    <View style={st.rowBetween}>
                      <View style={{ flex: 1 }}>
                        <Text style={st.itemTitle}>{d.title}</Text>
                        <Text style={st.itemMeta}>
                          {d.ownerName ? `owner: ${d.ownerName}` : "unassigned"}
                          {d.status === "late" ? " · late" : ""}
                        </Text>
                      </View>
                      <PrimaryButton
                        label="Done"
                        tone="calm"
                        onPress={() => void act(() => api.actOnDuty(token!, d.id, "done"))}
                      />
                    </View>
                  </GlassCard>
                ))}
              </View>
            )}

            {/* the care plan */}
            {detail.carePlan &&
              (detail.carePlan.dailyRoutine ||
                detail.carePlan.dietaryNotes ||
                detail.carePlan.preferredPharmacy) && (
                <GlassCard glow={T.halo}>
                  <SectionLabel>The plan for {detail.subject.name}</SectionLabel>
                  {detail.carePlan.dailyRoutine ? (
                    <Text style={st.planLine}>{detail.carePlan.dailyRoutine}</Text>
                  ) : null}
                  {detail.carePlan.dietaryNotes ? (
                    <Text style={st.planLine}>Food: {detail.carePlan.dietaryNotes}</Text>
                  ) : null}
                  {detail.carePlan.mobilityNotes ? (
                    <Text style={st.planLine}>Moving about: {detail.carePlan.mobilityNotes}</Text>
                  ) : null}
                  {detail.carePlan.preferredPharmacy ? (
                    <Text style={st.itemMeta}>
                      Pharmacy: {detail.carePlan.preferredPharmacy}
                      {detail.carePlan.doctorName ? ` · Dr ${detail.carePlan.doctorName}` : ""}
                    </Text>
                  ) : null}
                </GlassCard>
              )}

            {/* check-in shortcut */}
            <PrimaryButton
              label={`Check in for ${detail.subject.name}`}
              onPress={() =>
                router.push({
                  pathname: "/check-in",
                  params: { subjectId: detail.subject.id, name: detail.subject.name },
                })
              }
            />

            {/* the story — recent signals */}
            {detail.signals.length > 0 && (
              <View style={{ gap: 8, marginTop: 6 }}>
                <SectionLabel>Life Signals</SectionLabel>
                {detail.signals.map((sig) => (
                  <View key={sig.id} style={st.signalRow}>
                    <View style={st.signalDot} />
                    <Text style={st.signalTime}>{tzTime(sig.occurredAt)}</Text>
                    <Text style={st.signalText}>{describeSignal(sig)}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function describeSignal(sig: { type: string; value: Record<string, unknown> | null }): string {
  const v = sig.value ?? {};
  switch (sig.type) {
    case "checkin":
      return `Check-in — feeling ${String(v.mood ?? "okay")}`;
    case "medication_dose":
      return `Medication ${String(v.status ?? "logged")}`;
    case "wellness_check":
      return typeof v.summary === "string" ? v.summary : "Shared a wellness check";
    case "expense":
      return `Receipt · ${String(v.currency ?? "USD")} ${String(v.amount ?? "")}`;
    case "caregiver_visit":
      return "Caregiver visit logged";
    case "duty_update":
      return typeof v.title === "string" ? `Duty — ${v.title}` : "A duty moved forward";
    default:
      return sig.type.replace(/_/g, " ");
  }
}

const st = StyleSheet.create({
  body: { padding: 22, paddingBottom: 130, gap: 16 },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  briefMeta: { fontFamily: T.mono, fontSize: 10, letterSpacing: 1.5, color: "#8a7a5a" },
  briefBody: { fontFamily: T.serifLight, fontSize: 17, lineHeight: 26, color: "#211d19" },
  itemTitle: { fontFamily: T.sansSemi, fontSize: 15, color: T.duskInk, lineHeight: 21 },
  itemMeta: { fontFamily: T.mono, fontSize: 11, color: "#a5a2c8", marginTop: 3 },
  rowBetween: { flexDirection: "row", alignItems: "center", gap: 12 },
  doneChip: {
    borderColor: T.calm + "88",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  doneText: { color: T.calm, fontFamily: T.mono, fontSize: 11 },
  planLine: { fontFamily: T.sans, fontSize: 13.5, lineHeight: 20, color: "#c9c6e4" },
  signalRow: { flexDirection: "row", alignItems: "baseline", gap: 9, paddingVertical: 5 },
  signalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.halo,
    alignSelf: "center",
  },
  signalTime: { fontFamily: T.mono, fontSize: 10.5, color: "#8d89b8", width: 74 },
  signalText: { flex: 1, fontFamily: T.sans, fontSize: 13, color: T.duskInk, lineHeight: 18 },
});
