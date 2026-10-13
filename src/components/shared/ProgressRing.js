import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";

/**
 * Small circular progress with the percentage in the middle.
 * At 100% the number becomes a check mark.
 */
const ProgressRing = ({
  percent = 0,
  size = 30,
  stroke = 4,
  color = "#8792a5",
  trackColor = "rgba(135,146,165,0.16)",
  doneColor = "#8792a5",
  textColor = "#fff",
}) => {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  const done = pct === 100;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ringColor = done ? doneColor : color;

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${pct} percent watched`}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
      <Svg width={size} height={size} style={styles.svg}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - pct / 100)}
          // start at 12 o'clock, fill clockwise
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {done ? (
          <Ionicons name="checkmark" size={size * 0.42} color={doneColor} />
        ) : (
          <Text style={[styles.text, { color: textColor, fontSize: size * 0.255 }]}>{pct}</Text>
        )}
      </View>
    </View>
  );
};

export default React.memo(ProgressRing);

const styles = StyleSheet.create({
  svg: { position: "absolute" },
  center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  text: { fontWeight: "800", letterSpacing: -0.2 },
});