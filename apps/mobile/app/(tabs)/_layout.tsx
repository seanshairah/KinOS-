import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { T } from "@/lib/theme";

function Dot({ color, focused }: { color: string; focused: boolean }) {
  return (
    <View
      style={{
        width: focused ? 9 : 7,
        height: focused ? 9 : 7,
        borderRadius: 5,
        backgroundColor: color,
        opacity: focused ? 1 : 0.55,
      }}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: T.paper3,
          borderTopColor: T.line,
          height: 84,
          paddingTop: 10,
        },
        tabBarActiveTintColor: T.dusk,
        tabBarInactiveTintColor: T.inkFaint,
        tabBarLabel: ({ color, children }) => (
          <Text style={{ color, fontSize: 11.5, fontWeight: "600", marginTop: 4 }}>{children}</Text>
        ),
      }}
    >
      <Tabs.Screen
        name="orbit"
        options={{
          title: "Orbit",
          tabBarIcon: ({ focused }) => <Dot color={T.dusk2} focused={focused} />,
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
