/**
 * LevelSymbol.js
 *
 * Fully custom SVG badge artwork for each of the 8 CineLink levels.
 * Every badge is a standalone visual — layered shapes, gradients, glows,
 * and cinematic iconography. No generic emoji, no icon fonts.
 *
 * Usage:
 *   import LevelSymbol, { LEVEL_META } from "../components/LevelSymbol";
 *   <LevelSymbol level={3} size={48} />
 *
 * Peer dep: react-native-svg (included in Expo SDK)
 */

import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import Svg, {
  Defs,
  RadialGradient,
  LinearGradient as LG,
  Stop,
  Circle,
  Ellipse,
  Rect,
  Polygon,
  Line,
  G,
} from "react-native-svg";

export const LEVEL_META = {
  1: { name: "Newbie", color: "#9ca3af", glow: false },
  2: { name: "Movie Buff", color: "#60a5fa", glow: false },
  3: { name: "Cinephile", color: "#f59e0b", glow: false },
  4: { name: "Film Critic", color: "#fb923c", glow: false },
  5: { name: "Director's Cut", color: "#34d399", glow: false },
  6: { name: "Oscar Worthy", color: "#facc15", glow: true },
  7: { name: "Hall of Fame", color: "#c084fc", glow: true },
  8: { name: "Legend", color: "#f97316", glow: true },
};

const polyPts = (cx, cy, r, n, rot = 0) =>
  Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n + (rot * Math.PI) / 180;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");

const starPts = (cx, cy, r1, r2, n = 5, rot = -90) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = (Math.PI * i) / n + (rot * Math.PI) / 180;
    const r = i % 2 === 0 ? r1 : r2;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");

const GlowRing = ({ color, size }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [anim]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: size * 2.2,
        height: size * 2.2,
        borderRadius: size * 1.1,
        backgroundColor: color,
        opacity: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.08, 0.22],
        }),
        transform: [
          {
            scale: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.9, 1.1],
            }),
          },
        ],
      }}
    />
  );
};

const BadgeL1 = ({ s }) => {
  const cx = s / 2;
  const cy = s / 2;
  const R = s * 0.44;
  const rInner = s * 0.18;
  const holes = Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 8;
    const hx = cx + (R - s * 0.09) * Math.cos(a);
    const hy = cy + (R - s * 0.09) * Math.sin(a);
    return (
      <Circle
        key={i}
        cx={hx}
        cy={hy}
        r={s * 0.055}
        fill="#111"
        opacity={0.55}
      />
    );
  });

  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Defs>
        <RadialGradient id="l1bg" cx="40%" cy="35%" r="65%">
          <Stop offset="0" stopColor="#e5e7eb" />
          <Stop offset="1" stopColor="#6b7280" />
        </RadialGradient>
        <RadialGradient id="l1inner" cx="50%" cy="40%" r="60%">
          <Stop offset="0" stopColor="#374151" />
          <Stop offset="1" stopColor="#111827" />
        </RadialGradient>
      </Defs>
      <Circle cx={cx} cy={cy} r={R} fill="url(#l1bg)" />
      {holes}
      <Circle cx={cx} cy={cy} r={rInner} fill="url(#l1inner)" />
      <Circle
        cx={cx}
        cy={cy}
        r={rInner}
        fill="none"
        stroke="#9ca3af"
        strokeWidth={s * 0.018}
      />
      <Circle cx={cx} cy={cy} r={s * 0.045} fill="#9ca3af" />
      <Circle
        cx={cx}
        cy={cy}
        r={R}
        fill="none"
        stroke="#d1d5db"
        strokeWidth={s * 0.022}
        opacity={0.6}
      />
    </Svg>
  );
};

const BadgeL2 = ({ s }) => {
  const cx = s / 2;
  const cy = s / 2;
  const tri = `${cx - s * 0.14},${cy - s * 0.2} ${cx + s * 0.22},${cy} ${cx - s * 0.14},${cy + s * 0.2}`;
  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Defs>
        <RadialGradient id="l2bg" cx="40%" cy="35%" r="70%">
          <Stop offset="0" stopColor="#93c5fd" />
          <Stop offset="1" stopColor="#1d4ed8" />
        </RadialGradient>
        <RadialGradient id="l2shine" cx="35%" cy="30%" r="55%">
          <Stop offset="0" stopColor="#fff" stopOpacity="0.25" />
          <Stop offset="1" stopColor="#fff" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect
        x={s * 0.06}
        y={s * 0.06}
        width={s * 0.88}
        height={s * 0.88}
        rx={s * 0.18}
        fill="url(#l2bg)"
      />
      <Rect
        x={s * 0.06}
        y={s * 0.06}
        width={s * 0.88}
        height={s * 0.88}
        rx={s * 0.18}
        fill="url(#l2shine)"
      />
      <Polygon points={tri} fill="#fff" opacity={0.92} />
      <Rect
        x={s * 0.06}
        y={s * 0.06}
        width={s * 0.88}
        height={s * 0.88}
        rx={s * 0.18}
        fill="none"
        stroke="#bfdbfe"
        strokeWidth={s * 0.022}
        opacity={0.5}
      />
    </Svg>
  );
};

