import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api, type AttentionItem } from "@/lib/api";
import { useSession } from "@/lib/session";
import { EmptyNote, Screen } from "@/components/screen";
import { T } from "@/lib/theme";

/** One thing, one owner — never a wall of alerts. */
export default function AttentionScreen() {
  const { token } = useSession();
  const [items, setItems] = useState<AttentionItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.attention(token);
      setItems(res.attention);
    } catch {
      // pull-to-refresh retries
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, mode: "resolved" | "snoozed") => {
    if (!token) return;
    setItems((cur) => (cur ? cur.filter((i) => i.id !== id) : cur));
    try {
      await api.actOnAttention(token, id, mode);
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
      {items && items.length === 0 && (
        <EmptyNote text={"Nothing needs attention right now.\nThe screen stays warm and quiet."} />
      )}
      {(items ?? []).map((a) => (
        <View key={a.id} style={[s.card, a.severity === "urgent" && s.cardUrgent]}>
          <View style={s.row}>
            <View
              style={[
                s.dot,
                { backgroundColor: a.severity === "urgent" ? T.urgent : T.ember },
              ]}
            />
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{a.title}</Text>
              {a.detail && <Text style={s.detail}>{a.detail}</Text>}
              <Text style={s.meta}>for {a.subjectName}</Text>
            </View>
          </View>
          <View style={s.actions}>
            <Pressable style={s.primary} onPress={() => act(a.id, "resolved")}>
              <Text style={s.primaryText}>Handled</Text>
            </Pressable>
            <Pressable style={s.ghost} onPress={() => act(a.id, "snoozed")}>
              <Text style={s.ghostText}>Later today</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </Screen>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: T.paper3,
    borderColor: T.emberSoft,
    borderWidth: 1.5,
    borderRadius: T.r.lg,
    padding: 16,
    gap: 14,
  },
  cardUrgent: { borderColor: T.urgent },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 6 },
  title: { fontSize: 16.5, fontWeight: "600", color: T.ink, lineHeight: 22 },
  detail: { fontSize: 13.5, color: T.inkSoft, marginTop: 3, lineHeight: 19 },
  meta: { fontFamily: T.mono, fontSize: 11, color: T.inkFaint, marginTop: 6 },
  actions: { flexDirection: "row", gap: 10 },
  primary: {
    flex: 1,
    backgroundColor: T.dusk,
    borderRadius: T.r.pill,
    paddingVertical: 11,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  ghost: {
    flex: 1,
    borderColor: T.line2,
    borderWidth: 1,
    borderRadius: T.r.pill,
    paddingVertical: 11,
    alignItems: "center",
  },
  ghostText: { color: T.inkSoft, fontWeight: "600", fontSize: 14 },
});
