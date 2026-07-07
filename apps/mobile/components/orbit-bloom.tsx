import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from "react-native";
import { T } from "@/lib/theme";

/**
 * OrbitBloom — the app's opening breath. The centre light arrives
 * first, rings bloom outward one by one, satellites sweep in along
 * their paths, and the wordmark settles beneath. Under reduce-motion
 * the finished orbit simply fades in, calm and immediate.
 */

const RINGS = [92, 148, 204]; // diameters
const SATELLITES = [
  { ring: 0, deg: 40, color: T.calm, size: 10 },
  { ring: 1, deg: 205, color: T.halo, size: 9 },
  { ring: 2, deg: 320, color: "#EDEBF6", size: 8 },
];

export function OrbitBloom({ onDone }: { onDone?: () => void }) {
  const [still, setStill] = useState<boolean | null>(null);
  const core = useRef(new Animated.Value(0)).current;
  const rings = useRef(RINGS.map(() => new Animated.Value(0))).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setStill).catch(() => setStill(false));
  }, []);

  useEffect(() => {
    if (still === null) return;
    if (still) {
      core.setValue(1);
      rings.forEach((r) => r.setValue(1));
      sweep.setValue(1);
      Animated.timing(word, { toValue: 1, duration: 400, useNativeDriver: true }).start(() => {
        setTimeout(() => onDone?.(), 500);
      });
      return;
    }
    Animated.sequence([
      // the centre light arrives
      Animated.timing(core, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
      // rings bloom outward, one by one
      Animated.stagger(
        140,
        rings.map((r) =>
          Animated.timing(r, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ),
      ),
      // the family sweeps in along the paths
      Animated.timing(sweep, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // the name settles
      Animated.timing(word, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => onDone?.(), 350);
    });
    // and underneath it all, the lamplight breathes
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [still, core, rings, sweep, word, breathe, onDone]);

  return (
    <View style={s.wrap} pointerEvents="none">
      <View style={s.stage}>
        {/* rings */}
        {RINGS.map((d, i) => (
          <Animated.View
            key={d}
            style={[
              s.ring,
              {
                width: d,
                height: d,
                borderRadius: d / 2,
                borderColor: `rgba(169,167,224,${0.38 - i * 0.09})`,
                opacity: rings[i],
                transform: [
                  {
                    scale: rings[i]!.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.55, 1],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
        {/* satellites, sweeping the last quarter-turn into place */}
        {SATELLITES.map((sat) => {
          const radius = RINGS[sat.ring]! / 2;
          return (
            <Animated.View
              key={`${sat.ring}-${sat.deg}`}
              style={{
                position: "absolute",
                width: radius * 2,
                height: radius * 2,
                alignItems: "center",
                opacity: sweep,
                transform: [
                  {
                    rotate: sweep.interpolate({
                      inputRange: [0, 1],
                      outputRange: [`${sat.deg - 80}deg`, `${sat.deg}deg`],
                    }),
                  },
                ],
              }}
            >
              <View
                style={{
                  width: sat.size,
                  height: sat.size,
                  borderRadius: sat.size / 2,
                  marginTop: -sat.size / 2,
                  backgroundColor: sat.color,
                  shadowColor: sat.color,
                  shadowOpacity: 0.9,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 6,
                }}
              />
            </Animated.View>
          );
        })}
        {/* the lamplight at the centre */}
        <Animated.View
          style={[
            s.halo,
            {
              opacity: core.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
              transform: [
                {
                  scale: Animated.add(
                    core,
                    breathe.interpolate({ inputRange: [0, 1], outputRange: [0, 0.14] }),
                  ),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            s.core,
            {
              opacity: core,
              transform: [{ scale: core }],
            },
          ]}
        />
      </View>
      <Animated.View
        style={{
          opacity: word,
          transform: [
            { translateY: word.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
          ],
          alignItems: "center",
        }}
      >
        <Text style={s.wordmark}>
          Kin<Text style={{ color: T.halo }}>OS</Text>
        </Text>
        <Text style={s.line}>The people you love, in one calm orbit.</Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 40 },
  stage: { width: 220, height: 220, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", borderWidth: 1 },
  halo: {
    position: "absolute",
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "rgba(169,167,224,0.35)",
  },
  core: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: T.paper3,
    shadowColor: T.duskInk,
    shadowOpacity: 0.9,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  wordmark: { fontFamily: T.sansSemi, fontSize: 22, color: T.duskInk, letterSpacing: 0.4 },
  line: {
    marginTop: 6,
    fontFamily: T.sans,
    fontSize: 13,
    color: "#c9c6e4",
  },
});
