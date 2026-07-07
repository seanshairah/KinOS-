import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { api, ApiError, type EmergencyInfo } from "@/lib/api";
import { useSession } from "@/lib/session";
import { NightSky } from "@/components/night-sky";
import { LoadingGlow, RetryNote } from "@/components/screen";
import { GlassCard, RoomTop, SectionLabel } from "@/components/ui";
import { T } from "@/lib/theme";

/**
 * The Emergency Layer — who to call and what responders need, one tap
 * from the orbit. KinOS is not an emergency service; if something is
 * urgent, contact local emergency or medical services first.
 */
export default function EmergencyScreen() {
  const { token } = useSession();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const [info, setInfo] = useState<EmergencyInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [raised, setRaised] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      setError(null);
      setInfo(await api.emergency(token, id));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return router.replace("/sign-in");
      setError(e instanceof ApiError ? e.message : "Couldn't reach the family space.");
    }
  }, [token, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const raise = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    try {
      await api.raiseAlert(token!, id);
      setRaised(true);
    } catch {
      // stays un-raised; the button can be pressed again
    }
  };

  const p = info?.profile;

  return (
    <View style={{ flex: 1 }}>
      <NightSky density={16} />
      <RoomTop title={`${name ?? "Emergency"} · Emergency`} />
      <ScrollView contentContainerStyle={st.body}>
        {info === null && !error && <LoadingGlow />}
        {error && <RetryNote text={error} onRetry={() => void load()} />}

        {info && (
          <>
            <Text style={st.safety}>
              KinOS is not an emergency service. If something is urgent, contact local emergency or
              medical services first.
            </Text>

            {/* contacts — tap to call */}
            {info.contacts.length > 0 && (
              <View style={{ gap: 10 }}>
                <SectionLabel>Emergency contacts</SectionLabel>
                {info.contacts.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => Linking.openURL(`tel:${c.phone}`)}
                    style={({ pressed }) => [pressed && { opacity: 0.8 }]}
                  >
                    <GlassCard>
                      <View style={st.rowBetween}>
                        <View>
                          <Text style={st.name}>{c.name}</Text>
                          <Text style={st.meta}>{c.relationship ?? "contact"}</Text>
                        </View>
                        <View style={st.callChip}>
                          <Text style={st.callText}>Call</Text>
                        </View>
                      </View>
                    </GlassCard>
                  </Pressable>
                ))}
              </View>
            )}

            {/* the medical summary responders need */}
            {p && (
              <GlassCard>
                <SectionLabel>For responders</SectionLabel>
                {p.blood_type ? <Text style={st.line}>Blood type: {p.blood_type}</Text> : null}
                {p.conditions.length > 0 ? (
                  <Text style={st.line}>Conditions: {p.conditions.join(", ")}</Text>
                ) : null}
                {p.allergies.length > 0 ? (
                  <Text style={st.line}>Allergies: {p.allergies.join(", ")}</Text>
                ) : null}
                {p.medications.length > 0 ? (
                  <Text style={st.line}>Medication: {p.medications.join(", ")}</Text>
                ) : null}
                {p.instructions ? <Text style={st.line}>{p.instructions}</Text> : null}
              </GlassCard>
            )}
            {!p && info.contacts.length === 0 && (
              <Text style={st.meta}>
                No emergency profile yet — add one on the web so it&apos;s here when it matters.
              </Text>
            )}

            {/* raise the alert */}
            {raised ? (
              <View style={[st.raiseBtn, { borderColor: T.calm }]}>
                <Text style={[st.raiseText, { color: T.calm }]}>
                  The family has been told, urgently.
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={() => void raise()}
                style={({ pressed }) => [st.raiseBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={st.raiseText}>Raise the alert — tell the whole family now</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  body: { padding: 22, paddingBottom: 130, gap: 16 },
  safety: { fontFamily: T.sans, fontSize: 12.5, color: "#a5a2c8", lineHeight: 18 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontFamily: T.sansSemi, fontSize: 16, color: T.duskInk },
  meta: { fontFamily: T.mono, fontSize: 11, color: "#a5a2c8", marginTop: 2 },
  callChip: {
    backgroundColor: T.paper3,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  callText: { color: T.dusk, fontFamily: T.sansSemi, fontSize: 13.5 },
  line: { fontFamily: T.sans, fontSize: 13.5, color: "#c9c6e4", lineHeight: 20 },
  raiseBtn: {
    borderColor: T.urgent,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 6,
  },
  raiseText: { color: T.urgent, fontFamily: T.sansSemi, fontSize: 14.5, textAlign: "center", paddingHorizontal: 12 },
});
