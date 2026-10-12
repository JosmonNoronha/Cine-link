// Pure helpers for the auth screen: validation, password strength and
// Firebase error mapping. No React or Firebase imports, so they're trivial to test.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const MIN_PASSWORD_LENGTH = 8;

export const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

export const validateEmail = (value) => {
  const email = normalizeEmail(value);
  if (!email) return "Enter your email";
  if (!EMAIL_RE.test(email)) return "Enter a valid email address";
  return null;
};

export const validateUsername = (value) => {
  const name = String(value || "").trim();
  if (!name) return "Choose a username";
  if (name.length < 3) return "Use at least 3 characters";
  if (name.length > 20) return "Use 20 characters or fewer";
  if (!/^[a-zA-Z0-9_.]+$/.test(name)) return "Letters, numbers, _ and . only";
  return null;
};

// Sign-in only checks presence: never reject an existing password on strength.
export const validatePasswordSignIn = (value) => (value ? null : "Enter your password");

export const validatePasswordSignUp = (value) => {
  if (!value) return "Create a password";
  if (value.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters`;
  return null;
};

/** 0 (empty) … 4 (strong) plus a label, for the strength meter. */
export const passwordStrength = (value) => {
  const v = String(value || "");
  if (!v) return { score: 0, label: "" };
  let score = 0;
  if (v.length >= MIN_PASSWORD_LENGTH) score += 1;
  if (v.length >= 12) score += 1;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) score += 1;
  if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) score += 1;
  if (v.length < MIN_PASSWORD_LENGTH) score = Math.min(score, 1);
  score = Math.max(1, score);
  return { score, label: ["", "Weak", "Fair", "Good", "Strong"][score] };
};

const GENERIC = "Something went wrong. Please try again.";

/**
 * Maps a Firebase auth error to a user-safe message (never the raw message)
 * and, when it belongs to a specific input, which field to highlight.
 */
export const getFriendlyAuthError = (error) => {
  switch (error?.code) {
    case "auth/invalid-email":
      return { message: "That email address doesn't look right.", field: "email" };
    case "auth/email-already-in-use":
      return { message: "An account with this email already exists. Try signing in.", field: "email" };
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      return { message: "Choose a stronger password.", field: "password" };
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return { message: "Incorrect email or password.", field: null };
    case "auth/user-disabled":
      return { message: "This account has been disabled. Contact support for help.", field: null };
    case "auth/too-many-requests":
      return { message: "Too many attempts. Please wait a few minutes and try again.", field: null };
    case "auth/network-request-failed":
      return { message: "No connection. Check your internet and try again.", field: null };
    case "auth/operation-not-allowed":
      return { message: "Email sign-in isn't available right now.", field: null };
    default:
      // The init-failure mock throws a plain Error("Firebase not initialized").
      if (/not initialized/i.test(error?.message || "")) {
        return { message: "The app couldn't start sign-in. Please restart it.", field: null };
      }
      return { message: GENERIC, field: null };
  }
};