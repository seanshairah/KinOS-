import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import { api, type AppNotification, type PendingCheck } from "@/lib/api";
import { useSession } from "@/lib/session";
import { EmptyNote, Screen } from "@/components/screen";
import { T } from "@/lib/theme";

/**
 * More — the quieter rooms in the hand: wellness checks waiting on you,
 * and everything that reached out to you. Sharing is always a choice;
 * "not this time" is a complete answer.
 */
export default function MoreScreen() {
  const { token, signOut } = useSession();
  const [checks, setChecks] = useState<PendingCheck[] | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [c, n] = await Promise.all([
        api.checksAwaitingMe(token),
        api.notifications(token),
      ]);
      setChecks(c.checks);
      setNotifications(n.notifications);
    } catch {
      // pull-to-refresh retries
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const respond = async (
    check: PendingCheck,
    response: "shared" | "later" | "declined",
  ) => {
    if (!token) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChecks((cur) => (cur ? cur.filter((c) => c.id !== check.id) : cur));
    try {
      const res = await api.respondCheck(token, check.id, {
        response,
        ...(response === "shared" && note.trim() ? { note: note.trim() } : {}),
      });
      setNote("");
      if (response === "shared") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setMessage(res.summary ?? "Shared. Your family has it.");
      } else if (response === "declined") {
        setMessage("That's okay — a no is a complete answer.");
      } else {
        setMessage("We'll ask again a little later.");
      }
    } catch {
      void load(); // put it back if the server disagreed
    }
  };

  const markAllRead = async () => {
    if (!token) return;
    setNotifications((cur) =>
      cur ? cur.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) : cur,
    );
    try {
      await api.markNotificationsRead(token);
    } catch {
      void load();
    }
  };

  const unread = (notifications ?? []).filter((n) => !n.readAt).length;

  return (
    <Screen
      title="More"
      sub="Checks waiting on you, and what reached out."
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load();
      }}
    >
      {/* ——— wellness checks waiting on this person ——— */}
      {(checks ?? []).map((check) => (
        <View key={check.id} style={s.card}>
          <Text style={s.prompt}>{check.prompt}</Text>
          <Text style={s.meta}>
            Share now, be reminded later, or decline — always your choice.
          </Text>
          <TextInput
            style={s.input}
            value={note}
            onChangeText={setNote}
            placeholder="A few words to send along (optional)"
            placeholderTextColor="rgba(169,167,224,.5)"
          />
          <Pressable
            style={({ pressed }) => [s.primary, pressed && { opacity: 0.85 }]}
            onPress={() => void respond(check, "shared")}
          >
            <Text style={s.primaryText}>Share now</Text>
          </Pressable>
          <View style={s.actions}>
            <Pressable
              style={({ pressed }) => [s.ghost, pressed && { opacity: 0.7 }]}
              onPress={() => void respond(check, "later")}
            >
              <Text style={s.ghostText}>Remind me later</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [s.ghost, pressed && { opacity: 0.7 }]}
              onPress={() => void respond(check, "declined")}
            >
              <Text style={s.ghostText}>Not this time</Text>
            </Pressable>
          </View>
        </View>
      ))}
      {message && <Text style={s.message}>{message}</Text>}
      {checks && checks.length === 0 && !message && (
        <EmptyNote text={"No one is asking for a check right now.\nThe sky is calm."} />
      )}

      {/* ——— notifications ——— */}
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>WHAT REACHED OUT</Text>
        {unread > 0 && (
          <Pressable onPress={() => void markAllRead()}>
            <Text style={s.link}>Mark all read</Text>
          </Pressable>
        )}
      </View>
      {(notifications ?? []).slice(0, 20).map((n) => (
        <View key={n.id} style={s.noticeRow}>
          <View
            style={[
              s.dot,
              {
                backgroundColor: n.readAt ? "rgba(169,167,224,0.35)" : T.halo,
                shadowColor: T.halo,
                shadowOpacity: n.readAt ? 0 : 0.8,
              },
            ]}
          />
          <View style={{ flex: 1 }}>
            <Text style={[s.noticeTitle, n.readAt ? { color: "#a5a2c8" } : null]}>
              {n.title}
            </Text>
            {n.body ? <Text style={s.noticeBody}>{n.body}</Text> : null}
          </View>
        </View>
      ))}
      {notifications && notifications.length === 0 && (
        <EmptyNote text={"Nothing has needed you yet."} />
      )}

      <Pressable style={({ pressed }) => [s.signOut, pressed && { opacity: 0.7 }]} onPress={() => void signOut()}>
        <Text style={s.ghostText}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "rgba(254,252,249,0.06)",
    borderColor: "rgba(169,167,224,0.35)",
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 17,
    gap: 12,
    shadowColor: T.halo,
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  prompt: { fontSize: 17, fontFamily: T.sansSemi, color: T.duskInk, lineHeight: 23 },
  meta: { fontSize: 12.5, color: "#c9c6e4", lineHeight: 18, fontFamily: T.sans },
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
  primary: {
    backgroundColor: T.paper3,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryText: { color: T.dusk, fontFamily: T.sansSemi, fontSize: 15 },
  actions: { flexDirection: "row", gap: 10 },
  ghost: {
    flex: 1,
    borderColor: "rgba(169,167,224,0.4)",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 11,
    alignItems: "center",
  },
  ghostText: { color: "#c9c6e4", fontFamily: T.sansSemi, fontSize: 13.5 },
  message: { color: "#c9c6e4", fontSize: 14, lineHeight: 20, fontFamily: T.sans },
  sectionHead: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontFamily: T.mono,
    color: T.halo,
    fontSize: 10.5,
    letterSpacing: 2.2,
  },
  link: { color: T.halo, fontSize: 12.5, fontFamily: T.sans, textDecorationLine: "underline" },
  noticeRow: { flexDirection: "row", gap: 11, alignItems: "flex-start" },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  noticeTitle: { fontSize: 14.5, fontFamily: T.sansMedium, color: T.duskInk, lineHeight: 20 },
  noticeBody: { fontSize: 12.5, color: "#a5a2c8", marginTop: 2, lineHeight: 17, fontFamily: T.sans },
  signOut: { alignSelf: "center", marginTop: 14, paddingHorizontal: 22, paddingVertical: 10 },
});
