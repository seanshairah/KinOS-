import { useState } from "react";
import { router } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { NightSky } from "@/components/night-sky";
import { T } from "@/lib/theme";

/**
 * The front door, at dusk. Your email, then the six digits it receives —
 * and you're standing inside the family's sky.
 */
export default function SignIn() {
  const { signIn } = useSession();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const requestCode = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await api.requestCode(email);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep("code");
      setMessage("Six digits are on their way to your email.");
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : "Couldn't reach KinOS — try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.verifyCode(email, code);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await signIn(res.sessionToken);
      router.replace("/(tabs)/orbit");
    } catch (e) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMessage(e instanceof ApiError ? e.message : "Couldn't reach KinOS — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <NightSky />
      <KeyboardAvoidingView
        style={s.body}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* the orbit mark, in miniature */}
        <View style={s.markWrap}>
          <View style={s.markRing} />
          <View style={s.markCore} />
        </View>
        <Text style={s.wordmark}>
          Kin<Text style={{ color: T.halo }}>OS</Text>
        </Text>
        <Text style={s.headline}>
          The people you love,{"\n"}in one calm orbit.
        </Text>

        {step === "email" ? (
          <>
            <Text style={s.label}>YOUR EMAIL</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@family.com"
              placeholderTextColor="rgba(169,167,224,.5)"
            />
            <Pressable
              style={({ pressed }) => [s.button, (busy || pressed) && s.buttonDim]}
              disabled={busy || !email.includes("@")}
              onPress={requestCode}
            >
              <Text style={s.buttonText}>{busy ? "One moment…" : "Email me a code"}</Text>
            </Pressable>
            {/* The side door for weak networks: a code that already exists
                (from an email that arrived, or given by the family) works
                without the ask ever needing to get through. */}
            <Pressable
              disabled={!email.includes("@")}
              onPress={() => {
                setMessage(null);
                setStep("code");
              }}
            >
              <Text style={s.link}>I already have a code</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={s.label}>THE SIX DIGITS FROM YOUR EMAIL</Text>
            <TextInput
              style={[s.input, s.codeInput]}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="······"
              placeholderTextColor="rgba(169,167,224,.4)"
              autoFocus
            />
            <Pressable
              style={({ pressed }) => [s.button, (busy || pressed) && s.buttonDim]}
              disabled={busy || code.length !== 6}
              onPress={verify}
            >
              <Text style={s.buttonText}>{busy ? "One moment…" : "Step inside"}</Text>
            </Pressable>
            <Pressable onPress={() => setStep("email")}>
              <Text style={s.link}>Different email</Text>
            </Pressable>
          </>
        )}

        {message && <Text style={s.message}>{message}</Text>}
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  body: { flex: 1, justifyContent: "center", padding: 28 },
  markWrap: { width: 34, height: 34, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  markRing: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(169,167,224,.5)",
  },
  markCore: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: T.paper3,
    shadowColor: T.duskInk,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  wordmark: { color: T.duskInk, fontSize: 21, fontFamily: T.sansSemi, letterSpacing: 0.4 },
  headline: {
    fontFamily: T.serifLight,
    color: T.duskInk,
    fontSize: 37,
    lineHeight: 44,
    marginTop: 18,
    marginBottom: 38,
    letterSpacing: -0.4,
  },
  label: {
    fontFamily: T.mono,
    color: T.halo,
    fontSize: 10.5,
    letterSpacing: 2.4,
    marginBottom: 9,
  },
  input: {
    backgroundColor: "rgba(254,252,249,0.07)",
    borderColor: "rgba(169,167,224,0.35)",
    borderWidth: 1,
    borderRadius: 14,
    color: T.duskInk,
    fontFamily: T.sans,
    fontSize: 17,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  codeInput: { fontFamily: T.mono, fontSize: 28, letterSpacing: 12, textAlign: "center" },
  button: {
    backgroundColor: T.paper3,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
    shadowColor: T.halo,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  buttonDim: { opacity: 0.65 },
  buttonText: { color: T.dusk, fontSize: 16, fontFamily: T.sansSemi },
  link: {
    color: T.halo,
    textAlign: "center",
    marginTop: 18,
    fontSize: 14,
    fontFamily: T.sans,
    textDecorationLine: "underline",
  },
  message: { color: "#c9c6e4", marginTop: 18, fontSize: 14, lineHeight: 20, fontFamily: T.sans },
});
