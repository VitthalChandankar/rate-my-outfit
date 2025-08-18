// File: src/store/contestStore.js
import { create } from 'zustand';
import {
  fbListContests,
  fbFetchContestEntries,
  fbCreateEntry,
  fbRateEntry,
  fbFetchContestLeaderboard,
} from '../services/firebase';
import useAuthStore from './authStore';

const useContestStore = create((set, get) => ({
  // contests
  contests: [],
  contestsLast: null,
  contestsLoading: false,
  contestsRefreshing: false,
  hasMoreContests: true,

  // entries per contest
  entries: {}, // { [contestId]: { items: [], last: null, loading: false, refreshing: false, hasMore: true } }
  // leaderboards per contest
  leaderboards: {},

  // list contests
  listContests: async ({ limit = 20, reset = false, status = 'active', country = 'all' } = {}) => {
    const state = get();
    if (reset) set({ contestsRefreshing: true });
    else set({ contestsLoading: true });

    const startAfterDoc = reset ? null : state.contestsLast;
    const res = await fbListContests({ limitCount: limit, startAfterDoc, status, country });

    if (res.success) {
      set({
        contests: reset ? res.items : [...state.contests, ...res.items],
        contestsLast: res.last || state.contestsLast,
        contestsLoading: false,
        contestsRefreshing: false,
        hasMoreContests: !!res.last,
      });
    } else {
      set({ contestsLoading: false, contestsRefreshing: false });
    }
    return res;
  },

  // fetch entries for a contest
  fetchEntries: async ({ contestId, limit = 24, reset = false } = {}) => {
    if (!contestId) return { success: false, error: 'contestId required' };
    const bag = get().entries[contestId] || { items: [], last: null, loading: false, refreshing: false, hasMore: true };
    const startAfterDoc = reset ? null : bag.last;

    const nextBag = { ...bag, loading: !reset, refreshing: reset };
    set({ entries: { ...get().entries, [contestId]: nextBag } });

    const res = await fbFetchContestEntries({ contestId, limitCount: limit, startAfterDoc });

    if (res.success) {
      const merged = reset ? res.items : [...bag.items, ...res.items];
      set({
        entries: {
          ...get().entries,
          [contestId]: {
            items: merged,
            last: res.last || bag.last,
            loading: false,
            refreshing: false,
            hasMore: !!res.last,
          },
        },
      });
    } else {
      set({
        entries: { ...get().entries, [contestId]: { ...bag, loading: false, refreshing: false } },
      });
    }
    return res;
  },

  // create entry
  createEntry: async ({ contestId, imageUrl, caption = '', tags = [] }) => {
    const { user } = useAuthStore.getState();
    if (!user?.uid) return { success: false, error: 'Not authenticated' };
    const res = await fbCreateEntry({ contestId, userId: user.uid, imageUrl, caption, tags });
    // Prepend locally into entries bag for better UX
    if (res.success) {
      const bag = get().entries[contestId] || { items: [], last: null, hasMore: true, loading: false, refreshing: false };
      const item = { id: res.id, ...res.data, imageUrl, caption, tags, userId: user.uid };
      set({ entries: { ...get().entries, [contestId]: { ...bag, items: [item, ...bag.items] } } });
    }
    return res;
  },

  // rate entry (0–10) and optional aiFlag
  rateEntry: async ({ entryId, contestId, rating, aiFlag = false }) => {
    const { user } = useAuthStore.getState();
    if (!user?.uid) return { success: false, error: 'Not authenticated' };
    const res = await fbRateEntry({ entryId, contestId, userId: user.uid, rating, aiFlag });
    // Optionally update local entry stats (best-effort)
    if (res.success && contestId) {
      const bag = get().entries[contestId];
      if (bag?.items?.length) {
        const items = bag.items.map((it) => (it.id === entryId ? { ...it, averageRating: res.newAvg, ratingsCount: res.newCount, aiFlagsCount: res.aiFlagsCount } : it));
        set({ entries: { ...get().entries, [contestId]: { ...bag, items } } });
      }
    }
    return res;
  },

  // leaderboard for a contest
  fetchLeaderboard: async ({ contestId, limit = 50, minVotes = 10 }) => {
    if (!contestId) return { success: false, error: 'contestId required' };
    const res = await fbFetchContestLeaderboard({ contestId, limitCount: limit, minVotes });
    if (res.success) {
      set({ leaderboards: { ...get().leaderboards, [contestId]: res.items } });
    }
    return res;
  },
}));

export default useContestStore;
