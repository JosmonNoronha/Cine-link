import { getGamificationData, syncGamificationData } from "../services/api";

// ─── XP & LEVELS ───────────────────────────────────────────
const XP_PER_WATCH = 25;
const XP_PER_LIST_COMPLETE = 100;
const XP_PER_LIST_CREATE = 15;
const XP_STREAK_BONUS = 10;

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
  // Watch milestones
  {
    id: "first_watch",
    title: "First Watch",
    desc: "Mark your first title as watched",
    how: "Mark any movie or series as watched in one of your watchlists.",
    icon: "eye-outline",
    condition: (s) => s.totalWatched >= 1,
  },
  {
    id: "five_watched",
    title: "Popcorn Time",
    desc: "Watch 5 movies or shows",
    how: "Mark 5 different titles as watched across any of your watchlists.",
    icon: "film-outline",
    condition: (s) => s.totalWatched >= 5,
  },
  {
    id: "ten_watched",
    title: "Movie Marathon",
    desc: "Watch 10 titles",
    how: "Keep going — mark 10 unique titles as watched.",
    icon: "play-circle-outline",
    condition: (s) => s.totalWatched >= 10,
  },
  {
    id: "twentyfive_watched",
    title: "Binge Master",
    desc: "Watch 25 titles",
    how: "Mark 25 unique titles as watched. You're on a roll!",
    icon: "tv-outline",
    condition: (s) => s.totalWatched >= 25,
  },
  {
    id: "fifty_watched",
    title: "Half Century",
    desc: "Watch 50 titles",
    how: "Hit 50 unique watched titles. A dedicated viewer!",
    icon: "medal-outline",
    condition: (s) => s.totalWatched >= 50,
  },
  {
    id: "hundred_watched",
    title: "Centurion",
    desc: "Watch 100 titles",
    how: "Reach 100 unique watched titles. A true screen devotee.",
    icon: "trophy-outline",
    condition: (s) => s.totalWatched >= 100,
  },

  // Watchlist milestones
  {
    id: "first_list",
    title: "Organizer",
    desc: "Create your first watchlist",
    how: "Create a new watchlist from the Watchlists screen.",
    icon: "list-outline",
    condition: (s) => s.listsCreated >= 1,
  },
  {
    id: "three_lists",
    title: "Curator",
    desc: "Create 3 watchlists",
    how: "Build 3 separate watchlists to organise your movie journey.",
    icon: "layers-outline",
    condition: (s) => s.listsCreated >= 3,
  },
  {
    id: "five_lists",
    title: "Archivist",
    desc: "Create 5 watchlists",
    how: "Create 5 watchlists to earn this badge.",
    icon: "library-outline",
    condition: (s) => s.listsCreated >= 5,
  },
  {
    id: "first_complete",
    title: "Completionist",
    desc: "Complete your first watchlist",
    how: "Mark every title in a watchlist as watched.",
    icon: "checkmark-circle-outline",
    condition: (s) => s.listsCompleted >= 1,
  },
  {
    id: "three_complete",
    title: "Perfectionist",
    desc: "Complete 3 watchlists",
    how: "Finish watching every title in 3 different watchlists.",
    icon: "ribbon-outline",
    condition: (s) => s.listsCompleted >= 3,
  },
  {
    id: "five_complete",
    title: "Overclocker",
    desc: "Complete 5 watchlists",
    how: "Fully complete 5 watchlists. You leave no title unwatched.",
    icon: "flash-outline",
    condition: (s) => s.listsCompleted >= 5,
  },

  // Streak milestones
  {
    id: "streak_3",
    title: "On a Roll",
    desc: "3-day watch streak",
    how: "Watch at least one title every day for 3 consecutive days.",
    icon: "flame-outline",
    condition: (s) => s.bestStreak >= 3,
  },
  {
    id: "streak_7",
    title: "Week Warrior",
    desc: "7-day watch streak",
    how: "Keep a 7-day daily watch streak without missing a day.",
    icon: "thunderstorm-outline",
    condition: (s) => s.bestStreak >= 7,
  },
  {
    id: "streak_14",
    title: "Unstoppable",
    desc: "14-day watch streak",
    how: "Maintain a 14-day streak. Dedication level: extreme.",
    icon: "barbell-outline",
    condition: (s) => s.bestStreak >= 14,
  },
  {
    id: "streak_30",
    title: "Cinematic Life",
    desc: "30-day watch streak",
    how: "Watch something every single day for a full month.",
    icon: "moon-outline",
    condition: (s) => s.bestStreak >= 30,
  },

  // Binge patterns
  {
    id: "daily_double",
    title: "Double Feature",
    desc: "Watch 2 titles in a single day",
    how: "Mark 2 different titles as watched on the same calendar day.",
    icon: "albums-outline",
    condition: (s) =>
      Object.values(s.dailyWatchCounts || {}).some((c) => c >= 2),
  },
  {
    id: "triple_feature",
    title: "Triple Feature",
    desc: "Watch 3 titles in a single day",
    how: "Mark 3 different titles as watched in one day. Movie night!",
    icon: "grid-outline",
    condition: (s) =>
      Object.values(s.dailyWatchCounts || {}).some((c) => c >= 3),
  },
  {
    id: "weekly_binge",
    title: "Weekend Warrior",
    desc: "Watch 5 titles in a single week",
    how: "Mark 5 distinct titles as watched within the same calendar week.",
    icon: "calendar-outline",
    condition: (s) =>
      Object.values(s.weeklyWatchCounts || {}).some((c) => c >= 5),
  },
  {
    id: "weekly_marathon",
    title: "Non-Stop",
    desc: "Watch 10 titles in a single week",
    how: "Watch 10 unique titles in one week. You are a machine.",
    icon: "rocket-outline",
    condition: (s) =>
      Object.values(s.weeklyWatchCounts || {}).some((c) => c >= 10),
  },
];

