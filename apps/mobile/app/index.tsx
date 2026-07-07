import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { View } from "react-native";
import { NightSky } from "@/components/night-sky";
import { OrbitBloom } from "@/components/orbit-bloom";
import { useSession } from "@/lib/session";

/**
 * The front door opens with the orbit blooming into place — rings,
 * satellites, the lamplight — then the app steps aside: to the family's
 * sky if a session is held, to sign-in if not.
 */
export default function Gate() {
  const { token, ready } = useSession();
  const [bloomed, setBloomed] = useState(false);

  // Never hold the door forever: if the animation callback is missed
  // (backgrounded launch, reduce-motion race), let go after 4s.
  useEffect(() => {
    const t = setTimeout(() => setBloomed(true), 4000);
    return () => clearTimeout(t);
  }, []);

  if (!ready || !bloomed) {
    return (
      <View style={{ flex: 1 }}>
        <NightSky density={26} />
        <OrbitBloom onDone={() => setBloomed(true)} />
      </View>
    );
  }
  return <Redirect href={token ? "/(tabs)/orbit" : "/sign-in"} />;
}
