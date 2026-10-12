import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  AppState,
  Platform,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  reload,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";

import { auth, firebaseAuth } from "../../firebaseConfig";
import { useCustomTheme } from "../contexts/ThemeContext";
import GlassSegmentedControl from "../components/shared/GlassSegmentedControl";
import AuthField from "../components/auth/AuthField";
import PasswordStrength from "../components/auth/PasswordStrength";
import VerifyEmailPanel from "../components/auth/VerifyEmailPanel";
import {
  normalizeEmail,
  validateEmail,
  validateUsername,
  validatePasswordSignIn,
  validatePasswordSignUp,
  getFriendlyAuthError,
} from "../utils/authValidation";
import analyticsService from "../services/analytics";
import logger from "../services/logger";

const RESEND_COOLDOWN_S = 60;

const MODE_OPTIONS = [
  { key: "signIn", label: "Sign in", icon: "log-in-outline" },
  { key: "signUp", label: "Create account", icon: "person-add-outline" },
];

const SUBTITLE = {
  signIn: "Welcome back. Pick up where you left off.",
  signUp: "Track what you watch and share what you love.",
  forgot: "We'll email you a link to reset your password.",
  verify: "One last step.",
};

const SUBMIT_LABEL = { signIn: "Sign in", signUp: "Create account", forgot: "Send reset link" };

/**
 * Login / sign-up / password reset / email verification.
 *
 * Unverified users stay signed in (the navigator already keeps them on this
 * screen), so resending the link never needs their password again. The
 * navigator reacts to `onIdTokenChanged`, so verifying here moves the user into
 * the app without a sign-out / sign-in round trip.
 */
