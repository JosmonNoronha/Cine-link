import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { auth, firebaseAuth } from "../../firebaseConfig";
import { getFriendlyAuthError } from "../utils/authValidation";
import { deleteAccount } from "./api/account";
import logger from "./logger";

/** An error whose `message` is safe to show to the user. */
export class AccountDeletionError extends Error {
  constructor(message, { field = null, retryable = false } = {}) {
    super(message);
    this.name = "AccountDeletionError";
    this.field = field; // "password" when the password itself was the problem
    this.retryable = retryable;
  }
}

const KEEP_KEY = /theme/i; // keep device preferences such as dark mode

/** Removes everything cached on this device for the account, except device preferences. */
const clearLocalData = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const doomed = keys.filter((k) => !KEEP_KEY.test(k));
    if (doomed.length) await AsyncStorage.multiRemove(doomed);
  } catch (error) {
    logger.warn("Could not clear local data after account deletion", error?.message);
  }
};

const reauthenticate = async (password) => {
  const user = firebaseAuth?.currentUser;
  if (!user || !user.email) {
    throw new AccountDeletionError("You need to be signed in to delete your account.");
  }
  const usesPassword = user.providerData?.some((p) => p.providerId === "password");
  if (!usesPassword) {
    throw new AccountDeletionError(
      "This account doesn't use a password. Contact support to delete it.",
    );
  }

  try {
    await reauthenticateWithCredential(
      user,
      EmailAuthProvider.credential(user.email, password),
    );
    // The server checks when you last signed in, so make sure it sees the fresh token.
    await user.getIdToken(true);
  } catch (error) {
    const { message } = getFriendlyAuthError(error);
    const wrongPassword = [
      "auth/wrong-password",
      "auth/invalid-credential",
      "auth/invalid-login-credentials",
    ].includes(error?.code);
    throw new AccountDeletionError(wrongPassword ? "That password isn't right." : message, {
      field: wrongPassword ? "password" : null,
    });
  }
};

const explainServerError = (error) => {
  const status = error?.response?.status;
  const body = error?.response?.data?.error;

  if (!error?.response) {
    return new AccountDeletionError("No connection. Check your internet and try again.", {
      retryable: true,
    });
  }
  if (body?.code === "REAUTH_REQUIRED") {
    return new AccountDeletionError("For your security, please enter your password again.", {
      field: "password",
      retryable: true,
    });
  }
  if (status === 429) {
    return new AccountDeletionError("Too many attempts. Please try again later.");
  }
  return new AccountDeletionError(
    body?.userMessage || "We couldn't finish deleting your account. Please try again.",
    { retryable: true },
  );
};

/**
 * Re-checks the password, deletes the account on the server, then removes local data and
 * signs out. Throws AccountDeletionError (message is user-safe) if anything fails; if the
 * server step fails the account still exists and the user can simply try again.
 */
export const deleteAccountWithPassword = async (password) => {
  if (!password) {
    throw new AccountDeletionError("Enter your password to continue.", { field: "password" });
  }

  await reauthenticate(password);

  try {
    await deleteAccount();
  } catch (error) {
    logger.warn("Account deletion request failed", error?.response?.status, error?.message);
    throw explainServerError(error);
  }

  // The account is gone. From here on nothing may stop the user being signed out.
  await clearLocalData();
  try {
    await auth.signOut();
  } catch (error) {
    logger.warn("Sign out after account deletion failed", error?.code);
  }
};
