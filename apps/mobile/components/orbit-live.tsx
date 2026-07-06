import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { T } from "@/lib/theme";
import type { Orbit } from "@/lib/api";

/**
 * OrbitLive — the home screen's heart. The person you love is a
 * breathing lamplight at the centre; the family's subjects ride the
 * rings as small glowing satellites, each carrying its status colour.
 * Presence first: no labels on the lights, meaning in the glow.
 */

const STATUS_COLOR: Record<Orbit["status"], string> = {
  steady: T.calm,
  attention: T.ember,
  urgent: T.urgent,
};

function Ring({ size, opacity }: { size: number; opacity: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: `rgba(169,167,224,${opacity})`,
      }}
    />
  );
}

function Satellite({
  orbit,
  radius,
  startDeg,
  duration,
  reverse,
}: {
  orbit: Orbit;
  radius: number;
  startDeg: number;
  duration: number;
  reverse?: boolean;
}) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin, duration]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: reverse
      ? [`${startDeg}deg`, `${startDeg - 360}deg`]
      : [`${startDeg}deg`, `${startDeg + 360}deg`],
  });
  const color = STATUS_COLOR[orbit.status];

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: radius * 2,
        height: radius * 2,
        alignItems: "center",
        transform: [{ rotate }],
      }}
    >
      <View style={{ marginTop: -5, alignItems: "center", justifyContent: "center" }}>
        {/* the comet tail: a faint streak along the path, behind the light */}
        <LinearGradient
          colors={[color + "00", color + "66"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{
            position: "absolute",
            width: 30,
            height: 2.4,
            borderRadius: 2,
            // travel is tangential; the tail points back along the ring
            transform: [{ translateX: reverse ? 16 : -16 }, { scaleX: reverse ? -1 : 1 }],
          }}
        />
        <View
          style={{
            width: 11,
            height: 11,
            borderRadius: 6,
            backgroundColor: color,
            shadowColor: color,
            shadowOpacity: 0.9,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
            elevation: 6,
          }}
        >
          {/* a specular kiss of starlight */}
          <View
            style={{
              position: "absolute",
              top: 2,
              left: 2.5,
              width: 3.5,
              height: 3.5,
              borderRadius: 2,
              backgroundColor: "rgba(255,255,255,0.7)",
            }}
          />
        </View>
      </View>
    </Animated.View>
  );
}

/** The heartbeat: a ring leaves the centre and dissolves into the dark. */
function Ripple({ size, delay, still }: { size: number; delay: number; still: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, {
          toValue: 1,
          duration: 7000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, delay, still]);
  if (still) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: "rgba(169,167,224,0.45)",
        opacity: t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.5, 0] }),
        transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
      }}
    />
  );
}

/** A grain of light travelling the outer ring — the path, being walked. */
function RingSpark({ radius, still }: { radius: number; still: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 26000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin, still]);
  if (still) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: radius * 2,
        height: radius * 2,
        alignItems: "center",
        transform: [
          { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) },
        ],
      }}
    >
      <View
        style={{
          width: 3.5,
          height: 3.5,
          borderRadius: 2,
          backgroundColor: "rgba(237,235,246,0.85)",
          marginTop: -1.5,
          shadowColor: "#EDEBF6",
          shadowOpacity: 0.9,
          shadowRadius: 5,
          shadowOffset: { width: 0, height: 0 },
          elevation: 4,
        }}
      />
    </Animated.View>
  );
}

export function OrbitLive({ orbits, size = 280 }: { orbits: Orbit[]; size?: number }) {
  const [still, setStill] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setStill);
  }, []);
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  const coreScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const haloOpacity = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.6] });

  const rings = [size * 0.36, size * 0.58, size * 0.82];
  const centre = orbits[0];

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Ring size={rings[2]!} opacity={0.16} />
      <Ring size={rings[1]!} opacity={0.24} />
      <Ring size={rings[0]!} opacity={0.32} />
      <Ripple size={rings[2]!} delay={0} still={still} />
      <Ripple size={rings[2]!} delay={3500} still={still} />
      <RingSpark radius={rings[2]! / 2} still={still} />

      {/* the loved one: a lamplight that breathes */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: size * 0.3,
          height: size * 0.3,
          borderRadius: size * 0.15,
          backgroundColor: "rgba(169,167,224,0.22)",
          opacity: haloOpacity,
          transform: [{ scale: coreScale }],
        }}
      />
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: "rgba(237,235,246,0.14)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: T.paper3,
            shadowColor: T.duskInk,
            shadowOpacity: 0.9,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 0 },
            elevation: 8,
          }}
        />
      </View>
      {centre && (
        <Text
          style={{
            position: "absolute",
            top: "50%",
            marginTop: 36,
            fontFamily: T.mono,
            fontSize: 10.5,
            letterSpacing: 2,
            color: T.halo,
          }}
        >
          {centre.name.toUpperCase()}
        </Text>
      )}

      {orbits.map((o, i) => (
        <Satellite
          key={o.subjectId}
          orbit={o}
          radius={rings[Math.min(i, 2)]! / 2}
          startDeg={40 + i * 130}
          duration={42000 + i * 16000}
          reverse={i % 2 === 1}
        />
      ))}
    </View>
  );
}
