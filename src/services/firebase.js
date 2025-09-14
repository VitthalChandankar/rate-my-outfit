// src/services/firebase.js
import { getApps, initializeApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { where, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  initializeAuth,
  getReactNativePersistence,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  runTransaction,
  documentId,
  serverTimestamp,
  setDoc,
  startAfter,
  deleteDoc as fbDeleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { uploadImageToCloudinary } from './cloudinaryService';

// --- Firebase config ---
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// --- Initialize App ---
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// --- Auth init for React Native ---
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const firestore = getFirestore(app);

// --- User creation helper ---
async function createUser(uid, email, name, phone = null) {
  const userDoc = {
    uid,
    name: name || 'New User',
    email: email || null,
    phone: phone || null, // Add phone number
    coverPhoto: null,
    profilePicture: null,
    createdAt: serverTimestamp(),
    bio: '',
    stats: { followersCount: 0, followingCount: 0, postsCount: 0, contestWins: 0, averageRating: 0, achievementsCount: 0 },
    preferences: { privacyLevel: 'public', notificationsEnabled: true },
    profileCompleted: false, // Add this flag for the new auth flow
  };
  await setDoc(doc(firestore, 'users', uid), userDoc);
  return userDoc;
}

// --- Auth helpers ---
async function signupWithEmail(name, email, password) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: name });
      await sendEmailVerification(auth.currentUser);
    }
    const userDoc = await createUser(cred.user.uid, email, name);
    return { success: true, user: userDoc };
  } catch (error) {
    return { success: false, error };
  }
}

async function loginWithEmail(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    if (!cred.user.emailVerified) {
      // Prevent login if email is not verified and sign them out.
      await signOut(auth);
      return { success: false, error: { message: 'Please verify your email address before logging in. Check your inbox for a verification link.' } };
    }
    const userSnap = await getDoc(doc(firestore, 'users', cred.user.uid));
    return { success: true, user: userSnap.exists() ? userSnap.data() : { uid: cred.user.uid, email } };
  } catch (error) {
    return { success: false, error };
  }
}

async function logout() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

