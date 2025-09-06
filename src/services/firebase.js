// src/services/firebase.js
import { getApps, initializeApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { where, updateDoc, deleteDoc } from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  initializeAuth,
  getReactNativePersistence,
  sendEmailVerification,
  onAuthStateChanged,
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
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
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
async function createUser(uid, email, name) {
  const userDoc = {
    uid,
    name: name || 'New User',
    email: email || null,
    profilePicture: null,
    createdAt: serverTimestamp(),
    bio: '',
    stats: { followersCount: 0, followingCount: 0, postsCount: 0, contestWins: 0, averageRating: 0 },
    preferences: { privacyLevel: 'public', notificationsEnabled: true },
  };
  await setDoc(doc(firestore, 'users', uid), userDoc);
  await setDoc(doc(firestore, 'counters', uid), { followersCount: 0, followingCount: 0, postsCount: 0 }, { merge: true });
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
      imageUrl,
      caption,
      tags,
      createdAt: serverTimestamp(),
      averageRating: 0,
      ratingsCount: 0,
      likesCount: 0,
      commentsCount: 0,
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

async function submitRating({ outfitId, userId, stars, comment = '' }) {
  const ratingDocRef = doc(firestore, 'ratings', `${outfitId}_${userId}`);
  const outfitDocRef = doc(firestore, 'outfits', outfitId);
  try {
    await runTransaction(firestore, async (tx) => {
      const outfitSnap = await tx.get(outfitDocRef);
      if (!outfitSnap.exists()) throw new Error('Outfit not found');
      const outfitData = outfitSnap.data();
      const oldAvg = outfitData.averageRating || 0;
      const oldCount = outfitData.ratingsCount || 0;

      const existingRatingSnap = await tx.get(ratingDocRef);
      const previousRating = existingRatingSnap.exists() ? existingRatingSnap.data().rating : null;

      let newCount = oldCount;
      let newAvg = oldAvg;
      if (previousRating !== null) {
        const sum = oldAvg * oldCount - previousRating + stars;
        newAvg = newCount > 0 ? sum / newCount : stars;
      } else {
        const sum = oldAvg * oldCount + stars;
        newCount = oldCount + 1;
        newAvg = sum / newCount;
      }

      tx.set(ratingDocRef, {
        outfitId,
        userId,
        rating: stars,
        comment: comment || '',
        createdAt: serverTimestamp(),
      });
      tx.update(outfitDocRef, {
        averageRating: newAvg,
        ratingsCount: newCount,
      });
    });
    return { success: true };
  } catch (error) {
    console.error('submitRating error', error);
    return { success: false, error };
  }
}

async function addComment({ outfitId, userId, text, userMeta, parentId = null }) {
  const outfitRef = doc(firestore, 'outfits', outfitId);
  const commentRef = doc(collection(firestore, 'comments'));
  const parentCommentRef = parentId ? doc(firestore, 'comments', parentId) : null;

  try {
    await runTransaction(firestore, async (tx) => {
      const outfitSnap = await tx.get(outfitRef);
      if (!outfitSnap.exists()) throw new Error('Outfit not found');

      // Increment commentsCount on the outfit
      const newCount = (outfitSnap.data().commentsCount || 0) + 1;
      tx.update(outfitRef, { commentsCount: newCount });

      // If it's a reply, increment replyCount on the parent comment
      if (parentCommentRef) {
        const parentSnap = await tx.get(parentCommentRef);
        if (parentSnap.exists()) {
          const newReplyCount = (parentSnap.data().replyCount || 0) + 1;
          tx.update(parentCommentRef, { replyCount: newReplyCount });
        }
      }

      // Create the new comment document
      tx.set(commentRef, {
        outfitId,
        userId,
        user: userMeta,
        text,
        parentId,
        replyCount: 0,
        createdAt: serverTimestamp(),
      });
    });
    const newCommentSnap = await getDoc(commentRef);
    return { success: true, id: newCommentSnap.id, data: newCommentSnap.data() };
  } catch (error) {
    console.error('addComment error:', error);
    return { success: false, error };
  }
}

async function deleteComment({ commentId, outfitId, parentId }) {
  const outfitRef = doc(firestore, 'outfits', outfitId);
  const commentRef = doc(firestore, 'comments', commentId);
  const parentCommentRef = parentId ? doc(firestore, 'comments', parentId) : null;

  try {
    await runTransaction(firestore, async (tx) => {
      // Decrement commentsCount on the outfit
      const outfitSnap = await tx.get(outfitRef);
      if (outfitSnap.exists()) {
        const newCount = Math.max(0, (outfitSnap.data().commentsCount || 0) - 1);
        tx.update(outfitRef, { commentsCount: newCount });
      }

      // If it was a reply, decrement replyCount on the parent
      if (parentCommentRef) {
        const parentSnap = await tx.get(parentCommentRef);
        if (parentSnap.exists()) {
          const newReplyCount = Math.max(0, (parentSnap.data().replyCount || 0) - 1);
          tx.update(parentCommentRef, { replyCount: newReplyCount });
        }
      }

      // Delete the comment itself
      tx.delete(commentRef);
    });
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

async function toggleLikePost({ outfitId, userId }) {
  const likeRef = doc(firestore, 'likes', `${outfitId}_${userId}`);
  const outfitRef = doc(firestore, 'outfits', outfitId);
  try {
    let isLiked = false;
    await runTransaction(firestore, async (tx) => {
      const [likeSnap, outfitSnap] = await Promise.all([
        tx.get(likeRef),
        tx.get(outfitRef),
      ]);

      if (!outfitSnap.exists()) throw new Error('Outfit not found');

      const currentLikes = outfitSnap.data().likesCount || 0;

      if (likeSnap.exists()) {
        // It's already liked, so we are unliking it
        tx.delete(likeRef);
        tx.update(outfitRef, { likesCount: Math.max(0, currentLikes - 1) });
        isLiked = false;
      } else {
        // It's not liked, so we are liking it
        tx.set(likeRef, { outfitId, userId, createdAt: serverTimestamp() });
        tx.update(outfitRef, { likesCount: currentLikes + 1 });
        isLiked = true;
      }
    });
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

// --- Contests utilities ---
// Keep your existing implementations below; unchanged parts omitted for brevity.
// Ensure function names/exports stay identical to maintain compatibility.

async function fbListContests({ limitCount = 20, startAfterDoc = null, status = 'active', country = 'all' } = {}) {
  try {
    let qBase = query(collection(firestore, 'contests'), orderBy('startAt', 'desc'));
    let qy = query(collection(firestore, 'contests'), orderBy('startAt', 'desc'), limit(limitCount));
    if (startAfterDoc) qy = query(collection(firestore, 'contests'), orderBy('startAt', 'desc'), startAfter(startAfterDoc), limit(limitCount));
    const snap = await getDocs(qy);
    let items = [];
    snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
  
  // Client filter: status/country (for now)
    const now = Date.now();
    items = items.filter((c) => {
      const s = c.startAt?.seconds ? c.startAt.seconds * 1000 : (c.startAt || now);
      const e = c.endAt?.seconds ? c.endAt.seconds * 1000 : (c.endAt || now);
      const active = now >= s && now <= e;
      const ended = now > e;
      const upcoming = now < s;
      const okStatus = status === 'active' ? active : status === 'ended' ? ended : status === 'upcoming' ? upcoming : true;
      const okCountry = (country === 'all') || (!c.country) || c.country === country;
      return okStatus && okCountry;
    });
    const last = snap.docs[snap.docs.length - 1] || null;
    return { success: true, items, last };
  } catch (error) {
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

async function fbCreateEntry({ contestId, userId, imageUrl, caption = '', tags = [], userMeta = null }) {
  try {
    const docRef = await addDoc(collection(firestore, 'entries'), {
      outfitId,
      userId,
      user: userMeta || null,
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
    let result = { newAvg: null, newCount: null, aiFlagsCount: null };

    await runTransaction(firestore, async (tx) => {
      const entrySnap = await tx.get(entryRef);
      if (!entrySnap.exists()) throw new Error('Entry not found');
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
      result = { newAvg, newCount, aiFlagsCount };
    });
    return { success: true, ...result };
  } catch (error) {
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
  const followerCounter = doc(firestore, 'counters', followingId);
  const followingCounter = doc(firestore, 'counters', followerId);
  try {
    await runTransaction(firestore, async (tx) => {
      const rel = await tx.get(relRef);
      if (rel.exists()) return;
      tx.set(relRef, { followerId, followingId, createdAt: serverTimestamp() });
      const fc = await tx.get(followerCounter);
      const mg = fc.exists() ? fc.data() : {};
      tx.set(followerCounter, { ...mg, followersCount: (mg.followersCount || 0) + 1 }, { merge: true });
      const fg = await tx.get(followingCounter);
      const mg2 = fg.exists() ? fg.data() : {};
      tx.set(followingCounter, { ...mg2, followingCount: (mg2.followingCount || 0) + 1 }, { merge: true });
    });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

async function unfollowUser({ followerId, followingId }) {
  if (!followerId || !followingId || followerId === followingId) return { success: false, error: 'Invalid unfollow' };
  const relRef = doc(firestore, 'follows', `${followerId}_${followingId}`);
  const followerCounter = doc(firestore, 'counters', followingId);
  const followingCounter = doc(firestore, 'counters', followerId);
  try {
    await runTransaction(firestore, async (tx) => {
      const rel = await tx.get(relRef);
      if (!rel.exists()) return;
      tx.delete(relRef);
      const fc = await tx.get(followerCounter);
      const mg = fc.exists() ? fc.data() : {};
      tx.set(followerCounter, { ...mg, followersCount: Math.max(0, (mg.followersCount || 0) - 1) }, { merge: true });
      const fg = await tx.get(followingCounter);
      const mg2 = fg.exists() ? fg.data() : {};
      tx.set(followingCounter, { ...mg2, followingCount: Math.max(0, (mg2.followingCount || 0) - 1) }, { merge: true });
    });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

async function listFollowers({ userId, limitCount = 30, startAfterDoc = null }) {
  try {
    let qy = query(
      collection(firestore, 'follows'),
      where('followingId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
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

async function listFollowing({ userId, limitCount = 30, startAfterDoc = null }) {
  try {
    let qy = query(
      collection(firestore, 'follows'),
      where('followerId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
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

export {
  addComment, auth, createUser, createOutfitDocument,
  deleteComment, fetchCommentsForOutfit, fetchFeed, fetchOutfitDetails, fetchUserOutfits, firestore, loginWithEmail,
  logout, onAuthChange, sendResetEmail, signupWithEmail, submitRating, uploadImage,
  toggleLikePost, fetchMyLikedOutfitIds, fetchLikersForOutfit, fbListContests, fbFetchContestEntries, fbCreateEntry, fbRateEntry, fbFetchContestLeaderboard,
  getUserProfile, updateUserProfile, setUserAvatar, ensureUsernameUnique,
  followUser, unfollowUser, isFollowing, listFollowers, listFollowing
};
