import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { api, type Brief } from "@/lib/api";
import { useSession } from "@/lib/session";
import { EmptyNote, Screen } from "@/components/screen";
import { T } from "@/lib/theme";

/** The letter from home — a lit window of paper in the night. */
export default function BriefScreen() {
  const { token } = useSession();
  const [briefs, setBriefs] = useState<Brief[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.briefs(token);
      setBriefs(res.briefs);
    } catch {
      // pull-to-refresh retries
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen
      title="Daily Brief"
      sub="The day, written calmly — read in thirty seconds."
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load();
      }}
    >
      {briefs && briefs.length === 0 && (
        <EmptyNote text={"No brief yet today.\nIt arrives like a letter — morning and evening."} />
      )}
      {(briefs ?? []).map((b) => (
        <View key={b.id} style={s.letter}>
          <Text style={s.meta}>
            {b.kind.toUpperCase()} · FOR {b.subjectName.toUpperCase()} ·{" "}
            {new Date(b.createdAt)
              .toLocaleDateString(undefined, { weekday: "long" })
              .toUpperCase()}
          </Text>
          <Text style={s.body}>{b.body}</Text>
          <Text style={s.footer}>kept forever in the Family Record</Text>
        </View>
      ))}
    </Screen>
  );
}

const s = StyleSheet.create({
  letter: {
    backgroundColor: T.paper3,
    borderRadius: 22,
    padding: 22,
    shadowColor: T.halo,
    shadowOpacity: 0.35,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  meta: { fontFamily: T.mono, fontSize: 10, letterSpacing: 1, color: T.inkFaint },
  body: {
    fontFamily: T.serif,
    fontSize: 19.5,
    lineHeight: 31,
    color: T.ink,
    marginTop: 13,
  },
  footer: {
    fontFamily: T.mono,
    fontSize: 10.5,
    color: T.inkFaint,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: T.line,
    paddingTop: 12,
  },
});