async function sendResetEmail(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

function onAuthChange(cb) {
  return onAuthStateChanged(auth, cb);
}

// --- Cloudinary Image Upload ---
async function uploadImage(localUri) {
  try {
    const result = await uploadImageToCloudinary(localUri);
    return result; // { success: true, url } or { success: false, error }
  } catch (error) {
    console.error('uploadImage error', error);
    return { success: false, error };
  }
}

// --- Outfits CRUD ---
// CHANGE: include denormalized user meta, type, contestId, and like/comment counters
async function createOutfitDocument({ userId, imageUrl, caption = '', tags = [], userMeta = null, type = 'normal', contestId = null }) {
  try {
    const payload = {
      userId,
      user: userMeta || null, // { uid, name, username, profilePicture }
      type: type === 'contest' ? 'contest' : 'normal',
      contestId: type === 'contest' ? (contestId || null) : null,
      entryId: null, // Add a field to link back to the contest entry
      imageUrl,
      caption,
      tags,
      createdAt: serverTimestamp(),
      averageRating: 0,
      ratingsCount: 0,
      likesCount: 0,
      commentsCount: 0,
      aiFlagsCount: 0,
    };

    const docRef = await addDoc(collection(firestore, 'outfits'), payload);
    const created = await getDoc(docRef);
    // bump counters.postsCount - optional: Cloud Function will also keep in sync
    return { success: true, id: docRef.id, data: created.data() };
  } catch (error) {
    return { success: false, error };
  }
}

async function fetchFeed({ limitCount = 12, startAfterDoc = null } = {}) {
  try {
    let qy = query(collection(firestore, 'outfits'), orderBy('createdAt', 'desc'), limit(limitCount));
    if (startAfterDoc) qy = query(collection(firestore, 'outfits'), orderBy('createdAt', 'desc'), startAfter(startAfterDoc), limit(limitCount));
    const snap = await getDocs(qy);
    const items = [];
    snap.forEach((docSnap) => {
      items.push({ id: docSnap.id, ...docSnap.data() });
    });
    const last = snap.docs[snap.docs.length - 1] || null;
    return { success: true, items, last };
  } catch (error) {
    return { success: false, error };
  }
}

// FIX: server-side filter
async function fetchUserOutfits(userId, { limitCount = 50, startAfterDoc = null } = {}) {
  try {
    let qy = query(
      collection(firestore, 'outfits'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    if (startAfterDoc) {
      qy = query(
        collection(firestore, 'outfits'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        startAfter(startAfterDoc),
        limit(limitCount)
      );
    }
    const snap = await getDocs(qy);
    const items = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    const last = snap.docs[snap.docs.length - 1] || null;
    return { success: true, items, last };
  } catch (error) {
    return { success: false, error };
  }
}

async function deleteOutfit(outfitId, userId) {
  if (!outfitId || !userId) {
    return { success: false, error: 'Missing outfitId or userId' };
  }

  const outfitRef = doc(firestore, 'outfits', outfitId);

  try {
    const outfitSnap = await getDoc(outfitRef);
    if (!outfitSnap.exists()) {
      return { success: true }; // Already deleted
    }
    const outfitData = outfitSnap.data();
    if (outfitData.userId !== userId) {
      return { success: false, error: "Permission denied. You can only delete your own outfits." };
    }

    // If it's a contest entry, also delete the corresponding document from the 'entries' collection.
    // The most robust way to do this (and to delete from Cloudinary) is with a Cloud Function.
    // This client-side deletion is a good immediate improvement.
    if (outfitData.type === 'contest' && outfitData.entryId) {
      const entryRef = doc(firestore, 'entries', outfitData.entryId);
      await fbDeleteDoc(entryRef);
    }

    await fbDeleteDoc(outfitRef);
    return { success: true };
  } catch (error) {
    console.error('deleteOutfit error:', error);
    return { success: false, error };
  }
}

async function fetchOutfitDetails(outfitId) {
  try {
    const oRef = doc(firestore, 'outfits', outfitId);
    const oSnap = await getDoc(oRef);
    if (!oSnap.exists()) return { success: false, error: 'Not found' };

    // Efficiently fetch related documents instead of all of them
    const ratingsQuery = query(collection(firestore, 'ratings'), where('outfitId', '==', outfitId));
    const commentsQuery = query(collection(firestore, 'comments'), where('outfitId', '==', outfitId));

    const [ratingsSnap, commentsSnap] = await Promise.all([
      getDocs(ratingsQuery),
      getDocs(commentsQuery),
    ]);

    const ratings = ratingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const comments = commentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return { success: true, outfit: { id: oSnap.id, ...oSnap.data() }, ratings, comments };
  } catch (error) {
    return { success: false, error };
  }
}

async function addComment({ outfitId, userId, text, userMeta, parentId = null }) {
  // Cloud Function 'onCommentCreate' will handle counter increments and notifications.
  try {
    const docRef = await addDoc(collection(firestore, 'comments'), {
      outfitId,
      userId,
      user: userMeta,
      text,
      parentId,
      replyCount: 0,
      createdAt: serverTimestamp(),
    });
    const newCommentSnap = await getDoc(docRef);
    return { success: true, id: newCommentSnap.id, data: newCommentSnap.data() };
  } catch (error) {
    console.error('addComment error:', error);
    return { success: false, error };
  }
}

async function deleteComment({ commentId, outfitId, parentId }) {
  // Cloud Function 'onCommentDelete' will handle counter decrements.
  const commentRef = doc(firestore, 'comments', commentId);
  try {
    await deleteDoc(commentRef);
    return { success: true };
  } catch (error) {
    console.error('deleteComment error:', error);
    return { success: false, error };
  }
}

async function fetchCommentsForOutfit(outfitId) {
  try {
    const q = query(
      collection(firestore, 'comments'),
      where('outfitId', '==', outfitId),
      orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { success: true, items };
  } catch (error) {
    return { success: false, error };
  }
}

async function toggleLikePost({ outfitId, userId, postOwnerId }) {
  // Cloud Functions 'onLikeCreate' and 'onLikeDelete' will handle counters and notifications.
  const likeRef = doc(firestore, 'likes', `${outfitId}_${userId}`);
  try {
    const likeSnap = await getDoc(likeRef);
    let isLiked;
    if (likeSnap.exists()) {
      // It's already liked, so we are unliking it
      await deleteDoc(likeRef);
      isLiked = false;
    } else {
      // It's not liked, so we are liking it.
      await setDoc(likeRef, { outfitId, userId, createdAt: serverTimestamp() });
      isLiked = true;
    }
    return { success: true, isLiked };
  } catch (error) {
    console.error('toggleLikePost error:', error);
    return { success: false, error };
  }
}

async function fetchMyLikedOutfitIds(userId) {
  try {
    const q = query(collection(firestore, 'likes'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const ids = snap.docs.map(doc => doc.data().outfitId);
    return { success: true, ids };
  } catch (error) {
    return { success: false, error };
  }
}

async function fetchLikersForOutfit({ outfitId, limitCount = 30, startAfterDoc = null }) {
  try {
    let qy = query(
      collection(firestore, 'likes'),
      where('outfitId', '==', outfitId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    if (startAfterDoc) {
      qy = query(
        collection(firestore, 'likes'),
        where('outfitId', '==', outfitId),
        orderBy('createdAt', 'desc'),
        startAfter(startAfterDoc),
        limit(limitCount)
      );
    }
    const snap = await getDocs(qy);
    const likeDocs = snap.docs;
    const last = likeDocs[likeDocs.length - 1] || null;

    const userIds = likeDocs.map(like => like.data().userId).filter(Boolean);
    if (userIds.length === 0) return { success: true, users: [], last: null };

    const userPromises = userIds.map(uid => getDoc(doc(firestore, 'users', uid)));
    const userSnaps = await Promise.all(userPromises);
    const users = userSnaps.map(userSnap => userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null).filter(Boolean);

    return { success: true, users, last };
  } catch (error) {
    console.error('fetchLikersForOutfit failed:', error);
    return { success: false, error };
  }
}

async function toggleSavePost({ outfitId, userId }) {
  const saveRef = doc(firestore, 'saves', `${outfitId}_${userId}`);
  try {
    const saveSnap = await getDoc(saveRef);
    if (saveSnap.exists()) {
      await deleteDoc(saveRef);
      return { success: true, isSaved: false };
    } else {
      await setDoc(saveRef, { outfitId, userId, createdAt: serverTimestamp() });
      return { success: true, isSaved: true };
    }
  } catch (error) {
    console.error('toggleSavePost error:', error);
    return { success: false, error };
  }
}

async function fetchMySavedOutfitIds(userId) {
  try {
    const q = query(collection(firestore, 'saves'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const ids = snap.docs.map(doc => doc.data().outfitId);
    return { success: true, ids };
  } catch (error) {
    return { success: false, error };
  }
}

async function fetchOutfitsByIds(outfitIds = []) {
  if (outfitIds.length === 0) return { success: true, items: [] };
  const q = query(collection(firestore, 'outfits'), where(documentId(), 'in', outfitIds));
  const snap = await getDocs(q);
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return { success: true, items };
}

async function fetchUserAchievements(userId) {
  if (!userId) return { success: false, error: 'User ID is required.' };
  try {
    // In a real app, you might fetch all possible achievements and merge them
    // with the user's unlocked ones. For now, we fetch only what the user has.
    const q = query(
      collection(firestore, 'users', userId, 'userAchievements'),
      orderBy('unlockedAt', 'desc')
    );
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { success: true, items };
  } catch (error) {
    return { success: false, error };
  }
}

async function listAchievements() {
  try {
    const q = query(collection(firestore, "achievements"));
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, items };
  } catch (error) {
    console.error("listAchievements error:", error);
    return { success: false, error };
  }
}

async function createOrUpdateAchievement({ id, title, description, imageUri }) {
  try {
    let imageUrl = imageUri;
    // If imageUri is a local file path, upload it first.
    if (imageUri && !imageUri.startsWith("http")) {
      const uploadRes = await uploadImage(imageUri);
      if (!uploadRes.success) {
        throw new Error("Image upload failed.");
      }
      imageUrl = uploadRes.url;
    }
    await setDoc(doc(firestore, "achievements", id), { title, description, imageUrl }, { merge: true });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

async function fbFetchContestsByIds(contestIds = []) {
  if (!contestIds || contestIds.length === 0) {
    return { success: true, items: [] };
  }

  // Firestore 'in' queries are limited to 30 items. We must chunk the requests.
  const chunks = [];
  for (let i = 0; i < contestIds.length; i += 30) {
    chunks.push(contestIds.slice(i, i + 30));
  }

  try {
    const chunkPromises = chunks.map(chunk => {
      const q = query(collection(firestore, 'contests'), where(documentId(), 'in', chunk));
      return getDocs(q);
    });

    const chunkSnapshots = await Promise.all(chunkPromises);
    const items = [];
    chunkSnapshots.forEach(snap => {
      snap.docs.forEach(d => items.push({ id: d.id, ...d.data() }));
    });

    return { success: true, items };
  } catch (error) {
    console.error("fbFetchContestsByIds error:", error);
    return { success: false, error };
  }
}

// --- Contests utilities ---
// Keep your existing implementations below; unchanged parts omitted for brevity.
// Ensure function names/exports stay identical to maintain compatibility.

async function fbListContests({ limitCount = 20, startAfterDoc = null, status = 'active', country = 'all' } = {}) {
  try {
    const now = new Date();
    let qy = collection(firestore, 'contests');

    // IMPORTANT: If you use country filtering, you will need to create composite indexes in Firebase.
    // The error message in your console will provide a direct link to create them.
    // Example indexes needed: (country, endAt, asc), (country, startAt, asc), (country, endAt, desc)
    if (country && country !== 'all') {
      qy = query(qy, where('country', '==', country));
    }

    // Apply status-specific filtering and ordering.
    // Each status needs its own orderBy clause to be compatible with the 'where' filter.
    if (status === 'active') {
      // Firestore doesn't allow range filters on two different fields.
      // The workaround is to query on one and filter the other on the client.
      // We fetch all contests that haven't ended yet, sorted by which ends soonest.
      // The store will then filter out the 'upcoming' ones.
      qy = query(qy, where('endAt', '>', now), orderBy('endAt', 'asc'));
    } else if (status === 'upcoming') {
      // Show upcoming contests, with the soonest-starting ones first.
      qy = query(qy, where('startAt', '>', now), orderBy('startAt', 'asc'));
    } else if (status === 'ended') {
      // Show ended contests, with the most-recently-ended ones first.
      qy = query(qy, where('endAt', '<=', now), orderBy('endAt', 'desc'));
    } else {
      // Fallback for 'all' status, sorted by creation date.
      qy = query(qy, orderBy('createdAt', 'desc'));
    }

    // Apply pagination
    qy = query(qy, limit(limitCount));
    if (startAfterDoc) qy = query(qy, startAfter(startAfterDoc));

    const snap = await getDocs(qy);
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const last = snap.docs[snap.docs.length - 1] || null;
    return { success: true, items, last };
  } catch (error) {
    console.error("fbListContests error:", error);
    return { success: false, error };
  }
}

async function fbCreateContest({ title, theme, prize, imageUrl, startAt, endAt, host, country }) {
  try {
    const payload = {
      title,
      theme,
      prize,
      image: imageUrl, // Use 'image' to match ContestDetailsScreen
      host,
      country,
      startAt, // Should be a Firestore Timestamp
      endAt,   // Should be a Firestore Timestamp
      createdAt: serverTimestamp(),
      status: 'approved', // Admin-created contests are auto-approved
    };
    const docRef = await addDoc(collection(firestore, 'contests'), payload);
    const newContestSnap = await getDoc(docRef);
    return { success: true, id: docRef.id, data: newContestSnap.data() };
  } catch (error) {
    console.error('fbCreateContest error:', error);
    return { success: false, error };
  }
}

async function fbFetchContestEntries({ contestId, limitCount = 24, startAfterDoc = null } = {}) {
  try {
    let qy = query(
      collection(firestore, 'entries'),
      where('contestId', '==', contestId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    if (startAfterDoc) {
      qy = query(
        collection(firestore, 'entries'),
        where('contestId', '==', contestId),
        orderBy('createdAt', 'desc'),
        startAfter(startAfterDoc),
        limit(limitCount)
      );
    }
    const snap = await getDocs(qy);
    const items = [];
    snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
    const last = snap.docs[snap.docs.length - 1] || null;
    return { success: true, items, last };
  } catch (error) {
    return { success: false, error };
  }
}

async function fbCreateEntry({ contestId, userId, imageUrl, caption = '', tags = [], userMeta = null, outfitId = null }) {
  try {
    const docRef = await addDoc(collection(firestore, 'entries'), {
      contestId,
      userId,
      user: userMeta || null,
      outfitId, // Store the ID of the corresponding outfit post
      imageUrl,
      caption,
      tags,
      createdAt: serverTimestamp(),
      averageRating: 0,
      ratingsCount: 0,
      aiFlagsCount: 0,
      status: 'active',
    });
    const created = await getDoc(docRef);
    return { success: true, id: docRef.id, data: created.data() };
  } catch (error) {
    return { success: false, error };
  }
}

  // NEW: rate entry with transaction
async function fbRateEntry({ entryId, contestId, userId, rating, aiFlag = false }) {
  try {
    const ratingId = `${entryId}_${userId}`;
    const ratingRef = doc(firestore, 'ratings', ratingId);
    const entryRef = doc(firestore, 'entries', entryId);
    const contestRef = doc(firestore, 'contests', contestId);

    const result = await runTransaction(firestore, async (tx) => {
      const [entrySnap, contestSnap] = await Promise.all([
        tx.get(entryRef),
        tx.get(contestRef),
      ]);

      if (!entrySnap.exists()) throw new Error('Entry not found');
      if (!contestSnap.exists()) throw new Error('Contest not found');

      // Check if contest is active
      const contestData = contestSnap.data();
      const now = new Date();
      const endDate = contestData.endAt?.toDate ? contestData.endAt.toDate() : new Date();
      if (now > endDate) {
        throw new Error("This contest has ended and can no longer be rated.");
      }

      const data = entrySnap.data();
      const oldAvg = data.averageRating || 0;
      const oldCount = data.ratingsCount || 0;
      const oldAI = data.aiFlagsCount || 0;

      const ratingSnap = await tx.get(ratingRef);
      const hadPrev = ratingSnap.exists();
      const prevRating = hadPrev ? (ratingSnap.data().rating || 0) : null;
      const prevAIFlag = hadPrev ? !!ratingSnap.data().aiFlag : false;

      // Compute new count and sum
      let newCount = oldCount;
      let sum = oldAvg * oldCount;
      if (hadPrev) {
        sum = sum - prevRating + rating;
      } else {
        sum = sum + rating;
        newCount = oldCount + 1;
      }

      const newAvg = newCount > 0 ? sum / newCount : 0;

      // AI flags
      let aiFlagsCount = oldAI;
      if (prevAIFlag !== aiFlag) {
        aiFlagsCount = aiFlag ? oldAI + 1 : Math.max(0, oldAI - 1);
      }

      // Write rating (upsert)
      tx.set(ratingRef, {
        entryId,
        contestId,
        userId,
        rating,
        aiFlag: !!aiFlag,
        createdAt: serverTimestamp(),
      });
    
      // Update only the three stats fields
      tx.update(entryRef, {
        averageRating: newAvg,
        ratingsCount: newCount,
        aiFlagsCount,
      });
      return { newAvg, newCount, aiFlagsCount };
    });
    return { success: true, ...result };
  } catch (error) {
    console.error("fbRateEntry failed:", error);
    return { success: false, error };
  }
}

  
  // NEW: leaderboard for a contest (min votes)
async function fbFetchContestLeaderboard({ contestId, limitCount = 50, minVotes = 10 }) {
  try {
  // Basic approach: pull top N by createdAt window then filter client-side by minVotes and sort by averageRating
  const q = query(
      collection(firestore, 'entries'),
      where('contestId', '==', contestId),
      orderBy('createdAt', 'desc'),
  limit(400) // safety buffer, filtered client-side
    );
    const snap = await getDocs(qy);
    let items = [];
    snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
    items = items.filter((e) => (e.ratingsCount || 0) >= minVotes && e.status !== 'flagged');
    items.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    items = items.slice(0, limitCount);
    return { success: true, items };
  } catch (error) {
    return { success: false, error };
  }
}

// --- Profile & social helpers ---
async function getUserProfile(uid) {
  try {
    const snap = await getDoc(doc(firestore, 'users', uid));
    if (!snap.exists()) return { success: false, error: 'User not found' };
    const data = snap.data();
    return { success: true, user: { uid, ...data } };
  } catch (error) {
    return { success: false, error };
  }
}

async function ensureUsernameUnique(username, uid) {
  const uname = String(username || '').trim().toLowerCase();
  if (!/^[a-z0-9._]{3,20}$/.test(uname)) return { success: false, error: 'Invalid username' };
  const resRef = doc(firestore, 'usernames', uname);
  try {
    await runTransaction(firestore, async (tx) => {
      const snap = await tx.get(resRef);
      if (snap.exists()) {
        const owner = snap.data()?.uid;
        if (owner && owner !== uid) throw new Error('Username taken');
      }
      tx.set(resRef, { uid, updatedAt: serverTimestamp() });
    });
    return { success: true, username: uname };
  } catch (error) {
    return { success: false, error: error?.message || 'Username taken' };
  }
}

async function updateUserProfile({ uid, data }) {
  try {
    // Read current to compare username only if needed
    const curSnap = await getDoc(doc(firestore, 'users', uid));
    const cur = curSnap.exists() ? curSnap.data() : {};
    const next = { ...data };
    const hasUsername = typeof next.username === 'string';
    const normalized = hasUsername ? String(next.username || '').trim().toLowerCase() : null;

    // Only enforce uniqueness if username is a non-empty value and it changed
    if (hasUsername) {
      if (!normalized) {
        // If client passed empty or cleared username, remove it
        delete next.username;
      } else if (normalized !== (cur.username || '')) {
        const chk = await ensureUsernameUnique(normalized, uid);
        if (!chk.success) return chk;
        next.username = chk.username;
      } else {
        // unchanged username
        delete next.username;
      }
    }

    const updates = { ...next, updatedAt: serverTimestamp() };
    await updateDoc(doc(firestore, 'users', uid), updates);
    const fresh = await getUserProfile(uid);
    return fresh;
  } catch (error) {
    return { success: false, error };
  }
}

async function updateUserPushToken({ uid, token, remove = false }) {
  if (!uid || !token) return { success: false, error: 'Missing uid or token' };
  try {
    const userRef = doc(firestore, 'users', uid);
    const update = remove
      ? { pushTokens: arrayRemove(token) }
      : { pushTokens: arrayUnion(token) }; // Use arrayUnion to avoid duplicates
    await updateDoc(userRef, update);
    return { success: true };
  } catch (error) {
    console.error('updateUserPushToken error:', error);
    return { success: false, error };
  }
}

async function setUserAvatar({ uid, imageUrl }) {
  try {
    // Add a cache-busting version param so clients refresh the image
    const withVer = imageUrl.includes('?') ? `${imageUrl}&v=${Date.now()}` : `${imageUrl}?v=${Date.now()}`;
    await updateDoc(doc(firestore, 'users', uid), { profilePicture: withVer, updatedAt: serverTimestamp() });
    return await getUserProfile(uid);
  } catch (error) {
    return { success: false, error };
  }
}

async function isFollowing({ followerId, followingId }) {
  try {
    const fDoc = await getDoc(doc(firestore, 'follows', `${followerId}_${followingId}`));
    return { success: true, following: fDoc.exists() };
  } catch (error) {
    return { success: false, error };
  }
}

async function followUser({ followerId, followingId }) {
  if (!followerId || !followingId || followerId === followingId) return { success: false, error: 'Invalid follow' };
  const relRef = doc(firestore, 'follows', `${followerId}_${followingId}`);
  const followerUserRef = doc(firestore, 'users', followerId);
  const followingUserRef = doc(firestore, 'users', followingId);
  try {
    await runTransaction(firestore, async (tx) => {
      const [rel, followerSnap, followingSnap] = await Promise.all([
        tx.get(relRef),
        tx.get(followerUserRef),
        tx.get(followingUserRef),
      ]);

      if (rel.exists()) return;
      if (!followerSnap.exists() || !followingSnap.exists()) throw new Error('User not found');

      tx.set(relRef, { followerId, followingId, createdAt: serverTimestamp() });

      tx.update(followerUserRef, { 'stats.followingCount': (followerSnap.data().stats?.followingCount || 0) + 1 });
      tx.update(followingUserRef, { 'stats.followersCount': (followingSnap.data().stats?.followersCount || 0) + 1 });
    });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

async function unfollowUser({ followerId, followingId }) {
  if (!followerId || !followingId || followerId === followingId) return { success: false, error: 'Invalid unfollow' };
  const relRef = doc(firestore, 'follows', `${followerId}_${followingId}`);
  const followerUserRef = doc(firestore, 'users', followerId);
  const followingUserRef = doc(firestore, 'users', followingId);
  try {
    await runTransaction(firestore, async (tx) => {
      const [rel, followerSnap, followingSnap] = await Promise.all([
        tx.get(relRef),
        tx.get(followerUserRef),
        tx.get(followingUserRef),
      ]);

      if (!rel.exists()) return;

      tx.delete(relRef);

      if (followerSnap.exists()) tx.update(followerUserRef, { 'stats.followingCount': Math.max(0, (followerSnap.data().stats?.followingCount || 0) - 1) });
      if (followingSnap.exists()) tx.update(followingUserRef, { 'stats.followersCount': Math.max(0, (followingSnap.data().stats?.followersCount || 0) - 1) });
    });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

async function listFollowers({ userId, limitCount = 30, startAfterDoc = null, fetchAll = false }) {
  try {
    let qy = query(
      collection(firestore, 'follows'),
      where('followingId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    if (!fetchAll) {
      qy = query(qy, limit(limitCount));
    }
    if (startAfterDoc) {
      qy = query(
        collection(firestore, 'follows'),
        where('followingId', '==', userId),
        orderBy('createdAt', 'desc'),
        startAfter(startAfterDoc),
        limit(limitCount)
      );
    }
    const snap = await getDocs(qy);
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const last = snap.docs[snap.docs.length - 1] || null;
    return { success: true, items, last };
  } catch (error) {
    return { success: false, error };
  }
}

async function listFollowing({ userId, limitCount = 30, startAfterDoc = null, fetchAll = false }) {
  try {
    let qy = query(
      collection(firestore, 'follows'),
      where('followerId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    if (!fetchAll) {
      qy = query(qy, limit(limitCount));
    }
    if (startAfterDoc) {
      qy = query(
        collection(firestore, 'follows'),
        where('followerId', '==', userId),
        orderBy('createdAt', 'desc'),
        startAfter(startAfterDoc),
        limit(limitCount)
      );
    }
    const snap = await getDocs(qy);
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const last = snap.docs[snap.docs.length - 1] || null;
    return { success: true, items, last };
  } catch (error) {
    console.error('fetchUserOutfits failed:', error);
    return { success: false, error };
  }
}

async function fbSharePost({ senderId, recipientId, outfitData }) {
  try {
    const senderSnap = await getDoc(doc(firestore, 'users', senderId));
    if (!senderSnap.exists()) throw new Error('Sender not found');
    const sender = senderSnap.data();

    const payload = {
      senderId,
      senderName: sender.name || 'A user',
      senderProfilePicture: sender.profilePicture || null,
      recipientId,
      outfitId: outfitData.id,
      outfitImageUrl: outfitData.imageUrl,
      outfitCaption: outfitData.caption || '',
      createdAt: serverTimestamp(),
      read: false,
      reaction: null,
    };

    await addDoc(collection(firestore, 'shares'), payload);
    // In a real app, a Cloud Function would trigger here to send a push notification.
    return { success: true };
  } catch (error) {
    console.error('fbSharePost error:', error);
    return { success: false, error };
  }
}

async function fbFetchShares({ recipientId, limitCount = 20, startAfterDoc = null }) {
  try {
    let q = query(
      collection(firestore, 'shares'),
      where('recipientId', '==', recipientId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const last = snap.docs[snap.docs.length - 1] || null;
    return { success: true, items, last };
  } catch (error) {
    console.error('fbFetchShares error:', error);
    return { success: false, error };
  }
}

async function fbReactToShare({ shareId, reaction, read }) {
  try {
    const shareRef = doc(firestore, 'shares', shareId);
    const updates = {};
    if (reaction !== undefined) updates.reaction = reaction;
    if (read !== undefined) updates.read = read;

    if (Object.keys(updates).length > 0) {
      await updateDoc(shareRef, updates);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

async function fetchNotifications({ userId, limitCount = 20, startAfterDoc = null }) {
  try {
    let q = query(
      collection(firestore, 'notifications'),
      where('recipientId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    if (startAfterDoc) {
      q = query(
        collection(firestore, 'notifications'),
        where('recipientId', '==', userId),
        orderBy('createdAt', 'desc'),
        startAfter(startAfterDoc),
        limit(limitCount)
      );
    }
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const last = snap.docs[snap.docs.length - 1] || null;
    return { success: true, items, last };
  } catch (error) {
    console.error('fetchNotifications failed:', error);
    return { success: false, error };
  }
}

async function subscribeToUnreadNotifications(userId, onUpdate) {
  if (!userId) return () => {}; // Return a no-op unsubscribe function

  const q = query(
    collection(firestore, 'notifications'),
    where('recipientId', '==', userId),
    where('read', '==', false)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    onUpdate(snapshot.size);
  }, (error) => {
    console.error("Error subscribing to unread notifications:", error);
    onUpdate(0);
  });

  return unsubscribe;
}

async function markNotificationsAsRead(userId) {
  try {
    const q = query(
      collection(firestore, 'notifications'),
      where('recipientId', '==', userId),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(firestore);
    snap.docs.forEach(docSnap => {
      batch.update(docSnap.ref, { read: true });
    });
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('markNotificationsAsRead failed:', error);
    return { success: false, error };
  }
}

export {
  addComment, auth, createUser, createOutfitDocument,
  deleteComment, deleteOutfit, fetchCommentsForOutfit, fetchFeed, fetchOutfitDetails, fetchUserOutfits, firestore, loginWithEmail, fbCreateContest,
  logout, onAuthChange, sendResetEmail, signupWithEmail, uploadImage, fbFetchContestsByIds,
  toggleLikePost, fetchMyLikedOutfitIds, fetchLikersForOutfit, fbListContests, fbFetchContestEntries, fbCreateEntry, fbRateEntry, fbFetchContestLeaderboard, updateUserPushToken,
  getUserProfile, updateUserProfile, setUserAvatar, ensureUsernameUnique,
  followUser, unfollowUser, isFollowing, listFollowers, listFollowing,
  fetchNotifications, markNotificationsAsRead, subscribeToUnreadNotifications,
  fbSharePost, fbFetchShares, fbReactToShare, toggleSavePost, fetchMySavedOutfitIds, fetchOutfitsByIds, fetchUserAchievements, listAchievements, createOrUpdateAchievement
};
