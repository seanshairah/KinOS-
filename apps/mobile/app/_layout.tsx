import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "@/lib/session";
import { T } from "@/lib/theme";

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: T.paper },
        }}
      >
        <Stack.Screen name="check-in" options={{ presentation: "modal" }} />
      </Stack>
    </SessionProvider>
  );
}