const AuthScreen = () => {
  const { colors } = useTheme();
  const { theme } = useCustomTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";
  const buttonTextColor = isDark ? "#0b1220" : "#ffffff";

  const pending = firebaseAuth?.currentUser && !firebaseAuth.currentUser.emailVerified ? firebaseAuth.currentUser : null;

  const [mode, setMode] = useState(pending ? "verify" : "signIn");
  const [verifyEmail, setVerifyEmail] = useState(pending?.email || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  // verify-mode state
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  const usernameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  // ── Resend cooldown (timestamp based, so it survives backgrounding) ─────────

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return undefined;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= cooldownUntil) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const cooldown = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const startCooldown = useCallback(() => {
    const until = Date.now() + RESEND_COOLDOWN_S * 1000;
    setNow(Date.now());
    setCooldownUntil(until);
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const clearMessages = useCallback(() => {
    setErrors({});
    setFormError("");
    setInfo("");
  }, []);

  const switchMode = useCallback(
    (next) => {
      clearMessages();
      setPassword("");
      setMode(next);
    },
    [clearMessages],
  );

  const setFieldError = (field, message) => setErrors((e) => ({ ...e, [field]: message }));

  const validators = useMemo(
    () => ({
      username: () => validateUsername(username),
      email: () => validateEmail(email),
      password: () => (mode === "signUp" ? validatePasswordSignUp(password) : validatePasswordSignIn(password)),
    }),
    [username, email, password, mode],
  );

  const blurValidate = (field) => () => {
    const value = field === "username" ? username : field === "email" ? email : password;
    if (!value) return; // don't nag about fields the user hasn't touched
    setFieldError(field, validators[field]());
  };

  const onChange = (field, setter) => (value) => {
    setter(value);
    if (errors[field]) setFieldError(field, null);
    if (formError) setFormError("");
  };

  const applyAuthError = useCallback((error) => {
    const { message, field } = getFriendlyAuthError(error);
    if (field) setFieldError(field, message);
    else setFormError(message);
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (busy) return;
    Keyboard.dismiss();
    clearMessages();

    const next = {};
    if (mode === "signUp") next.username = validators.username();
    next.email = validators.email();
    if (mode !== "forgot") next.password = validators.password();
    if (Object.values(next).some(Boolean)) {
      setErrors(next);
      return;
    }

    setBusy(true);
    const cleanEmail = normalizeEmail(email);

    try {
      if (mode === "signIn") {
        const { user } = await auth.signInWithEmailAndPassword(cleanEmail, password);
        if (!user.emailVerified) {
          setVerifyEmail(user.email || cleanEmail);
          setPassword("");
          setMode("verify");
        } else {
          analyticsService.setUser(user);
          analyticsService.trackAction("user_login", { method: "email" });
        }
        // Verified users are picked up by the navigator's auth listener.
      } else if (mode === "signUp") {
        const { user } = await auth.createUserWithEmailAndPassword(cleanEmail, password);
        analyticsService.trackAction("user_signup", { method: "email" });

        try {
          await updateProfile(user, { displayName: username.trim() });
        } catch (error) {
          logger.warn("Profile update failed", error?.code);
        }

        let sent = true;
        try {
          await sendEmailVerification(user);
        } catch (error) {
          sent = false;
          logger.warn("Verification email failed", error?.code);
        }

        if (!mountedRef.current) return;
        setVerifyEmail(cleanEmail);
        setPassword("");
        if (sent) startCooldown();
        setVerifyMessage(
          sent ? null : { error: true, text: "We couldn't send the email. Tap Resend to try again." },
        );
        setMode("verify");
      } else {
        // Forgot password. Same response whether or not the account exists.
        try {
          if (!firebaseAuth) throw new Error("Firebase not initialized");
          await sendPasswordResetEmail(firebaseAuth, cleanEmail);
        } catch (error) {
          if (error?.code !== "auth/user-not-found") throw error;
        }
        if (!mountedRef.current) return;
        setInfo("If an account exists for that email, a reset link is on its way.");
      }
    } catch (error) {
      logger.warn("Auth error", error?.code || error?.message);
      if (mountedRef.current) applyAuthError(error);
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }, [busy, mode, email, password, username, validators, clearMessages, applyAuthError, startCooldown]);

  // ── Verification ────────────────────────────────────────────────────────────

  const checkVerified = useCallback(
    async ({ silent = false } = {}) => {
      const user = firebaseAuth?.currentUser;
      if (!user) {
        switchMode("signIn");
        return;
      }
      if (!silent) {
        setChecking(true);
        setVerifyMessage(null);
      }
      try {
        await reload(user);
        if (user.emailVerified) {
          await user.getIdToken(true); // refresh the token so `email_verified` is true; also notifies the navigator
          analyticsService.setUser(user);
          analyticsService.trackAction("email_verified", { method: "email" });
        } else if (!silent && mountedRef.current) {
          setVerifyMessage({ error: true, text: "Not verified yet. Open the link in the email, then try again." });
        }
      } catch (error) {
        if (!silent && mountedRef.current) setVerifyMessage({ error: true, text: getFriendlyAuthError(error).message });
      } finally {
        if (mountedRef.current) setChecking(false);
      }
    },
    [switchMode],
  );

  const handleResend = useCallback(async () => {
    const user = firebaseAuth?.currentUser;
    if (!user || cooldown > 0 || resending) return;
    setResending(true);
    setVerifyMessage(null);
    try {
      await sendEmailVerification(user);
      startCooldown();
      setVerifyMessage({ error: false, text: "Verification email sent." });
    } catch (error) {
      setVerifyMessage({ error: true, text: getFriendlyAuthError(error).message });
    } finally {
      if (mountedRef.current) setResending(false);
    }
  }, [cooldown, resending, startCooldown]);

  const handleSwitchAccount = useCallback(async () => {
    try {
      await auth.signOut();
    } catch (error) {
      logger.warn("Sign out failed", error?.code);
    }
    setVerifyMessage(null);
    setCooldownUntil(0);
    switchMode("signIn");
  }, [switchMode]);

  // The user usually taps the link in their mail app: re-check on return,
  // and once on mount for users who verified while the app was closed.
  useEffect(() => {
    if (mode !== "verify") return undefined;
    checkVerified({ silent: true });
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkVerified({ silent: true });
    });
    return () => sub.remove();
  }, [mode, checkVerified]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const isForm = mode === "signIn" || mode === "signUp" || mode === "forgot";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        pointerEvents="none"
        colors={[`${colors.primary}${isDark ? "33" : "22"}`, "transparent"]}
        style={styles.glow}
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
        >
          <View style={styles.brand}>
            <Image source={require("../../assets/app-icon.png")} style={styles.logo} contentFit="cover" />
            <Text style={[styles.name, { color: colors.text }]}>CineLink</Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>{SUBTITLE[mode]}</Text>
          </View>

          <Animated.View
            key={isForm && mode !== "forgot" ? "main" : mode}
            entering={FadeInDown.duration(220)}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            {mode === "signIn" || mode === "signUp" ? (
              <View style={styles.segment}>
                <GlassSegmentedControl options={MODE_OPTIONS} value={mode} onChange={switchMode} theme={theme} />
              </View>
            ) : null}

            {mode === "forgot" ? (
              <Pressable onPress={() => switchMode("signIn")} hitSlop={10} style={styles.back} accessibilityRole="button">
                <Ionicons name="chevron-back" size={18} color={colors.text} />
                <Text style={[styles.backText, { color: colors.text }]}>Back to sign in</Text>
              </Pressable>
            ) : null}

            {mode === "verify" ? (
              <VerifyEmailPanel
                email={verifyEmail}
                cooldown={cooldown}
                checking={checking}
                resending={resending}
                message={verifyMessage}
                onCheck={() => checkVerified()}
                onResend={handleResend}
                onSwitchAccount={handleSwitchAccount}
                colors={colors}
                buttonTextColor={buttonTextColor}
              />
            ) : null}

            {isForm ? (
              <>
                {mode === "signUp" ? (
                  <AuthField
                    label="Username"
                    icon="person-outline"
                    colors={colors}
                    inputRef={usernameRef}
                    value={username}
                    onChangeText={onChange("username", setUsername)}
                    onBlur={blurValidate("username")}
                    error={errors.username}
                    placeholder="e.g. movie_buff"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    textContentType="username"
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    editable={!busy}
                    maxLength={20}
                  />
                ) : null}

                <AuthField
                  label="Email"
                  icon="mail-outline"
                  colors={colors}
                  inputRef={emailRef}
                  value={email}
                  onChangeText={onChange("email", setEmail)}
                  onBlur={blurValidate("email")}
                  error={errors.email}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType={mode === "forgot" ? "send" : "next"}
                  onSubmitEditing={mode === "forgot" ? handleSubmit : () => passwordRef.current?.focus()}
                  editable={!busy}
                />

                {mode !== "forgot" ? (
                  <AuthField
                    label="Password"
                    icon="lock-closed-outline"
                    colors={colors}
                    inputRef={passwordRef}
                    value={password}
                    onChangeText={onChange("password", setPassword)}
                    onBlur={blurValidate("password")}
                    error={errors.password}
                    placeholder={mode === "signUp" ? "At least 8 characters" : "Your password"}
                    secure
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete={mode === "signUp" ? "new-password" : "current-password"}
                    textContentType={mode === "signUp" ? "newPassword" : "password"}
                    returnKeyType="go"
                    onSubmitEditing={handleSubmit}
                    editable={!busy}
                  >
                    {mode === "signUp" ? <PasswordStrength password={password} textColor={colors.text} /> : null}
                  </AuthField>
                ) : null}

                {mode === "signIn" ? (
                  <Pressable onPress={() => switchMode("forgot")} hitSlop={8} style={styles.forgot} accessibilityRole="button">
                    <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
                  </Pressable>
                ) : null}

                {formError ? (
                  <View style={styles.banner} accessibilityLiveRegion="polite">
                    <Ionicons name="alert-circle" size={17} color="#ff6b6b" />
                    <Text style={styles.bannerText}>{formError}</Text>
                  </View>
                ) : null}
                {info ? (
                  <View style={[styles.banner, styles.bannerInfo]} accessibilityLiveRegion="polite">
                    <Ionicons name="checkmark-circle" size={17} color="#4caf50" />
                    <Text style={[styles.bannerText, { color: colors.text }]}>{info}</Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={handleSubmit}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.submit,
                    { backgroundColor: colors.primary, opacity: busy ? 0.7 : pressed ? 0.9 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ busy }}
                >
                  {busy ? (
                    <ActivityIndicator color={buttonTextColor} />
                  ) : (
                    <Text style={[styles.submitText, { color: buttonTextColor }]}>{SUBMIT_LABEL[mode]}</Text>
                  )}
                </Pressable>
              </>
            ) : null}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default AuthScreen;

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 320 },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 22 },
  brand: { alignItems: "center", marginBottom: 26 },
  logo: { width: 76, height: 76, borderRadius: 20, marginBottom: 14 },
  name: { fontSize: 30, fontWeight: "800", letterSpacing: -0.6 },
  subtitle: { fontSize: 14.5, opacity: 0.65, textAlign: "center", marginTop: 6, paddingHorizontal: 16 },
  card: { borderRadius: 26, borderWidth: StyleSheet.hairlineWidth, padding: 20 },
  segment: { marginBottom: 18 },
  back: { flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-start", marginBottom: 16, marginLeft: -4 },
  backText: { fontSize: 14, fontWeight: "600", opacity: 0.8 },
  forgot: { alignSelf: "flex-end", marginTop: -4, marginBottom: 14 },
  forgotText: { fontSize: 13.5, fontWeight: "700" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,107,107,0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  bannerInfo: { backgroundColor: "rgba(76,175,80,0.12)" },
  bannerText: { flex: 1, color: "#ff6b6b", fontSize: 13.5, lineHeight: 18 },
  submit: { height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 2 },
  submitText: { fontSize: 16.5, fontWeight: "800", letterSpacing: 0.2 },
});