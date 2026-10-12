import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ERROR = "#ff6b6b";

/**
 * Labelled input with a leading icon, focus ring, inline error and (for
 * passwords) a show/hide toggle. Pass `inputRef` to chain focus between fields.
 */
const AuthField = ({
  label,
  icon,
  error,
  secure = false,
  inputRef,
  colors,
  editable = true,
  onFocus,
  onBlur,
  children,
  ...inputProps
}) => {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderColor = error ? ERROR : focused ? colors.primary : colors.border;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View
        style={[
          styles.box,
          { borderColor, backgroundColor: colors.background, opacity: editable ? 1 : 0.6 },
          focused && styles.boxFocused,
        ]}
      >
        <Ionicons name={icon} size={18} color={focused ? colors.primary : colors.text} style={focused ? null : styles.dim} />
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.text }]}
          placeholderTextColor={`${colors.text}66`}
          secureTextEntry={secure && !revealed}
          editable={editable}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={label}
          {...inputProps}
        />
        {secure ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={10}
            disabled={!editable}
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
          >
            <Ionicons name={revealed ? "eye-off-outline" : "eye-outline"} size={20} color={colors.text} style={styles.dim} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      {children}
    </View>
  );
};

export default AuthField;

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "700", marginBottom: 7, opacity: 0.85 },
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  boxFocused: { borderWidth: 1.5 },
  input: { flex: 1, fontSize: 16, paddingVertical: 0, height: "100%" },
  dim: { opacity: 0.5 },
  error: { color: ERROR, fontSize: 12.5, marginTop: 6, marginLeft: 2 },
});