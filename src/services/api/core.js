import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { auth } from "../../../firebaseConfig";
import logger from "../logger";

const normalizeDevBaseUrl = (url) => {
  if (!url) return url;
  // Android emulators can't reach host machine via localhost.
  // Use 10.0.2.2 for the default Android emulator (AVD).
  if (!__DEV__ || Platform.OS !== "android") return url;
  try {
    const u = new URL(url);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
      u.hostname = "10.0.2.2";
      return u.toString().replace(/\/+$/, "");
    }
  } catch {
    // Ignore parse errors and return original.
  }
  return url;
};

const PRODUCTION_BASE_URL =
  process.env.EXPO_PUBLIC_PRODUCTION_API_URL ||
  Constants?.expoConfig?.extra?.PRODUCTION_API_URL ||
  "https://cinelink-backend-n.onrender.com";
const EXPLICIT_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  Constants?.expoConfig?.extra?.API_BASE_URL;

const NORMALIZED_EXPLICIT_BASE_URL = normalizeDevBaseUrl(EXPLICIT_BASE_URL);

const isLocalhost =
  EXPLICIT_BASE_URL &&
  (EXPLICIT_BASE_URL.includes("localhost") ||
    EXPLICIT_BASE_URL.includes("127.0.0.1") ||
    EXPLICIT_BASE_URL.includes("10.0.2.2"));

export const API_BASE_URL =
  isLocalhost && __DEV__ ? NORMALIZED_EXPLICIT_BASE_URL : PRODUCTION_BASE_URL;

logger.info("🔧 API Configuration:");
logger.info("  - Base URL:", API_BASE_URL);
logger.info("  - Platform:", Platform.OS);
logger.info("  - Dev Mode:", __DEV__);
logger.info("  - Production URL:", PRODUCTION_BASE_URL);
logger.info("  - Explicit URL:", NORMALIZED_EXPLICIT_BASE_URL);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

const backendStatus = {
  available: true,
  tested: true,
  actualWorkingURL: API_BASE_URL,
  lastBackendError: null,
};

const MAX_REQUEST_RETRIES = 2;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const createIdempotencyKey = (prefix = "evt") => {
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `${prefix}-${Date.now()}-${randomPart}`;
};

const isRetryableError = (error) => {
  const status = error?.response?.status;
  const code = error?.code;
  const message = String(error?.message || "").toLowerCase();

  if (status >= 500) return true;
  if (code === "ECONNABORTED" || code === "ERR_NETWORK") return true;
  if (message.includes("timeout") || message.includes("network error"))
    return true;
  return false;
};

apiClient.interceptors.request.use(async (config) => {
  logger.info(
    "🌐 API Request:",
    config.method?.toUpperCase(),
    config.baseURL,
    config.url,
  );
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.__retryCount = config.__retryCount || 0;
  } catch (error) {
    logger.warn("Failed to get auth token:", error);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    logger.info("✅ API Response:", response.config.url, response.data);
    backendStatus.available = true;
    backendStatus.lastBackendError = null;

    if (
      response?.data &&
      typeof response.data === "object" &&
      response.data.success === true &&
      Object.prototype.hasOwnProperty.call(response.data, "data")
    ) {
      return response.data.data;
    }
    return response.data;
  },
  async (error) => {
    logger.info("🚨 API Error:", error.message, error.config?.url);
    logger.info("🚨 API Error Code:", error.code);
    logger.info("🚨 API Error Config:", error.config?.url);

    if (
      error.response?.status === 401 &&
      error.config &&
      !error.config.__isAuthRetry
    ) {
      try {
        const user = auth.currentUser;
        if (user) {
          const freshToken = await user.getIdToken(true);
          const nextConfig = {
            ...error.config,
            __isAuthRetry: true,
            headers: {
              ...(error.config.headers || {}),
              Authorization: `Bearer ${freshToken}`,
            },
          };
          return apiClient.request(nextConfig);
        }
      } catch {
        // Fall through to normal rejection.
      }
    }

    if (
      error.config &&
      isRetryableError(error) &&
      (error.config.__retryCount || 0) < MAX_REQUEST_RETRIES
    ) {
      const nextRetry = (error.config.__retryCount || 0) + 1;
      const backoffMs = 400 * 2 ** (nextRetry - 1);
      error.config.__retryCount = nextRetry;
      await wait(backoffMs);
      return apiClient.request(error.config);
    }

    backendStatus.available = false;
    backendStatus.lastBackendError = error.message || "Request failed";
    return Promise.reject(error);
  },
);

export const getBackendStatusSnapshot = () => ({
  available: backendStatus.available,
  tested: backendStatus.tested,
  baseUrl: backendStatus.actualWorkingURL,
  lastError: backendStatus.lastBackendError,
});

export const resetBackendStatus = () => {
  backendStatus.tested = true;
  backendStatus.available = true;
  backendStatus.lastBackendError = null;
  backendStatus.actualWorkingURL = API_BASE_URL;
  return true;
};
