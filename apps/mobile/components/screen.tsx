import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
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
});
