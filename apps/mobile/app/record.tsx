import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api, ApiError, type RecordItem } from "@/lib/api";
import { useSession } from "@/lib/session";
import { NightSky } from "@/components/night-sky";
import { EmptyNote, LoadingGlow, RetryNote } from "@/components/screen";
import { RoomTop } from "@/components/ui";
import { T } from "@/lib/theme";

/** The family's memory, searchable in plain words. */
export default function RecordScreen() {
  const { token } = useSession();
  const [items, setItems] = useState<RecordItem[] | null>(null);
  const [q, setQ] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (query?: string) => {
      if (!token) return;
      try {
        setError(null);
        setItems((await api.record(token, query)).items);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return router.replace("/sign-in");
        setError(e instanceof ApiError ? e.message : "Couldn't reach the family space.");
      } finally {
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const KIND_COLOR: Record<string, string> = {
    note: "#a5a2c8",
    decision: T.halo,
    incident: T.ember,
    question: "#a5a2c8",
    document: "#a5a2c8",
    summary: "#a5a2c8",
  };

  return (
    <View style={{ flex: 1 }}>
      <NightSky density={22} />
      <RoomTop title="Family Record" sub="The memory that doesn't fade." />
      <ScrollView
        contentContainerStyle={st.body}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(q); }} tintColor={T.halo} />
        }
      >
        <TextInput
          style={st.search}
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => void load(q)}
          returnKeyType="search"
          placeholder="Search — 'pharmacy', 'dizziness', 'transport'…"
          placeholderTextColor="rgba(169,167,224,.5)"
        />
        {items === null && !error && <LoadingGlow />}
        {error && <RetryNote text={error} onRetry={() => { setRefreshing(true); void load(q); }} />}
        {items && items.length === 0 && (
          <EmptyNote text={q ? "Nothing matches that." : "The record is ready for its first entry."} />
        )}
        <View style={st.thread}>
          {(items ?? []).map((it) => (
            <View key={it.id} style={st.item}>
              <View style={[st.kindDot, { backgroundColor: KIND_COLOR[it.kind] ?? "#a5a2c8" }]} />
              <View style={{ flex: 1 }}>
                <Text style={st.kind}>
                  {it.kind} · {it.subjectName} · {new Date(it.at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                </Text>
                <Text style={st.title}>{it.title}</Text>
                {it.body ? <Text style={st.itemBody}>{it.body}</Text> : null}
                {it.authorName ? <Text style={st.author}>kept by {it.authorName}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  body: { padding: 22, paddingBottom: 130, gap: 14 },
  search: {
    backgroundColor: "rgba(254,252,249,0.07)",
    borderColor: "rgba(169,167,224,0.35)",
    borderWidth: 1,
    borderRadius: 14,
    color: T.duskInk,
    fontFamily: T.sans,
    fontSize: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  thread: { gap: 18 },
  item: { flexDirection: "row", gap: 12 },
  kindDot: { width: 7, height: 7, borderRadius: 4, marginTop: 6 },
  kind: { fontFamily: T.mono, fontSize: 10, color: "#8d89b8", letterSpacing: 0.5 },
  title: { fontFamily: T.serif, fontSize: 17, color: T.duskInk, marginTop: 3, lineHeight: 23 },
  itemBody: { fontFamily: T.sans, fontSize: 13, color: "#c9c6e4", marginTop: 4, lineHeight: 19 },
  author: { fontFamily: T.mono, fontSize: 10, color: "#8d89b8", marginTop: 5 },
});
