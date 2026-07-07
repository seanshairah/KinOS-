import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { api, ApiError, type Me, type Orbit } from "@/lib/api";
import { useSession } from "@/lib/session";
import { OrbitLive } from "@/components/orbit-live";
import { EmptyNote, Screen } from "@/components/screen";
import { greeting, T } from "@/lib/theme";

/**
 * Home is not a dashboard — it's the family's sky tonight. The orbit
 * breathes at the top; beneath it, the one sentence that matters, and
 * a lamplight for each person you might light right now.
 */

function timeAgo(iso: string | null): string {
  if (!iso) return "no check-in yet";
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function OrbitScreen() {
  const { token, signOut } = useSession();
  const [orbits, setOrbits] = useState<Orbit[] | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      const [orbitsRes, meRes] = await Promise.all([api.orbits(token), api.me(token)]);
      setOrbits(orbitsRes.orbits);
      setMe(meRes);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await signOut();
        router.replace("/sign-in");
        return;
      }
      setError("Couldn't reach the family space — pull to retry.");
    } finally {
      setRefreshing(false);
    }
  }, [token, signOut]);

  useEffect(() => {
    void load();
  }, [load]);

  const attentionCount = (orbits ?? []).reduce((n, o) => n + o.openAttention, 0);
  const firstName = me?.member?.displayName?.split(" ")[0];

  return (
    <Screen
      title={firstName ? `${greeting()}, ${firstName}` : greeting()}
      sub={
        orbits === null
          ? "Opening the family's sky…"
          : attentionCount === 0
            ? "Nothing needs you right now — the sky is calm."
            : attentionCount === 1
              ? "One thing quietly needs someone."
              : `${attentionCount} things quietly need someone.`
      }
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load();
      }}
    >
      {error && <Text style={s.error}>{error}</Text>}

      {orbits && orbits.length === 0 && (
        <EmptyNote text={"No orbits yet.\nStart your family space on the web — this app joins it."} />
      )}

      {orbits && orbits.length > 0 && (
        <>
          <View style={{ alignItems: "center", marginTop: -6 }}>
            <OrbitLive orbits={orbits} />
          </View>

          {orbits.map((o) => (
            <Pressable
              key={o.subjectId}
              style={({ pressed }) => [s.card, pressed && { opacity: 0.9 }]}
              onPress={async () => {
                await Haptics.selectionAsync();
                router.push({ pathname: "/orbit/[id]", params: { id: o.subjectId, name: o.name } });
              }}
            >
              <View style={s.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{o.name}</Text>
                  <Text style={s.meta}>
                    {o.lastCheckin
                      ? `checked in ${timeAgo(o.lastCheckin)}${o.lastCheckinMood ? ` · ${o.lastCheckinMood}` : ""}`
                      : "no check-in yet today"}
                  </Text>
                  {o.nextAppointment && (
                    <Text style={s.appt}>
                      {o.nextAppointment.title} ·{" "}
                      {new Date(o.nextAppointment.starts_at).toLocaleDateString(undefined, {
                        weekday: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {o.nextAppointment.transport_confirmed ? " · transport ✓" : " · transport open"}
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    s.statusDot,
                    {
                      backgroundColor:
                        o.status === "steady" ? T.calm : o.status === "attention" ? T.ember : T.urgent,
                      shadowColor:
                        o.status === "steady" ? T.calm : o.status === "attention" ? T.ember : T.urgent,
                    },
                  ]}
                />
              </View>
              <View style={s.cardActions}>
                <Pressable
                  style={({ pressed }) => [s.checkin, pressed && { opacity: 0.85 }]}
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({
                      pathname: "/check-in",
                      params: { subjectId: o.subjectId, name: o.name },
                    });
                  }}
                >
                  <View style={s.checkinGlow} />
                  <Text style={s.checkinText}>Check in</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [s.open, pressed && { opacity: 0.7 }]}
                  onPress={async () => {
                    await Haptics.selectionAsync();
                    router.push({ pathname: "/orbit/[id]", params: { id: o.subjectId, name: o.name } });
                  }}
                >
                  <Text style={s.openText}>Open orbit →</Text>
                </Pressable>
              </View>
            </Pressable>
          ))}
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  error: { color: "#c9c6e4", fontSize: 13.5, fontFamily: T.sans },
  card: {
    backgroundColor: "rgba(254,252,249,0.06)",
    borderColor: "rgba(169,167,224,0.22)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 17,
    gap: 13,
  },
  cardRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  name: { fontFamily: T.serif, fontSize: 22, color: T.duskInk, letterSpacing: -0.2 },
  meta: { color: T.halo, fontSize: 11.5, marginTop: 3, fontFamily: T.mono },
  appt: { color: "#c9c6e4", fontSize: 12, marginTop: 7, fontFamily: T.mono },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 8,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  checkin: {
    flex: 1,
    backgroundColor: T.paper3,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: T.halo,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  checkinGlow: {
    position: "absolute",
    top: -22,
    width: 90,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(169,167,224,0.25)",
  },
  checkinText: { color: T.dusk, fontSize: 15, fontFamily: T.sansSemi },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  open: { paddingVertical: 12, paddingHorizontal: 4 },
  openText: { color: T.halo, fontSize: 13.5, fontFamily: T.sansSemi },
});
