// Tiny pub/sub so the Explore feed, the Watchlists tab and the list screen stay
// in sync without passing callbacks through navigation params.
//
//   { type: "patch", id, patch }  – a list's counts/flags changed
//   { type: "removed", id }       – a list was deleted
//   { type: "library" }           – the user's library changed (create/delete/save/unsave)
// Subscribers may use "library" to refresh public-list contents after an item
// is added or removed from a list.

const listeners = new Set();

export const publicListEvents = {
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  emit(event) {
    listeners.forEach((fn) => {
      try {
        fn(event);
      } catch {
        // a bad listener must never break the others
      }
    });
  },
};

export default publicListEvents;