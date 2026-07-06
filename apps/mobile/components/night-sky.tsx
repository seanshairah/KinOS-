import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/**
 * NightSky — the app doesn't sit on a background, it lives under a sky.
 * Dusk 2.0: the aurora pools drift on slow paths, fireflies wander warm
 * and near, the horizon breathes a whisper of ember, stars twinkle on
 * their own clocks, and — rarely — a shooting star crosses. Everything
 * stills under reduce-motion; nothing goes blank.
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

interface Fly {
  x: number; // percent anchors
  y: number;
  ax: number; // wander amplitude px
  ay: number;
  px: number; // period ms
  py: number;
  size: number;
  color: string;
  delay: number;
}

function makeFireflies(count: number): Fly[] {
  let seed = 41;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const hues = ["rgba(217,138,61,0.9)", "rgba(78,158,126,0.85)", "rgba(169,167,224,0.9)"];
  return Array.from({ length: count }, (_, i) => ({
    x: 8 + rand() * 84,
    y: 22 + rand() * 62,
    ax: 30 + rand() * 60,
    ay: 20 + rand() * 44,
    px: 9000 + rand() * 9000,
    py: 11000 + rand() * 9000,
    size: 2.4 + rand() * 1.6,
    color: hues[i % hues.length]!,
    delay: rand() * 5000,
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

/** A pool of aurora light on a slow, endless walk. */
function Aurora({
  still,
  size,
  color,
  top,
  left,
  right,
  bottom,
  driftX,
  driftY,
  period,
}: {
  still: boolean;
  size: number;
  color: string;
  top?: number | `${number}%`;
  left?: number | `${number}%`;
  right?: number | `${number}%`;
  bottom?: number | `${number}%`;
  driftX: number;
  driftY: number;
  period: number;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: period,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: period,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, still, period]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top,
        left,
        right,
        bottom,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        transform: [
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, driftX] }) },
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, driftY] }) },
          { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
        ],
      }}
    />
  );
}

/** One firefly, wandering its own small field. */
function Firefly({ fly, still }: { fly: Fly; still: boolean }) {
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (still) return;
    const wander = (v: Animated.Value, period: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration: period,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration: period,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.delay(fly.delay),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const a = wander(tx, fly.px);
    const b = wander(ty, fly.py);
    a.start();
    b.start();
    glow.start();
    return () => {
      a.stop();
      b.stop();
      glow.stop();
    };
  }, [tx, ty, pulse, fly, still]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: `${fly.x}%`,
        top: `${fly.y}%`,
        width: fly.size,
        height: fly.size,
        borderRadius: fly.size / 2,
        backgroundColor: fly.color,
        opacity: pulse,
        shadowColor: fly.color,
        shadowOpacity: 0.9,
        shadowRadius: 7,
        shadowOffset: { width: 0, height: 0 },
        elevation: 4,
        transform: [
          { translateX: tx.interpolate({ inputRange: [0, 1], outputRange: [-fly.ax, fly.ax] }) },
          { translateY: ty.interpolate({ inputRange: [0, 1], outputRange: [-fly.ay, fly.ay] }) },
        ],
      }}
    />
  );
}

/** A rare shooting star — catching one should feel like luck. */
function ShootingStar({ still }: { still: boolean }) {
  const run = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(18000 + Math.random() * 20000),
        Animated.timing(run, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(run, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [run, still]);
  if (still) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: "12%",
        left: "-20%",
        width: 90,
        height: 1.6,
        borderRadius: 1,
        opacity: run.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.8, 0.5, 0] }),
        transform: [
          { translateX: run.interpolate({ inputRange: [0, 1], outputRange: [0, 520] }) },
          { translateY: run.interpolate({ inputRange: [0, 1], outputRange: [0, 190] }) },
          { rotate: "20deg" },
        ],
      }}
    >
      <LinearGradient
        colors={["rgba(237,235,246,0)", "rgba(237,235,246,0.85)"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

/** The horizon breath — a whisper of ember rising and settling. */
function HorizonBreath({ still }: { still: boolean }) {
  const breath = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 5500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0.4,
          duration: 5500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath, still]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "22%", opacity: breath }}
    >
      <LinearGradient
        colors={["rgba(217,138,61,0)", "rgba(217,138,61,0.075)"]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

export function NightSky({ density = 30 }: { density?: number }) {
  const stars = useMemo(() => makeStars(density), [density]);
  const fireflies = useMemo(() => makeFireflies(5), []);
  const [still, setStill] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setStill);
  }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={["#3D3B6B", "#2C2A4F", "#252347", "#21203F"]}
        locations={[0, 0.42, 0.78, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* aurora pools on their slow walks */}
      <Aurora
        still={still}
        size={400}
        color="rgba(140,138,214,0.17)"
        top="-16%"
        right="-24%"
        driftX={-34}
        driftY={22}
        period={13000}
      />
      <Aurora
        still={still}
        size={330}
        color="rgba(217,138,61,0.07)"
        bottom="-14%"
        left="-26%"
        driftX={30}
        driftY={-18}
        period={17000}
      />
      <Aurora
        still={still}
        size={260}
        color="rgba(78,158,126,0.05)"
        top="26%"
        left="-18%"
        driftX={26}
        driftY={16}
        period={21000}
      />
      <HorizonBreath still={still} />
      {stars.map((s, i) => (
        <Twinkle key={i} star={s} still={still} />
      ))}
      {fireflies.map((f, i) => (
        <Firefly key={i} fly={f} still={still} />
      ))}
      <ShootingStar still={still} />
    </View>
  );
}
