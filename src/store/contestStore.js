// File: src/store/contestStore.js
// Description: Zustand store for contests, entries, rating, leaderboard with user enrichment.

import { create } from 'zustand';
import {
  fbListContests,
  fbFetchContestEntries,
  fbCreateEntry,
  fbRateEntry,
  fbFetchContestLeaderboard,
  firestore, // exported from your services/firebase
} from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import useAuthStore from './authStore';

// Enrich leaderboard rows with users/{uid} -> { name, profilePicture }
async function enrichLeaderboardUsers(items) {
  const out = [...(items || [])];
  const userIds = Array.from(new Set(out.map((it) => it.userId).filter(Boolean)));

  // Fetch user docs; update matching rows
  await Promise.all(
    userIds.map(async (uid) => {
      try {
        const snap = await getDoc(doc(firestore, 'users', uid));
        if (snap.exists()) {
          const u = snap.data();
          for (let i = 0; i < out.length; i++) {
            if (out[i].userId === uid) {
              out[i] = {
                ...out[i],
                userName: u?.name || out[i].userName || `User ${String(uid).slice(0, 6)}`,
                userPhoto: u?.profilePicture || out[i].userPhoto || null,
              };
            }
          }
        }
      } catch {
        // ignore enrichment failures silently
      }
    })
  );

  return out;
}

const useContestStore = create((set, get) => ({
  // contests
  contests: [],
  contestsLast: null,
  contestsLoading: false,
  contestsRefreshing: false,
  hasMoreContests: true,

  // entries per contest
  // shape: { [contestId]: { items: [], last: null, loading: false, refreshing: false, hasMore: true } }
  entries: {},

  // leaderboards per contest
  // shape: { [contestId]: [rows...] }
  leaderboards: {},

  // List contests (active/upcoming/ended) with pagination
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

  // Fetch entries for a contest (paginated)
  fetchEntries: async ({ contestId, limit = 24, reset = false } = {}) => {
    if (!contestId) return { success: false, error: 'contestId required' };

    const bag = get().entries[contestId] || {
      items: [],
      last: null,
      loading: false,
      refreshing: false,
      hasMore: true,
    };
    const startAfterDoc = reset ? null : bag.last;

    const next = { ...bag, loading: !reset, refreshing: reset };
    set({ entries: { ...get().entries, [contestId]: next } });

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

  // Create contest entry
  createEntry: async ({ contestId, imageUrl, caption = '', tags = [] }) => {
    const { user } = useAuthStore.getState();
    if (!user?.uid) return { success: false, error: 'Not authenticated' };
    const res = await fbCreateEntry({ contestId, userId: user.uid, imageUrl, caption, tags });
    if (res.success) {
      // Optimistically prepend to entries list
      const bag = get().entries[contestId] || {
        items: [],
        last: null,
        hasMore: true,
        loading: false,
        refreshing: false,
      };
      const item = { id: res.id, ...res.data, imageUrl, caption, tags, userId: user.uid };
      set({ entries: { ...get().entries, [contestId]: { ...bag, items: [item, ...bag.items] } } });
    }
    return res;
  },

  // Rate an entry (0–10), optionally flag as AI
  rateEntry: async ({ entryId, contestId, rating, aiFlag = false }) => {
    const { user } = useAuthStore.getState();
    if (!user?.uid) return { success: false, error: 'Not authenticated' };
    const res = await fbRateEntry({ entryId, contestId, userId: user.uid, rating, aiFlag });

    // Update local entry stats best-effort
    if (res.success && contestId) {
      const bag = get().entries[contestId];
      if (bag?.items?.length) {
        const items = bag.items.map((it) =>
          it.id === entryId
            ? {
                ...it,
                averageRating: res.newAvg,
                ratingsCount: res.newCount,
                aiFlagsCount: res.aiFlagsCount,
              }
            : it
        );
        set({ entries: { ...get().entries, [contestId]: { ...bag, items } } });
      }
    }
    return res;
  },

  // Fetch leaderboard and enrich with usernames/avatars
  fetchLeaderboard: async ({ contestId, limit = 50, minVotes = 10 }) => {
    if (!contestId) return { success: false, error: 'contestId required' };
    const res = await fbFetchContestLeaderboard({ contestId, limitCount: limit, minVotes });
    if (res.success) {
      const enriched = await enrichLeaderboardUsers(res.items || []);
      set({ leaderboards: { ...get().leaderboards, [contestId]: enriched } });
    }
    return res;
  },
}));

export default useContestStore;
