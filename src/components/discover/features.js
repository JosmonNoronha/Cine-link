// The Home hub menu. To add a feature: add an entry here (and its screen / feed); set ready: true when it ships.
// Entries with ready: false are shown dimmed with a "Soon" tag (set SHOW_COMING_SOON to false to hide them).
export const SHOW_COMING_SOON = true;

export const DISCOVER_FEATURES = [
  {
    id: "in-theaters",
    title: "In Theaters",
    subtitle: "Playing in cinemas now",
    icon: "ticket",
    color: "#ef5350",
    ready: true,
    route: "Feed",
    params: { feed: "in-theaters" },
  },
  {
    id: "upcoming",
    title: "Upcoming",
    subtitle: "Releases on the way",
    icon: "rocket",
    color: "#ab47bc",
    ready: true,
    route: "Feed",
    params: { feed: "upcoming" },
  },
  {
    id: "top-all-time",
    title: "Top of all time",
    subtitle: "Best-rated movies and series",
    icon: "trophy",
    color: "#ffb300",
    ready: true,
    route: "Feed",
    params: { feed: "top-all-time" },
  },
  {
    id: "calendar",
    title: "Release calendar",
    subtitle: "Movies and series by date",
    icon: "calendar",
    color: "#42a5f5",
    ready: true,
    route: "Calendar",
  },
  {
    id: "news",
    title: "News",
    subtitle: "Latest movie and TV headlines",
    icon: "newspaper",
    color: "#5c6bc0",
    ready: true,
    route: "News",
  },
  {
    id: "authors-choice",
    title: "Author's choice",
    subtitle: "Hand-picked for you",
    icon: "sparkles",
    color: "#26a69a",
    ready: true,
    route: "Feed",
    params: { feed: "authors-choice" },
  },
];

// What the shared FeedScreen needs to know about each list.
export const FEED_META = {
  "in-theaters": {
    title: "In Theaters",
    types: ["movie"],
    regionalTypes: ["movie"],
    dateLabel: "Released",
    subtitle: (regionName) => `Playing now in ${regionName}`,
    emptyText: "No movies found playing in this region right now.",
  },
  "authors-choice": {
    title: "Author's choice",
    types: ["movie", "tv"],
    typeLabels: { movie: "Movies", tv: "Series" },
    regionalTypes: [],
    showNote: true,
    subtitle: () => "Hand-picked by the CineLink author",
    emptyText: "No picks here yet. Check back soon!",
  },
  "top-all-time": {
    title: "Top of all time",
    types: ["movie", "tv"],
    typeLabels: { movie: "Movies", tv: "Series" },
    regionalTypes: [],
    ranked: true,
    watchedFilter: true, // "Hide watched" toggle
    subtitle: (_r, type) => (type === "movie" ? "Highest-rated movies ever" : "Highest-rated series ever"),
    emptyText: "Nothing to show right now.",
  },
  upcoming: {
    title: "Upcoming",
    types: ["movie", "tv"],
    typeLabels: { movie: "Movies", tv: "Series" },
    regionalTypes: ["movie"], // series premieres are not country-specific
    dateLabel: "Out",
    hideYear: true,
    subtitle: (regionName, type) =>
      type === "movie" ? `Coming to cinemas in ${regionName}` : "New series premiering soon",
    emptyText: "Nothing upcoming found right now.",
  },
};
