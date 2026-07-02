import { useEffect, useMemo, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/**
 * NightSky — the app doesn't sit on a background, it lives under a sky.
 * The same dusk the marketing site earns by scrolling is simply *home*
 * here: a deep gradient, a faint aurora, and a field of small stars
 * that twinkle on their own slow clocks. Honors reduce-motion.
 */

interface Star {
  x: number; // percent
  y: number;
  size: number;
  base: number; // resting opacity
  period: number; // ms
  delay: number;
  warm: boolean;
}

function makeStars(count: number): Star[] {
  let seed = 17;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: count }, () => ({
    x: rand() * 100,
    y: rand() * 100,
    size: 1.5 + rand() * 2.2,
    base: 0.25 + rand() * 0.45,
    period: 2600 + rand() * 4200,
    delay: rand() * 4000,
    warm: rand() > 0.9,
  }));
}

function Twinkle({ star, still }: { star: Star; still: boolean }) {
  const glow = useRef(new Animated.Value(star.base)).current;

  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(star.delay),
        Animated.timing(glow, {
          toValue: Math.min(star.base + 0.5, 1),
          duration: star.period / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: star.base,
          duration: star.period / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow, star, still]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: `${star.x}%`,
        top: `${star.y}%`,
        width: star.size,
        height: star.size,
        borderRadius: star.size / 2,
        backgroundColor: star.warm ? "#D9A05B" : "#EDEBF6",
        opacity: glow,
      }}
    />
  );
}

export function NightSky({ density = 30 }: { density?: number }) {
  const stars = useMemo(() => makeStars(density), [density]);
  const stillRef = useRef(false);
  const still = stillRef.current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      stillRef.current = v;
    });
  }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={["#3D3B6B", "#2C2A4F", "#262449"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* a soft aurora pooling near the top — the lamplight of the sky */}
      <View
        style={{
          position: "absolute",
          top: "-16%",
          right: "-24%",
          width: 380,
          height: 380,
          borderRadius: 190,
          backgroundColor: "rgba(140,138,214,0.16)",
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: "-14%",
          left: "-26%",
          width: 330,
          height: 330,
          borderRadius: 165,
          backgroundColor: "rgba(217,138,61,0.07)",
        }}
      />
      {stars.map((s, i) => (
        <Twinkle key={i} star={s} still={still} />
      ))}
    </View>
  );
}