// ─── HELPERS ───────────────────────────────────────────────
const getToday = () => new Date().toISOString().split("T")[0];

const getWeekKey = () => {
  const d = new Date();
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7,
  );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
};

const defaultState = () => ({
  xp: 0,
  totalWatched: 0, // count of UNIQUE titles ever watched — only ever increases
  listsCreated: 0,
  listsCompleted: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastWatchDate: null,
  unlockedAchievements: [],
  watchedMovieIds: [], // permanent set of imdbIDs that have earned XP — never cleared
  completedListNames: [], // permanent set of list names that have earned completion XP — never cleared
  dailyWatchCounts: {}, // { "2024-01-15": 3 }
  weeklyWatchCounts: {}, // { "2024-W03": 7 }
});

export const getGamificationState = async () => {
  try {
    const cloud = await getGamificationData();
    return cloud ? { ...defaultState(), ...cloud } : defaultState();
  } catch {
    return defaultState();
  }
};

const saveState = async (state) => {
  await syncGamificationData(state);
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
  if (state.lastWatchDate === today) return state;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const newStreak =
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

/**
 * recordMovieWatched(imdbID)
 * - Awards XP exactly once per unique imdbID, permanently (blocks all toggle-farming).
 * - totalWatched counts UNIQUE titles ever watched — always stays correct regardless of toggles.
 * - Returns { state, newAchievements, xpGained, leveledUp, canEarnXp }
 */
export const recordMovieWatched = async (imdbID) => {
  let state = await getGamificationState();

  const watchedIds = state.watchedMovieIds || [];

  // If this title has already earned XP before, return immediately — no state change.
  if (imdbID && watchedIds.includes(imdbID)) {
    return {
      state,
      newAchievements: [],
      xpGained: 0,
      leveledUp: null,
      canEarnXp: false,
    };
  }

  const prevLevel = getLevelInfo(state.xp).current;

  // Permanently mark as earned so future toggles are ignored
  if (imdbID) {
    state.watchedMovieIds = [...watchedIds, imdbID];
  }

  state.totalWatched += 1;

  // Track daily + weekly counts (for binge badges — only first watch per title counts)
  const today = getToday();
  const weekKey = getWeekKey();
  state.dailyWatchCounts = {
    ...state.dailyWatchCounts,
    [today]: (state.dailyWatchCounts[today] || 0) + 1,
  };
  state.weeklyWatchCounts = {
    ...state.weeklyWatchCounts,
    [weekKey]: (state.weeklyWatchCounts[weekKey] || 0) + 1,
  };

  // Update streak and award XP
  state = updateStreak(state);
  const streakBonus =
    state.currentStreak > 1 ? (state.currentStreak - 1) * XP_STREAK_BONUS : 0;
  const xpGained = XP_PER_WATCH + streakBonus;
  state.xp += xpGained;

  const newAchievements = checkNewAchievements(state);
  await saveState(state);

  const newLevel = getLevelInfo(state.xp).current;
  const leveledUp = newLevel.level > prevLevel.level ? newLevel : null;

  return { state, newAchievements, xpGained, leveledUp, canEarnXp: true };
};

/**
 * recordMovieUnwatched — intentional no-op for XP/gamification.
 * totalWatched represents unique titles ever watched, so unwatching doesn't decrease it.
 * The imdbID stays in watchedMovieIds, so re-watching never re-earns XP.
 */
export const recordMovieUnwatched = async () => {
  const state = await getGamificationState();
  return { state, newAchievements: [] };
};

export const recordListCreated = async () => {
  let state = await getGamificationState();
  const prevLevel = getLevelInfo(state.xp).current;
  state.listsCreated += 1;
  state.xp += XP_PER_LIST_CREATE;
  const newAchievements = checkNewAchievements(state);
  await saveState(state);
  const newLevel = getLevelInfo(state.xp).current;
  const leveledUp = newLevel.level > prevLevel.level ? newLevel : null;
  return { state, newAchievements, leveledUp };
};

/**
 * recordListCompleted(listName)
 * - Awards +100 XP exactly once per named watchlist, permanently.
 * - Re-completing a list (unwatch last item then re-watch) never re-earns XP.
 */
export const recordListCompleted = async (listName) => {
  let state = await getGamificationState();

  const completedNames = state.completedListNames || [];

  // Already completed this list before — no XP, no state change.
  if (listName && completedNames.includes(listName)) {
    return {
      state,
      newAchievements: [],
      leveledUp: null,
      alreadyCompleted: true,
    };
  }

  const prevLevel = getLevelInfo(state.xp).current;

  if (listName) {
    state.completedListNames = [...completedNames, listName];
  }

  state.listsCompleted += 1;
  state.xp += XP_PER_LIST_COMPLETE;
  const newAchievements = checkNewAchievements(state);
  await saveState(state);
  const newLevel = getLevelInfo(state.xp).current;
  const leveledUp = newLevel.level > prevLevel.level ? newLevel : null;
  return { state, newAchievements, leveledUp, alreadyCompleted: false };
};

export { LEVELS, ACHIEVEMENTS, XP_PER_WATCH };
