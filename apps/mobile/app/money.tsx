import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import { api, ApiError, type MoneyEntry, type MoneyPot } from "@/lib/api";
import { useSession } from "@/lib/session";
import { NightSky } from "@/components/night-sky";
import { EmptyNote, LoadingGlow, RetryNote } from "@/components/screen";
import { GlassCard, PrimaryButton, RoomTop, SectionLabel } from "@/components/ui";
import { T } from "@/lib/theme";

/** Care money with memory and proof — the balance, the flow, and a way in. */
export default function MoneyScreen() {
  const { token } = useSession();
  const [pots, setPots] = useState<MoneyPot[] | null>(null);
  const [entries, setEntries] = useState<MoneyEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busyPot, setBusyPot] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      const res = await api.money(token);
      setPots(res.pots);
      setEntries(res.entries);
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

  const add = async (potId: string, kind: "contribution" | "expense") => {
    const value = Number(amount);
    if (!value || value <= 0) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBusyPot(potId);
    try {
      await api.addMoney(token!, { potId, kind, amount: value, note: note.trim() || undefined });
      setAmount("");
      setNote("");
      await load();
    } catch {
      await load();
    } finally {
      setBusyPot(null);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <NightSky density={22} />
      <RoomTop title="Money Pot" sub="Care money with memory and proof." />
      <ScrollView
        contentContainerStyle={st.body}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={T.halo} />
        }
      >
        {pots === null && !error && <LoadingGlow />}
        {error && <RetryNote text={error} onRetry={() => { setRefreshing(true); void load(); }} />}
        {pots && pots.length === 0 && (
          <EmptyNote text={"No care fund yet.\nStart one on the web to track contributions and receipts."} />
        )}

        {(pots ?? []).map((p) => (
          <GlassCard key={p.id} glow={T.halo}>
            <Text style={st.potName}>{p.name}{p.subjectName ? ` · ${p.subjectName}` : ""}</Text>
            <Text style={st.balance}>
              {p.currency} {p.balance.toFixed(2)}
              <Text style={st.balanceLabel}> available</Text>
            </Text>
            <TextInput
              style={st.input}
              value={busyPot === null ? amount : amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder={`Amount in ${p.currency}`}
              placeholderTextColor="rgba(169,167,224,.5)"
            />
            <TextInput
              style={st.input}
              value={note}
              onChangeText={setNote}
              placeholder="What for? (optional)"
              placeholderTextColor="rgba(169,167,224,.5)"
            />
            <View style={st.row}>
              <View style={{ flex: 1 }}>
                <PrimaryButton label="Add money" tone="calm" onPress={() => void add(p.id, "contribution")} />
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton label="Record spend" tone="ember" onPress={() => void add(p.id, "expense")} />
              </View>
            </View>
          </GlassCard>
        ))}

        {entries.length > 0 && (
          <View style={{ gap: 8, marginTop: 6 }}>
            <SectionLabel>The flow</SectionLabel>
            {entries.map((e) => (
              <View key={e.id} style={st.entryRow}>
                <View
                  style={[
                    st.entryDot,
                    { backgroundColor: e.kind === "contribution" ? T.calm : T.ember },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={st.entryText}>
                    {e.kind === "contribution" ? "+" : "−"} {e.currency} {e.amount.toFixed(2)}
                    {e.note ? ` · ${e.note}` : ""}
                  </Text>
                  <Text style={st.entryMeta}>
                    {e.memberName ?? "family"} · {new Date(e.at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                    {e.category && e.kind === "expense" ? ` · ${e.category}` : ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  body: { padding: 22, paddingBottom: 130, gap: 14 },
  potName: { fontFamily: T.mono, fontSize: 11, letterSpacing: 1, color: T.halo },
  balance: { fontFamily: T.serifLight, fontSize: 30, color: T.duskInk },
  balanceLabel: { fontFamily: T.sans, fontSize: 13, color: "#a5a2c8" },
  input: {
    backgroundColor: "rgba(254,252,249,0.07)",
    borderColor: "rgba(169,167,224,0.35)",
    borderWidth: 1,
    borderRadius: 14,
    color: T.duskInk,
    fontFamily: T.sans,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  row: { flexDirection: "row", gap: 10 },
  entryRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 5 },
  entryDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  entryText: { fontFamily: T.sans, fontSize: 14, color: T.duskInk, lineHeight: 19 },
  entryMeta: { fontFamily: T.mono, fontSize: 10.5, color: "#8d89b8", marginTop: 2 },
});