const BadgeL3 = ({ s }) => {
  const bx = s * 0.08;
  const by = s * 0.38;
  const bw = s * 0.84;
  const bh = s * 0.54;
  const topH = s * 0.24;
  const ty = by - topH;
  const nStripes = 5;
  const sw = bw / nStripes;
  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Defs>
        <LG id="l3body" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#fbbf24" />
          <Stop offset="1" stopColor="#92400e" />
        </LG>
        <LG id="l3top" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#fef3c7" />
          <Stop offset="1" stopColor="#d97706" />
        </LG>
      </Defs>
      <Rect
        x={bx}
        y={by}
        width={bw}
        height={bh}
        rx={s * 0.07}
        fill="url(#l3body)"
      />
      <Rect
        x={bx}
        y={ty}
        width={bw}
        height={topH}
        rx={s * 0.06}
        fill="url(#l3top)"
      />
      <G>
        {Array.from({ length: nStripes + 2 }, (_, i) => (
          <Rect
            key={i}
            x={bx + i * sw - sw * 0.5}
            y={ty - 2}
            width={sw * 0.55}
            height={topH + 4}
            fill="#111"
            opacity={0.38}
            transform={`rotate(-12,${bx + i * sw},${ty + topH / 2})`}
          />
        ))}
      </G>
      <Circle
        cx={bx + s * 0.13}
        cy={ty + topH * 0.5}
        r={s * 0.048}
        fill="#92400e"
        opacity={0.6}
      />
      <Circle
        cx={s / 2}
        cy={by + bh * 0.52}
        r={s * 0.13}
        fill="#111"
        opacity={0.22}
      />
      <Circle
        cx={s / 2}
        cy={by + bh * 0.52}
        r={s * 0.07}
        fill="#fef3c7"
        opacity={0.18}
      />
    </Svg>
  );
};

const BadgeL4 = ({ s }) => {
  const cx = s / 2;
  const cy = s / 2;
  const nibTip = `${cx},${cy + s * 0.32}`;
  const nibL = `${cx - s * 0.22},${cy - s * 0.08}`;
  const nibR = `${cx + s * 0.22},${cy - s * 0.08}`;
  const nibTop = `${cx},${cy - s * 0.3}`;
  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Defs>
        <RadialGradient id="l4bg" cx="45%" cy="38%" r="65%">
          <Stop offset="0" stopColor="#fed7aa" />
          <Stop offset="1" stopColor="#c2410c" />
        </RadialGradient>
        <LG id="l4nib" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#fff7ed" />
          <Stop offset="0.5" stopColor="#fb923c" />
          <Stop offset="1" stopColor="#7c2d12" />
        </LG>
      </Defs>
      <Circle cx={cx} cy={cy} r={s * 0.46} fill="url(#l4bg)" />
      <Polygon
        points={`${nibTop} ${nibR} ${nibTip} ${nibL}`}
        fill="url(#l4nib)"
      />
      <Line
        x1={cx}
        y1={cy - s * 0.22}
        x2={cx}
        y2={cy + s * 0.32}
        stroke="#7c2d12"
        strokeWidth={s * 0.022}
        opacity={0.5}
      />
      <Ellipse
        cx={cx}
        cy={cy + s * 0.33}
        rx={s * 0.04}
        ry={s * 0.055}
        fill="#7c2d12"
        opacity={0.7}
      />
      <Circle
        cx={cx}
        cy={cy}
        r={s * 0.46}
        fill="none"
        stroke="#fed7aa"
        strokeWidth={s * 0.022}
        opacity={0.45}
      />
    </Svg>
  );
};

