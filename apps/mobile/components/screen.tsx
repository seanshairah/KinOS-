import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { T } from "@/lib/theme";

/** Shared page chrome: warm paper, serif title, pull to refresh. */
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
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.dusk2} />
        }
      >
        <Text style={s.title}>{title}</Text>
        {sub && <Text style={s.sub}>{sub}</Text>}
        <View style={{ marginTop: 18, gap: 14 }}>{children}</View>
      </ScrollView>
    </SafeAreaView>
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
  safe: { flex: 1, backgroundColor: T.paper },
  body: { padding: 20, paddingBottom: 48 },
  title: { fontFamily: T.serif, fontSize: 30, color: T.ink, letterSpacing: -0.3 },
  sub: { color: T.inkSoft, fontSize: 14, marginTop: 6, lineHeight: 20 },
  empty: {
    alignItems: "center",
    paddingVertical: 44,
    gap: 12,
  },
  calmDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: T.calm,
    shadowColor: T.calm,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  emptyText: { color: T.inkSoft, fontSize: 14.5, textAlign: "center", lineHeight: 21 },
});
