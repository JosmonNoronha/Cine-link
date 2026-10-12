import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { passwordStrength } from "../../utils/authValidation";

const COLORS = ["#ff5a6e", "#ff5a6e", "#f2a93b", "#6fcf6f", "#2ecc71"];

const PasswordStrength = ({ password, textColor }) => {
  if (!password) return null;
  const { score, label } = passwordStrength(password);
  return (
    <View style={styles.row} accessibilityLabel={`Password strength: ${label}`}>
      <View style={styles.bars}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[styles.bar, { backgroundColor: i <= score ? COLORS[score] : "rgba(128,128,128,0.25)" }]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </View>
  );
};

export default React.memo(PasswordStrength);

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  bars: { flex: 1, flexDirection: "row", gap: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  label: { fontSize: 12, fontWeight: "600", opacity: 0.7, minWidth: 44, textAlign: "right" },
});