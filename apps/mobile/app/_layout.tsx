import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  Newsreader_300Light,
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
} from "@expo-google-fonts/newsreader";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import { IBMPlexMono_400Regular } from "@expo-google-fonts/ibm-plex-mono";
import { View } from "react-native";
import { NightSky } from "@/components/night-sky";
import { SessionProvider } from "@/lib/session";

export default function RootLayout() {
  const [fontsReady] = useFonts({
    Newsreader_300Light,
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    IBMPlexMono_400Regular,
  });

  if (!fontsReady) {
    // The sky arrives first; the words follow.
    return (
      <View style={{ flex: 1 }}>
        <NightSky density={18} />
      </View>
    );
  }

  return (
    <SessionProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#2C2A4F" },
          animation: "fade",
        }}
      >
        <Stack.Screen
          name="check-in"
          options={{ presentation: "transparentModal", animation: "fade" }}
        />
      </Stack>
    </SessionProvider>
  );
}
