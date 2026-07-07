import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { api, ApiError, type Duty } from "@/lib/api";
import { useSession } from "@/lib/session";
import { NightSky } from "@/components/night-sky";
import { EmptyNote, LoadingGlow, RetryNote } from "@/components/screen";
import { GlassCard, PrimaryButton, RoomTop } from "@/components/ui";
import { T } from "@/lib/theme";

/** Every open hand in the family — take one on, or mark it done. */
export default function DutiesScreen() {
  const { token } = useSession();
  const [duties, setDuties] = useState<Duty[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      setDuties((await api.duties(token)).duties);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return router.replace("/sign-in");
      setError(e instanceof ApiError ? e.message : "Couldn't reach the family space.");
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, action: "done" | "mine") => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDuties((cur) => (cur && action === "done" ? cur.filter((d) => d.id !== id) : cur));
    try {
      await api.actOnDuty(token!, id, action);
      await load();
    } catch {
      await load();
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <NightSky density={22} />
      <RoomTop title="Duties" sub="The family's open hands. One tap takes one on." />
      <ScrollView
        contentContainerStyle={st.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={T.halo} />
        }
      >
        {duties === null && !error && <LoadingGlow />}
        {error && <RetryNote text={error} onRetry={() => { setRefreshing(true); void load(); }} />}
        {duties && duties.length === 0 && (
          <EmptyNote text={"Nothing open. Calm is allowed."} />
        )}
        {(duties ?? []).map((d) => (
          <GlassCard key={d.id} glow={d.status === "late" ? T.ember : undefined}>
            <Text style={st.title}>{d.title}</Text>
            <Text style={st.meta}>
              for {d.subjectName}
              {d.ownerName ? ` · ${d.ownerName}` : " · unassigned"}
              {d.status === "late" ? " · late" : ""}
            </Text>
            <View style={st.row}>
              <View style={{ flex: 1 }}>
                <PrimaryButton label="Done" tone="calm" onPress={() => void act(d.id, "done")} />
              </View>
              {!d.ownerName && (
                <View style={{ flex: 1 }}>
                  <PrimaryButton label="I'll take it" onPress={() => void act(d.id, "mine")} />
                </View>
              )}
            </View>
          </GlassCard>
        ))}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  body: { padding: 22, paddingBottom: 130, gap: 13 },
  title: { fontFamily: T.sansSemi, fontSize: 15.5, color: T.duskInk, lineHeight: 21 },
  meta: { fontFamily: T.mono, fontSize: 11, color: "#a5a2c8" },
  row: { flexDirection: "row", gap: 10, marginTop: 2 },
});
