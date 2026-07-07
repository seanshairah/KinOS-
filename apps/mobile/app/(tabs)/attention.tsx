import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { api, ApiError, type AttentionItem } from "@/lib/api";
import { useSession } from "@/lib/session";
import { EmptyNote, LoadingGlow, RetryNote, Screen } from "@/components/screen";
import { T } from "@/lib/theme";

/** One thing, one owner — an ember in the night, never a siren. */
export default function AttentionScreen() {
  const { token, signOut } = useSession();
  const [items, setItems] = useState<AttentionItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      const res = await api.attention(token);
      setItems(res.attention);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await signOut();
        router.replace("/sign-in");
        return;
      }
      setError(e instanceof ApiError ? e.message : "Couldn't reach the family space.");
    } finally {
      setRefreshing(false);
    }
  }, [token, signOut]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, mode: "resolved" | "snoozed") => {
    if (!token) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setItems((cur) => (cur ? cur.filter((i) => i.id !== id) : cur));
    try {
      await api.actOnAttention(token, id, mode);
      if (mode === "resolved") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      void load(); // put it back if the server disagreed
    }
  };

  return (
    <Screen
      title="Attention Needed"
      sub="Ember only ever means attention."
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load();
      }}
    >
      {items === null && !error && <LoadingGlow />}
      {error && (
        <RetryNote
          text={error}
          onRetry={() => {
            setRefreshing(true);
            void load();
          }}
        />
      )}
      {items && items.length === 0 && (
        <EmptyNote text={"Nothing needs attention right now.\nThe sky stays warm and quiet."} />
      )}
      {(items ?? []).map((a) => {
        const color = a.severity === "urgent" ? T.urgent : T.ember;
        return (
          <View
            key={a.id}
            style={[
              s.card,
              { borderColor: color, shadowColor: color },
            ]}
          >
            <View style={s.row}>
              <View
                style={[
                  s.dot,
                  { backgroundColor: color, shadowColor: color },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{a.title}</Text>
                {a.detail && <Text style={s.detail}>{a.detail}</Text>}
                <Text style={s.meta}>for {a.subjectName}</Text>
              </View>
            </View>
            <View style={s.actions}>
              <Pressable
                style={({ pressed }) => [s.primary, pressed && { opacity: 0.85 }]}
                onPress={() => void act(a.id, "resolved")}
              >
                <Text style={s.primaryText}>Handled</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [s.ghost, pressed && { opacity: 0.7 }]}
                onPress={() => void act(a.id, "snoozed")}
              >
                <Text style={s.ghostText}>Later today</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </Screen>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "rgba(254,252,249,0.06)",
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 17,
    gap: 15,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  title: {
    fontSize: 17,
    fontFamily: T.sansSemi,
    color: T.duskInk,
    lineHeight: 23,
  },
  detail: { fontSize: 13.5, color: "#c9c6e4", marginTop: 4, lineHeight: 19, fontFamily: T.sans },
  meta: { fontFamily: T.mono, fontSize: 11, color: T.halo, marginTop: 7 },
  actions: { flexDirection: "row", gap: 10 },
  primary: {
    flex: 1,
    backgroundColor: T.paper3,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryText: { color: T.dusk, fontFamily: T.sansSemi, fontSize: 14 },
  ghost: {
    flex: 1,
    borderColor: "rgba(169,167,224,0.4)",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  ghostText: { color: "#c9c6e4", fontFamily: T.sansSemi, fontSize: 14 },
});