const BadgeL5 = ({ s }) => {
  const bx = s * 0.06;
  const by = s * 0.28;
  const bw = s * 0.62;
  const bh = s * 0.44;
  const rx = s * 0.08;
  const r1cx = s * 0.8;
  const r1cy = s * 0.38;
  const r2cx = s * 0.8;
  const r2cy = s * 0.62;
  const rr = s * 0.11;
  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Defs>
        <LG id="l5body" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#6ee7b7" />
          <Stop offset="1" stopColor="#064e3b" />
        </LG>
        <LG id="l5reel" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#a7f3d0" />
          <Stop offset="1" stopColor="#065f46" />
        </LG>
      </Defs>
      <Rect x={bx} y={by} width={bw} height={bh} rx={rx} fill="url(#l5body)" />
      <Circle
        cx={bx + bw * 0.38}
        cy={by + bh * 0.5}
        r={bh * 0.38}
        fill="#064e3b"
      />
      <Circle
        cx={bx + bw * 0.38}
        cy={by + bh * 0.5}
        r={bh * 0.24}
        fill="#022c22"
      />
      <Circle
        cx={bx + bw * 0.38}
        cy={by + bh * 0.5}
        r={bh * 0.11}
        fill="#6ee7b7"
        opacity={0.4}
      />
      <Rect
        x={bx + bw * 0.55}
        y={by - s * 0.09}
        width={s * 0.12}
        height={s * 0.12}
        rx={s * 0.03}
        fill="#065f46"
      />
      <Rect
        x={bx + bw - s * 0.01}
        y={by + bh * 0.25}
        width={s * 0.14}
        height={bh * 0.5}
        rx={s * 0.02}
        fill="#047857"
      />
      <Circle cx={r1cx} cy={r1cy} r={rr} fill="url(#l5reel)" />
      <Circle cx={r1cx} cy={r1cy} r={rr * 0.42} fill="#022c22" />
      <Circle cx={r2cx} cy={r2cy} r={rr} fill="url(#l5reel)" />
      <Circle cx={r2cx} cy={r2cy} r={rr * 0.42} fill="#022c22" />
    </Svg>
  );
};

const BadgeL6 = ({ s }) => {
  const cx = s / 2;
  const headR = s * 0.13;
  const headCy = s * 0.2;
  const bodyPts = `${cx - s * 0.06},${headCy + headR} ${cx + s * 0.06},${headCy + headR} ${cx + s * 0.14},${s * 0.72} ${cx - s * 0.14},${s * 0.72}`;
  const basePts = `${cx - s * 0.22},${s * 0.72} ${cx + s * 0.22},${s * 0.72} ${cx + s * 0.18},${s * 0.84} ${cx - s * 0.18},${s * 0.84}`;
  const halo = Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 8 - Math.PI / 2;
    const x1 = cx + s * 0.3 * Math.cos(a);
    const y1 = headCy + s * 0.3 * Math.sin(a);
    const x2 = cx + s * 0.44 * Math.cos(a);
    const y2 = headCy + s * 0.44 * Math.sin(a);
    return (
      <Line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#fde68a"
        strokeWidth={s * 0.022}
        opacity={0.55}
      />
    );
  });
  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Defs>
        <LG id="l6gold" x1="0" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor="#fef9c3" />
          <Stop offset="0.3" stopColor="#facc15" />
          <Stop offset="0.7" stopColor="#ca8a04" />
          <Stop offset="1" stopColor="#92400e" />
        </LG>
        <RadialGradient id="l6glow" cx="50%" cy="30%" r="60%">
          <Stop offset="0" stopColor="#fef08a" stopOpacity="0.45" />
          <Stop offset="1" stopColor="#facc15" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={cx} cy={headCy} r={s * 0.46} fill="url(#l6glow)" />
      {halo}
      <Polygon points={bodyPts} fill="url(#l6gold)" />
      <Circle cx={cx} cy={headCy} r={headR} fill="url(#l6gold)" />
      <Polygon points={basePts} fill="url(#l6gold)" />
      <Circle
        cx={cx - s * 0.04}
        cy={headCy - s * 0.05}
        r={headR * 0.35}
        fill="#fff"
        opacity={0.3}
      />
    </Svg>
  );
};

