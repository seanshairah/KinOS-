import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { T } from "@/lib/theme";

/**
 * Shared native primitives for the deeper rooms — a glass card, a room
 * header with a back arrow, section labels, and the two button voices.
 * The same dusk language as every screen; nothing here is a one-off.
 */

export function GlassCard({
  children,
  glow,
  style,
}: {
  children: React.ReactNode;
  glow?: string;
  style?: object;
}) {
  return (
    <View
      style={[
        ui.card,
        glow ? { shadowColor: glow, shadowOpacity: 0.28 } : null,
        glow ? { borderColor: glow + "55" } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function RoomTop({ title, sub }: { title: string; sub?: string }) {
  return (
    <SafeAreaView edges={["top"]} style={ui.topWrap}>
      <Pressable
        onPress={async () => {
          await Haptics.selectionAsync();
          if (router.canGoBack()) router.back();
          else router.replace("/(tabs)/orbit");
        }}
        style={({ pressed }) => [ui.back, pressed && { opacity: 0.6 }]}
        hitSlop={12}
      >
        <Text style={ui.backArrow}>←</Text>
      </Pressable>
      <Text style={ui.title}>{title}</Text>
      {sub ? <Text style={ui.sub}>{sub}</Text> : null}
    </SafeAreaView>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={ui.section}>{String(children).toUpperCase()}</Text>;
}

export function PrimaryButton({
  label,
  onPress,
  tone = "paper",
}: {
  label: string;
  onPress: () => void;
  tone?: "paper" | "calm" | "ember";
}) {
  const bg = tone === "calm" ? T.calmSoft : tone === "ember" ? T.emberSoft : T.paper3;
  const fg = tone === "paper" ? T.dusk : "#2f2a1a";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [ui.primary, { backgroundColor: bg }, pressed && { opacity: 0.85 }]}
    >
      <Text style={[ui.primaryText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [ui.ghost, pressed && { opacity: 0.65 }]}
    >
      <Text style={ui.ghostText}>{label}</Text>
    </Pressable>
  );
}

export function StatusChip({ status }: { status: "steady" | "attention" | "urgent" }) {
  const color = status === "steady" ? T.calm : status === "attention" ? T.ember : T.urgent;
  const word = status === "steady" ? "steady" : status === "attention" ? "attention" : "act now";
  return (
    <View style={[ui.chip, { borderColor: color + "88" }]}>
      <View style={[ui.chipDot, { backgroundColor: color, shadowColor: color }]} />
      <Text style={[ui.chipText, { color }]}>{word}</Text>
    </View>
  );
}

const ui = StyleSheet.create({
  card: {
    backgroundColor: "rgba(254,252,249,0.06)",
    borderColor: "rgba(169,167,224,0.22)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 17,
    gap: 12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  topWrap: { paddingHorizontal: 22, paddingTop: 8, gap: 6 },
  back: { alignSelf: "flex-start", paddingVertical: 4, paddingRight: 12 },
  backArrow: { color: T.halo, fontSize: 26, fontFamily: T.sans },
  title: { fontFamily: T.serifLight, fontSize: 30, color: T.duskInk, letterSpacing: -0.4 },
  sub: { color: "#c9c6e4", fontSize: 13.5, lineHeight: 19, fontFamily: T.sans, maxWidth: "94%" },
  section: {
    fontFamily: T.mono,
    fontSize: 10.5,
    letterSpacing: 2,
    color: T.halo,
    marginTop: 6,
  },
  primary: {
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
    shadowColor: T.halo,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  primaryText: { fontSize: 14.5, fontFamily: T.sansSemi },
  ghost: {
    borderColor: "rgba(169,167,224,0.4)",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  ghostText: { color: "#c9c6e4", fontSize: 13.5, fontFamily: T.sansSemi },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOpacity: 0.9,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  chipText: { fontFamily: T.mono, fontSize: 10, letterSpacing: 1 },
});
