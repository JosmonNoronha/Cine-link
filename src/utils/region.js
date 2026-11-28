import AsyncStorage from "@react-native-async-storage/async-storage";

// Regions offered in the picker. Any ISO country code works with the backend; these are the common ones.
export const REGIONS = [
  { code: "IN", name: "India" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
];

const KEY = "@discover_region";

// The phone's own region ("en-IN" -> "IN"). No extra package needed.
export function detectRegion() {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || "";
    const m = /[-_]([A-Za-z]{2})(?:[-_]|$)/.exec(locale);
    if (m) return m[1].toUpperCase();
  } catch (_e) {
    // fall through
  }
  return "US";
}

export async function loadRegion() {
  try {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved && /^[A-Z]{2}$/.test(saved)) return saved;
  } catch (_e) {
    // storage can fail; the detected region is fine
  }
  return detectRegion();
}

export async function saveRegion(code) {
  try {
    await AsyncStorage.setItem(KEY, code);
  } catch (_e) {
    // not critical
  }
}

export const regionName = (code) =>
  REGIONS.find((r) => r.code === code)?.name || code;