const BadgeL7 = ({ s }) => {
  const cx = s / 2;
  const baseY = s * 0.74;
  const peaks = [
    { x: cx - s * 0.38, y: baseY },
    { x: cx - s * 0.26, y: s * 0.28 },
    { x: cx - s * 0.13, y: s * 0.44 },
    { x: cx, y: s * 0.14 },
    { x: cx + s * 0.13, y: s * 0.44 },
    { x: cx + s * 0.26, y: s * 0.28 },
    { x: cx + s * 0.38, y: baseY },
  ];
  const crownPts = [
    ...peaks.map((p) => `${p.x},${p.y}`),
    `${cx + s * 0.38},${baseY + s * 0.14}`,
    `${cx - s * 0.38},${baseY + s * 0.14}`,
  ].join(" ");
  const gems = [
    { cx: cx - s * 0.26, cy: s * 0.28 },
    { cx, cy: s * 0.14 },
    { cx: cx + s * 0.26, cy: s * 0.28 },
  ];
  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Defs>
        <LG id="l7crown" x1="0" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor="#f3e8ff" />
          <Stop offset="0.4" stopColor="#a855f7" />
          <Stop offset="1" stopColor="#4c1d95" />
        </LG>
        <LG id="l7gem" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#fae8ff" />
          <Stop offset="1" stopColor="#d946ef" />
        </LG>
        <RadialGradient id="l7glow" cx="50%" cy="40%" r="55%">
          <Stop offset="0" stopColor="#e879f9" stopOpacity="0.3" />
          <Stop offset="1" stopColor="#a855f7" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={cx} cy={s * 0.44} r={s * 0.46} fill="url(#l7glow)" />
      <Polygon points={crownPts} fill="url(#l7crown)" />
      <Rect
        x={cx - s * 0.38}
        y={baseY}
        width={s * 0.76}
        height={s * 0.14}
        rx={s * 0.03}
        fill="#6d28d9"
      />
      {gems.map((g, i) => (
        <G key={i}>
          <Circle cx={g.cx} cy={g.cy} r={s * 0.055} fill="url(#l7gem)" />
          <Circle
            cx={g.cx - s * 0.018}
            cy={g.cy - s * 0.018}
            r={s * 0.018}
            fill="#fff"
            opacity={0.5}
          />
        </G>
      ))}
      {[-s * 0.22, -s * 0.11, 0, s * 0.11, s * 0.22].map((dx, i) => (
        <Circle
          key={i}
          cx={cx + dx}
          cy={baseY + s * 0.07}
          r={s * 0.025}
          fill="#c4b5fd"
          opacity={0.7}
        />
      ))}
    </Svg>
  );
};

const BadgeL8 = ({ s }) => {
  const cx = s / 2;
  const cy = s / 2;
  const R1 = s * 0.46;
  const R2 = s * 0.34;
  const R3 = s * 0.2;
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 12;
    const x1 = cx + (R3 + s * 0.02) * Math.cos(a);
    const y1 = cy + (R3 + s * 0.02) * Math.sin(a);
    const x2 = cx + R1 * 0.92 * Math.cos(a);
    const y2 = cy + R1 * 0.92 * Math.sin(a);
    return (
      <Line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#fde68a"
        strokeWidth={i % 3 === 0 ? s * 0.03 : s * 0.015}
        opacity={i % 3 === 0 ? 0.7 : 0.35}
      />
    );
  });
  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Defs>
        <LG id="l8outer" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#fef3c7" />
          <Stop offset="0.4" stopColor="#f97316" />
          <Stop offset="0.75" stopColor="#dc2626" />
          <Stop offset="1" stopColor="#7f1d1d" />
        </LG>
        <LG id="l8inner" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#fffbeb" />
          <Stop offset="1" stopColor="#fbbf24" />
        </LG>
        <LG id="l8core" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#fff7ed" />
          <Stop offset="1" stopColor="#f97316" />
        </LG>
        <RadialGradient id="l8glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#fbbf24" stopOpacity="0.5" />
          <Stop offset="1" stopColor="#f97316" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={cx} cy={cy} r={s * 0.48} fill="url(#l8glow)" />
      {rays}
      <Polygon points={polyPts(cx, cy, R1, 6, 30)} fill="url(#l8outer)" />
      <Polygon points={polyPts(cx, cy, R2, 6, 0)} fill="url(#l8inner)" />
      <Circle cx={cx} cy={cy} r={R3} fill="url(#l8core)" />
      {[
        [-s * 0.06, -s * 0.06],
        [s * 0.06, -s * 0.06],
        [-s * 0.06, s * 0.06],
        [s * 0.06, s * 0.06],
      ].map(([dx, dy], i) => (
        <Rect
          key={i}
          x={cx + dx - s * 0.025}
          y={cy + dy - s * 0.025}
          width={s * 0.05}
          height={s * 0.05}
          rx={s * 0.01}
          fill="#92400e"
          opacity={0.45}
        />
      ))}
      <Polygon
        points={starPts(cx, cy, R3 * 0.48, R3 * 0.22, 5, -90)}
        fill="#fff"
        opacity={0.85}
      />
    </Svg>
  );
};

const BADGES = {
  1: BadgeL1,
  2: BadgeL2,
  3: BadgeL3,
  4: BadgeL4,
  5: BadgeL5,
  6: BadgeL6,
  7: BadgeL7,
  8: BadgeL8,
};

const LevelSymbol = ({ level = 1, size = 48 }) => {
  const meta = LEVEL_META[level] || LEVEL_META[1];
  const Badge = BADGES[level] || BADGES[1];

  return (
    <View style={[st.wrap, { width: size, height: size }]}>
      {meta.glow && <GlowRing color={meta.color} size={size} />}
      <Badge s={size} />
    </View>
  );
};

const st = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
});

export default LevelSymbol;
