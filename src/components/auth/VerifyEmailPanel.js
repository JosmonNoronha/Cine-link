import React from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const VerifyEmailPanel = ({
  email,
  cooldown,
  checking,
  resending,
  message,
  onCheck,
  onResend,
  onSwitchAccount,
  colors,
  buttonTextColor,
}) => (
  <View style={styles.wrap}>
    <View style={[styles.badge, { backgroundColor: `${colors.primary}22` }]}>
      <Ionicons name="mail-unread-outline" size={30} color={colors.primary} />
    </View>
    <Text style={[styles.title, { color: colors.text }]}>Verify your email</Text>
    <Text style={[styles.body, { color: colors.text }]}>We sent a verification link to</Text>
    <Text style={[styles.email, { color: colors.primary }]} numberOfLines={1}>
      {email}
    </Text>
    <Text style={[styles.hint, { color: colors.text }]}>
      Open the link, then come back. We'll continue automatically. Check your spam folder if you can't find it.
    </Text>

    {message ? (
      <Text style={[styles.message, { color: message.error ? "#ff6b6b" : colors.text }]} accessibilityLiveRegion="polite">
        {message.text}
      </Text>
    ) : null}

    <Pressable
      onPress={onCheck}
      disabled={checking}
      style={[styles.primary, { backgroundColor: colors.primary, opacity: checking ? 0.7 : 1 }]}
      accessibilityRole="button"
    >
      {checking ? (
        <ActivityIndicator color={buttonTextColor} />
      ) : (
        <Text style={[styles.primaryText, { color: buttonTextColor }]}>I've verified my email</Text>
      )}
    </Pressable>

    <Pressable
      onPress={onResend}
      disabled={cooldown > 0 || resending}
      style={[styles.secondary, { borderColor: colors.border, opacity: cooldown > 0 || resending ? 0.5 : 1 }]}
      accessibilityRole="button"
    >
      <Text style={[styles.secondaryText, { color: colors.text }]}>
        {resending ? "Sending…" : cooldown > 0 ? `Resend email in ${cooldown}s` : "Resend email"}
      </Text>
    </Pressable>

    <Pressable onPress={onSwitchAccount} hitSlop={8} style={styles.link} accessibilityRole="button">
      <Text style={[styles.linkText, { color: colors.text }]}>Use a different account</Text>
    </Pressable>
  </View>
);

export default VerifyEmailPanel;

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  badge: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3, marginBottom: 8 },
  body: { fontSize: 14.5, opacity: 0.7 },
  email: { fontSize: 15.5, fontWeight: "700", marginTop: 2, marginBottom: 12, maxWidth: "100%" },
  hint: { fontSize: 13.5, opacity: 0.6, textAlign: "center", lineHeight: 19, marginBottom: 16 },
  message: { fontSize: 13.5, textAlign: "center", marginBottom: 14 },
  primary: { alignSelf: "stretch", height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryText: { fontSize: 16, fontWeight: "700" },
  secondary: { alignSelf: "stretch", height: 50, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 10 },
  secondaryText: { fontSize: 15, fontWeight: "600" },
  link: { marginTop: 16, paddingVertical: 4 },
  linkText: { fontSize: 14, opacity: 0.6, textDecorationLine: "underline" },
});