import { Tabs } from "expo-router";
import { Platform, Text, View } from "react-native";
import { T } from "@/lib/theme";

/**
 * The tab bar is the web's floating glass pill, come home to the hand:
 * dark dusk glass hovering above the sky, three small lights.
 */
function Dot({ color, focused }: { color: string; focused: boolean }) {
  return (
    <View
      style={{
        width: focused ? 9 : 7,
        height: focused ? 9 : 7,
        borderRadius: 5,
        backgroundColor: color,
        opacity: focused ? 1 : 0.5,
        shadowColor: color,
        shadowOpacity: focused ? 0.9 : 0,
        shadowRadius: 7,
        shadowOffset: { width: 0, height: 0 },
        elevation: focused ? 5 : 0,
      }}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent" },
        tabBarStyle: {
          position: "absolute",
          bottom: Platform.OS === "ios" ? 28 : 18,
          marginHorizontal: 24,
          height: 66,
          paddingTop: 10,
          paddingBottom: 10,
          borderRadius: 999,
          backgroundColor: "rgba(30,28,56,0.86)",
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: "rgba(169,167,224,0.18)",
          shadowColor: "#000",
          shadowOpacity: 0.45,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 12 },
          elevation: 14,
        },
        tabBarActiveTintColor: T.duskInk,
        tabBarInactiveTintColor: "#8d89b8",
        tabBarLabel: ({ color, children }) => (
          <Text style={{ color, fontSize: 11, fontFamily: T.sansMedium, marginTop: 3 }}>
            {children}
          </Text>
        ),
      }}
    >
      <Tabs.Screen
        name="orbit"
        options={{
          title: "Orbit",
          tabBarIcon: ({ focused }) => <Dot color={T.halo} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="brief"
        options={{
          title: "Daily Brief",
          tabBarIcon: ({ focused }) => <Dot color={T.calm} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="attention"
        options={{
          title: "Attention",
          tabBarIcon: ({ focused }) => <Dot color={T.ember} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
