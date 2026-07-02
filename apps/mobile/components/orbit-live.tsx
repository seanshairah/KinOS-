import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
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
      <View
        style={{
          width: 11,
          height: 11,
          borderRadius: 6,
          backgroundColor: color,
          marginTop: -5,
          shadowColor: color,
          shadowOpacity: 0.9,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 0 },
          elevation: 6,
        }}
      />
    </Animated.View>
  );
}

export function OrbitLive({ orbits, size = 280 }: { orbits: Orbit[]; size?: number }) {
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
