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
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { T } from "@/lib/theme";

/**
 * Sign-in the family way: your email, then the six digits it receives.
 * No passwords to forget, nothing to configure.
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
      setStep("code");
      setMessage("A six-digit code is on its way to your email.");
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
      await signIn(res.sessionToken);
      router.replace("/(tabs)/orbit");
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : "Couldn't reach KinOS — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={s.body}>
        <View style={s.mark} />
        <Text style={s.wordmark}>
          Kin<Text style={{ color: T.halo }}>OS</Text>
        </Text>
        <Text style={s.headline}>
          The people you love,{"\n"}in one calm orbit.
        </Text>

        {step === "email" ? (
          <>
            <Text style={s.label}>Your email</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@family.com"
              placeholderTextColor={T.inkFaint}
            />
            <Pressable
              style={[s.button, busy && s.buttonBusy]}
              disabled={busy || !email.includes("@")}
              onPress={requestCode}
            >
              <Text style={s.buttonText}>{busy ? "One moment…" : "Email me a code"}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={s.label}>The six digits from your email</Text>
            <TextInput
              style={[s.input, s.codeInput]}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="······"
              placeholderTextColor={T.inkFaint}
            />
            <Pressable
              style={[s.button, busy && s.buttonBusy]}
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
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.night },
  body: { flex: 1, justifyContent: "center", padding: 28 },
  mark: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: T.paper3,
    marginBottom: 14,
  },
  wordmark: { color: T.duskInk, fontSize: 22, fontWeight: "700", letterSpacing: 0.5 },
  headline: {
    fontFamily: T.serif,
    color: T.duskInk,
    fontSize: 34,
    lineHeight: 40,
    marginTop: 18,
    marginBottom: 36,
  },
  label: {
    fontFamily: T.mono,
    color: T.halo,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(254,252,249,0.08)",
    borderColor: "rgba(169,167,224,0.35)",
    borderWidth: 1,
    borderRadius: T.r.card,
    color: T.duskInk,
    fontSize: 17,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  codeInput: { fontFamily: T.mono, fontSize: 26, letterSpacing: 10, textAlign: "center" },
  button: {
    backgroundColor: T.paper3,
    borderRadius: T.r.pill,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 16,
  },
  buttonBusy: { opacity: 0.6 },
  buttonText: { color: T.dusk, fontSize: 16, fontWeight: "600" },
  link: {
    color: T.halo,
    textAlign: "center",
    marginTop: 18,
    fontSize: 14,
    textDecorationLine: "underline",
  },
  message: { color: "#c9c6e4", marginTop: 18, fontSize: 14, lineHeight: 20 },
});
