import { useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { NightSky } from "@/components/night-sky";
import { MOODS, T, type MoodKey } from "@/lib/theme";

/**
 * The check-in — touching a light. Four moods as glowing orbs; choosing
 * one is a small act of light, and telling the family releases a ring
 * of it. The reward is the truth: "The family knows."
 */
export default function CheckIn() {
  const { token } = useSession();
  const params = useLocalSearchParams<{ subjectId: string; name: string }>();
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  const choose = async (key: MoodKey) => {
    setMood(key);
    await Haptics.selectionAsync();
  };

  const submit = async () => {
    if (!token || !params.subjectId || !mood) return;
    setBusy(true);
    setError(null);
    try {
      await api.checkIn(token, params.subjectId, {
        mood,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
      // a ring of light joins the orbit
      ringOpacity.setValue(0.85);
      Animated.parallel([
        Animated.timing(ringScale, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0,
          duration: 1400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
      setTimeout(() => router.back(), 2100);
    } catch (e) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof ApiError ? e.message : "Couldn't reach KinOS — try again.");
      setBusy(false);
    }
  };

  if (done) {
    const scale = ringScale.interpolate({ inputRange: [0, 1], outputRange: [0.3, 3.4] });
    return (
      <View style={{ flex: 1 }}>
        <NightSky />
        <SafeAreaView style={[s.safe, s.doneWrap]}>
          <View style={s.doneStage}>
            <Animated.View
              style={[s.doneRing, { opacity: ringOpacity, transform: [{ scale }] }]}
            />
            <View style={s.doneDot} />
          </View>
          <Text style={s.doneTitle}>The family knows.</Text>
          <Text style={s.doneSub}>Nothing else is needed from you.</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <NightSky />
      <SafeAreaView style={s.safe}>
        <View style={s.body}>
          <Text style={s.kicker}>CHECK IN</Text>
          <Text style={s.title}>How is {params.name ?? "your person"} today?</Text>

          <View style={{ gap: 11, marginTop: 24 }}>
            {MOODS.map((m) => {
              const on = mood === m.key;
              return (
                <Pressable
                  key={m.key}
                  style={[
                    s.mood,
                    on && {
                      borderColor: m.color,
                      backgroundColor: "rgba(254,252,249,0.1)",
                      shadowColor: m.color,
                      shadowOpacity: 0.55,
                      shadowRadius: 16,
                      shadowOffset: { width: 0, height: 0 },
                      elevation: 8,
                    },
                  ]}
                  onPress={() => void choose(m.key)}
                >
                  <View
                    style={[
                      s.moodLight,
                      {
                        backgroundColor: m.color,
                        opacity: on ? 1 : 0.45,
                        shadowColor: m.color,
                        shadowOpacity: on ? 0.95 : 0,
                        shadowRadius: 9,
                        shadowOffset: { width: 0, height: 0 },
                        elevation: on ? 6 : 0,
                      },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.moodLabel, on && { color: "#fff" }]}>{m.label}</Text>
                    <Text style={s.moodHint}>{m.hint}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            style={s.note}
            value={note}
            onChangeText={setNote}
            placeholder="Anything worth mentioning? (optional)"
            placeholderTextColor="rgba(169,167,224,.55)"
            multiline
          />

          {error && <Text style={s.error}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [s.submit, (!mood || busy || pressed) && { opacity: 0.6 }]}
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
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, padding: 24, justifyContent: "center" },
  kicker: { fontFamily: T.mono, fontSize: 10.5, letterSpacing: 2.6, color: T.halo },
  title: {
    fontFamily: T.serifLight,
    fontSize: 32,
    lineHeight: 39,
    color: T.duskInk,
    marginTop: 10,
    letterSpacing: -0.3,
  },
  mood: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(254,252,249,0.05)",
    borderColor: "rgba(169,167,224,0.25)",
    borderWidth: 1.5,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  moodLight: { width: 14, height: 14, borderRadius: 7 },
  moodLabel: { fontSize: 20, fontFamily: T.serif, color: T.duskInk },
  moodHint: { fontSize: 12.5, color: "#a8a4cb", marginTop: 2, fontFamily: T.sans },
  note: {
    backgroundColor: "rgba(254,252,249,0.05)",
    borderColor: "rgba(169,167,224,0.25)",
    borderWidth: 1,
    borderRadius: 14,
    color: T.duskInk,
    fontFamily: T.sans,
    fontSize: 15,
    padding: 14,
    minHeight: 70,
    marginTop: 16,
    textAlignVertical: "top",
  },
  error: { color: "#e8b39a", marginTop: 12, fontSize: 13.5, fontFamily: T.sans },
  submit: {
    backgroundColor: T.paper3,
    borderRadius: 999,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 18,
    shadowColor: T.halo,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  submitText: { color: T.dusk, fontSize: 17, fontFamily: T.sansSemi },
  cancel: {
    textAlign: "center",
    color: "#a8a4cb",
    marginTop: 16,
    fontSize: 15,
    fontFamily: T.sans,
  },
  doneWrap: { alignItems: "center", justifyContent: "center", gap: 16 },
  doneStage: { width: 140, height: 140, alignItems: "center", justifyContent: "center" },
  doneRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: T.calm,
  },
  doneDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: T.calm,
    shadowColor: T.calm,
    shadowOpacity: 0.9,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  doneTitle: { fontFamily: T.serifLight, fontSize: 33, color: T.duskInk, letterSpacing: -0.3 },
  doneSub: { color: "#c9c6e4", fontSize: 15, fontFamily: T.sans },
});
