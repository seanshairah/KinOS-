import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NightSky } from "@/components/night-sky";
import { T } from "@/lib/theme";

/**
 * Shared page chrome: every screen lives under the night sky. Serif
 * titles in the brand voice, pull-to-refresh in halo, room at the
 * bottom for the floating tab bar.
 */
export function Screen({
  title,
  sub,
  refreshing,
  onRefresh,
  children,
}: {
  title: string;
  sub?: string;
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={{ flex: 1 }}>
      <NightSky />
      <SafeAreaView style={s.safe} edges={["top"]}>
        <ScrollView
          contentContainerStyle={s.body}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.halo} />
          }
        >
          <Text style={s.title}>{title}</Text>
          {sub && <Text style={s.sub}>{sub}</Text>}
          <View style={{ marginTop: 20, gap: 14 }}>{children}</View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/** Three lamplights breathing while a room opens — never a spinner. */
export function LoadingGlow() {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);
  return (
    <View style={s.loading}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={[
            s.loadDot,
            {
              opacity: t.interpolate({
                inputRange: [0, 1],
                outputRange: i === 1 ? [0.9, 0.3] : [0.3, 0.9],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

/** A calm failure with a hand back up — the words say what to do next. */
export function RetryNote({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <View style={s.empty}>
      <View style={[s.calmDot, { backgroundColor: "#D98A3D", shadowColor: "#D98A3D" }]} />
      <Text style={s.emptyText}>{text}</Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [s.retry, pressed && { opacity: 0.8 }]}
      >
        <Text style={s.retryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

export function EmptyNote({ text }: { text: string }) {
  return (
    <View style={s.empty}>
      <View style={s.calmDot} />
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 22, paddingBottom: 130 },
  title: {
    fontFamily: T.serifLight,
    fontSize: 32,
    color: T.duskInk,
    letterSpacing: -0.4,
  },
  sub: { color: "#c9c6e4", fontSize: 14, marginTop: 6, lineHeight: 20, fontFamily: T.sans },
  empty: {
    alignItems: "center",
    paddingVertical: 46,
    gap: 13,
  },
  calmDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: T.calm,
    shadowColor: T.calm,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  emptyText: {
    color: "#c9c6e4",
    fontSize: 14.5,
    textAlign: "center",
    lineHeight: 22,
    fontFamily: T.sans,
  },
  loading: { flexDirection: "row", justifyContent: "center", gap: 10, paddingVertical: 46 },
  loadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#A9A7E0",
    shadowColor: "#A9A7E0",
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  retry: {
    marginTop: 4,
    borderColor: "rgba(169,167,224,0.45)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  retryText: { color: "#EDEBF6", fontFamily: T.sansSemi, fontSize: 13.5 },
});
