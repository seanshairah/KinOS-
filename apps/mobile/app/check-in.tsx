import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { MOODS, T, type MoodKey } from "@/lib/theme";

/**
 * The one-tap check-in — big type, four honest answers, done.
 * Supported like family, never watched like a patient.
 */
export default function CheckIn() {
  const { token } = useSession();
  const params = useLocalSearchParams<{ subjectId: string; name: string }>();
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!token || !params.subjectId || !mood) return;
    setBusy(true);
    setError(null);
    try {
      await api.checkIn(token, params.subjectId, {
        mood,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setDone(true);
      setTimeout(() => router.back(), 1600);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't reach KinOS — try again.");
      setBusy(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={[s.safe, s.doneWrap]}>
        <View style={s.calmDot} />
        <Text style={s.doneTitle}>The family knows.</Text>
        <Text style={s.doneSub}>Nothing else is needed from you.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.body}>
        <Text style={s.kicker}>CHECK IN</Text>
        <Text style={s.title}>How is {params.name ?? "your person"} today?</Text>

        <View style={{ gap: 10, marginTop: 22 }}>
          {MOODS.map((m) => {
            const on = mood === m.key;
            return (
              <Pressable
                key={m.key}
                style={[s.mood, on && s.moodOn]}
                onPress={() => setMood(m.key)}
              >
                <Text style={[s.moodLabel, on && s.moodLabelOn]}>{m.label}</Text>
                <Text style={[s.moodHint, on && s.moodHintOn]}>{m.hint}</Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          style={s.note}
          value={note}
          onChangeText={setNote}
          placeholder="Anything worth mentioning? (optional)"
          placeholderTextColor={T.inkFaint}
          multiline
        />

        {error && <Text style={s.error}>{error}</Text>}

        <Pressable
          style={[s.submit, (!mood || busy) && { opacity: 0.5 }]}
          disabled={!mood || busy}
          onPress={submit}
        >
          <Text style={s.submitText}>{busy ? "One moment…" : "Tell the family"}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text style={s.cancel}>Not now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  body: { flex: 1, padding: 24 },
  kicker: { fontFamily: T.mono, fontSize: 11, letterSpacing: 2.5, color: T.dusk2 },
  title: { fontFamily: T.serif, fontSize: 30, lineHeight: 37, color: T.ink, marginTop: 10 },
  mood: {
    backgroundColor: T.paper3,
    borderColor: T.line2,
    borderWidth: 1.5,
    borderRadius: T.r.lg,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  moodOn: { borderColor: T.dusk2, backgroundColor: T.dusk },
  moodLabel: { fontSize: 20, fontFamily: T.serif, color: T.ink },
  moodLabelOn: { color: T.paper3 },
  moodHint: { fontSize: 13, color: T.inkFaint, marginTop: 2 },
  moodHintOn: { color: T.halo },
  note: {
    backgroundColor: T.paper3,
    borderColor: T.line,
    borderWidth: 1,
    borderRadius: T.r.card,
    color: T.ink,
    fontSize: 15,
    padding: 14,
    minHeight: 74,
    marginTop: 16,
    textAlignVertical: "top",
  },
  error: { color: T.urgent, marginTop: 12, fontSize: 13.5 },
  submit: {
    backgroundColor: T.dusk,
    borderRadius: T.r.pill,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 18,
  },
  submitText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  cancel: { textAlign: "center", color: T.inkSoft, marginTop: 16, fontSize: 15 },
  doneWrap: { alignItems: "center", justifyContent: "center", gap: 14 },
  calmDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: T.calm,
    shadowColor: T.calm,
    shadowOpacity: 0.7,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  doneTitle: { fontFamily: T.serif, fontSize: 30, color: T.ink },
  doneSub: { color: T.inkSoft, fontSize: 15 },
});
