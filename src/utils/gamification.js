import AsyncStorage from "@react-native-async-storage/async-storage";

const GAMIFICATION_KEY = "@cinelink_gamification";

// ─── XP & LEVELS ───────────────────────────────────────────
const XP_PER_WATCH = 25;
const XP_PER_LIST_COMPLETE = 100;
const XP_PER_LIST_CREATE = 15;
const XP_STREAK_BONUS = 10; // extra XP per streak day

const LEVELS = [
  { level: 1, title: "Newbie", xpNeeded: 0, icon: "🍿" },
  { level: 2, title: "Movie Buff", xpNeeded: 50, icon: "🎬" },
  { level: 3, title: "Cinephile", xpNeeded: 150, icon: "🎥" },
  { level: 4, title: "Film Critic", xpNeeded: 350, icon: "⭐" },
  { level: 5, title: "Director's Cut", xpNeeded: 600, icon: "🏆" },
  { level: 6, title: "Oscar Worthy", xpNeeded: 1000, icon: "🌟" },
  { level: 7, title: "Hall of Fame", xpNeeded: 1500, icon: "👑" },
  { level: 8, title: "Legend", xpNeeded: 2500, icon: "💎" },
];

// ─── ACHIEVEMENTS ──────────────────────────────────────────
const ACHIEVEMENTS = [
  {
    id: "first_watch",
    title: "First Watch",
    desc: "Mark your first movie as watched",
    icon: "🎉",
    condition: (s) => s.totalWatched >= 1,
  },
  {
    id: "five_watched",
    title: "Popcorn Time",
    desc: "Watch 5 movies",
    icon: "🍿",
    condition: (s) => s.totalWatched >= 5,
  },
  {
    id: "ten_watched",
    title: "Movie Marathon",
    desc: "Watch 10 movies",
    icon: "🎞️",
    condition: (s) => s.totalWatched >= 10,
  },
  {
    id: "twentyfive_watched",
    title: "Binge Master",
    desc: "Watch 25 movies",
    icon: "📺",
    condition: (s) => s.totalWatched >= 25,
  },
  {
    id: "fifty_watched",
    title: "Half Century",
    desc: "Watch 50 movies",
    icon: "🏅",
    condition: (s) => s.totalWatched >= 50,
  },
  {
    id: "first_list",
    title: "Organizer",
    desc: "Create your first watchlist",
    icon: "📋",
    condition: (s) => s.listsCreated >= 1,
  },
  {
    id: "three_lists",
    title: "Curator",
    desc: "Create 3 watchlists",
    icon: "🗂️",
    condition: (s) => s.listsCreated >= 3,
  },
  {
    id: "first_complete",
    title: "Completionist",
    desc: "Complete your first watchlist",
    icon: "✅",
    condition: (s) => s.listsCompleted >= 1,
  },
  {
    id: "three_complete",
    title: "Perfectionist",
    desc: "Complete 3 watchlists",
    icon: "💯",
    condition: (s) => s.listsCompleted >= 3,
  },
  {
    id: "streak_3",
    title: "On a Roll",
    desc: "3-day watch streak",
    icon: "🔥",
    condition: (s) => s.bestStreak >= 3,
  },
  {
    id: "streak_7",
    title: "Week Warrior",
    desc: "7-day watch streak",
    icon: "⚡",
    condition: (s) => s.bestStreak >= 7,
  },
  {
    id: "streak_14",
    title: "Unstoppable",
    desc: "14-day watch streak",
    icon: "💪",
    condition: (s) => s.bestStreak >= 14,
  },
];

// ─── HELPERS ───────────────────────────────────────────────
const getToday = () => new Date().toISOString().split("T")[0];

const defaultState = () => ({
  xp: 0,
  totalWatched: 0,
  listsCreated: 0,
  listsCompleted: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastWatchDate: null,
  unlockedAchievements: [],
});

export const getGamificationState = async () => {
  try {
    const raw = await AsyncStorage.getItem(GAMIFICATION_KEY);
    return raw ? { ...defaultState(), ...JSON.parse(raw) } : defaultState();
  } catch {
    return defaultState();
  }
};

const saveState = async (state) => {
  await AsyncStorage.setItem(GAMIFICATION_KEY, JSON.stringify(state));
};

// ─── LEVEL CALCULATIONS ────────────────────────────────────
export const getLevelInfo = (xp) => {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.xpNeeded) current = lvl;
    else break;
  }
  const next = LEVELS.find((l) => l.xpNeeded > xp) || null;
  const xpInLevel = xp - current.xpNeeded;
  const xpForNext = next ? next.xpNeeded - current.xpNeeded : 0;
  const progress = xpForNext > 0 ? xpInLevel / xpForNext : 1;
  return { current, next, xpInLevel, xpForNext, progress };
};

// ─── STREAK ────────────────────────────────────────────────
const updateStreak = (state) => {
  const today = getToday();
  if (state.lastWatchDate === today) return state; // already counted today

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let newStreak =
    state.lastWatchDate === yesterdayStr ? state.currentStreak + 1 : 1;
  return {
    ...state,
    currentStreak: newStreak,
    bestStreak: Math.max(state.bestStreak, newStreak),
    lastWatchDate: today,
  };
};

// ─── ACHIEVEMENT CHECK ─────────────────────────────────────
const checkNewAchievements = (state) => {
  const newlyUnlocked = [];
  for (const ach of ACHIEVEMENTS) {
    if (!state.unlockedAchievements.includes(ach.id) && ach.condition(state)) {
      newlyUnlocked.push(ach);
      state.unlockedAchievements.push(ach.id);
    }
  }
  return newlyUnlocked;
};

// ─── PUBLIC ACTIONS ────────────────────────────────────────
export const recordMovieWatched = async () => {
  let state = await getGamificationState();
  state.totalWatched += 1;
  state.xp += XP_PER_WATCH;
  state = updateStreak(state);
  state.xp += (state.currentStreak - 1) * XP_STREAK_BONUS; // streak bonus
  const newAchievements = checkNewAchievements(state);
  await saveState(state);
  return {
    state,
    newAchievements,
    xpGained: XP_PER_WATCH + (state.currentStreak - 1) * XP_STREAK_BONUS,
  };
};

export const recordMovieUnwatched = async () => {
  let state = await getGamificationState();
  state.totalWatched = Math.max(0, state.totalWatched - 1);
  // Don't remove XP — no punishment
  await saveState(state);
  return { state, newAchievements: [] };
};

export const recordListCreated = async () => {
  let state = await getGamificationState();
  state.listsCreated += 1;
  state.xp += XP_PER_LIST_CREATE;
  const newAchievements = checkNewAchievements(state);
  await saveState(state);
  return { state, newAchievements };
};

export const recordListCompleted = async () => {
  let state = await getGamificationState();
  state.listsCompleted += 1;
  state.xp += XP_PER_LIST_COMPLETE;
  const newAchievements = checkNewAchievements(state);
  await saveState(state);
  return { state, newAchievements };
};

export { LEVELS, ACHIEVEMENTS, XP_PER_WATCH };
