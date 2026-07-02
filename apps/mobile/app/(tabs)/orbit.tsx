import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api, ApiError, type Orbit } from "@/lib/api";
import { useSession } from "@/lib/session";
import { EmptyNote, Screen } from "@/components/screen";
import { T } from "@/lib/theme";

const STATUS: Record<Orbit["status"], { color: string; word: string }> = {
  steady: { color: T.calm, word: "Steady" },
  attention: { color: T.ember, word: "Attention" },
  urgent: { color: T.urgent, word: "Urgent" },
};

function timeAgo(iso: string | null): string {
  if (!iso) return "no check-in yet";
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `checked in ${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `checked in ${hours}h ago`;
  return `checked in ${Math.round(hours / 24)}d ago`;
}

export default function OrbitScreen() {
  const { token, signOut } = useSession();
  const [orbits, setOrbits] = useState<Orbit[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      const res = await api.orbits(token);
      setOrbits(res.orbits);
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

  return (
    <Screen
      title="Orbit View"
      sub="The people you love, at a glance."
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
      {(orbits ?? []).map((o) => {
        const st = STATUS[o.status];
        return (
          <View key={o.subjectId} style={s.card}>
            <View style={s.cardTop}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{o.name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{o.name}</Text>
                <Text style={s.meta}>
                  {timeAgo(o.lastCheckin)}
                  {o.lastCheckinMood ? ` · ${o.lastCheckinMood}` : ""}
                </Text>
              </View>
              <View style={[s.statusPill, { borderColor: st.color }]}>
                <View style={[s.statusDot, { backgroundColor: st.color }]} />
                <Text style={[s.statusWord, { color: st.color }]}>{st.word}</Text>
              </View>
            </View>

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

            <Pressable
              style={s.checkinButton}
              onPress={() =>
                router.push({
                  pathname: "/check-in",
                  params: { subjectId: o.subjectId, name: o.name },
                })
              }
            >
              <Text style={s.checkinText}>Check in for {o.name}</Text>
            </Pressable>
          </View>
        );
      })}
    </Screen>
  );
}

const s = StyleSheet.create({
  error: { color: T.inkSoft, fontSize: 13.5 },
  card: {
    backgroundColor: T.paper3,
    borderColor: T.line,
    borderWidth: 1,
    borderRadius: T.r.lg,
    padding: 16,
    gap: 12,
    shadowColor: T.ink,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.dusk,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: T.paper3, fontFamily: T.serif, fontSize: 19 },
  name: { fontFamily: T.serif, fontSize: 19, color: T.ink },
  meta: { color: T.inkFaint, fontSize: 12.5, marginTop: 2, fontFamily: T.mono },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: T.r.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusWord: { fontSize: 11.5, fontWeight: "600" },
  appt: { color: T.inkSoft, fontSize: 13, fontFamily: T.mono },
  checkinButton: {
    backgroundColor: T.dusk,
    borderRadius: T.r.pill,
    paddingVertical: 13,
    alignItems: "center",
  },
  checkinText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
