import { getApps, initializeApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  initializeAuth,
  getReactNativePersistence,
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

// --- ✅ Industry-standard Auth init for React Native ---

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const firestore = getFirestore(app);

// --- Auth helpers ---
async function signupWithEmail(name, email, password) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: name });
    }
    const userDoc = {
      uid: cred.user.uid,
      name,
      email,
      profilePicture: null,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(firestore, 'users', cred.user.uid), userDoc);
    return { success: true, user: userDoc };
  } catch (error) {
    return { success: false, error };
  }
}

async function loginWithEmail(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
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

// --- Cloudinary Image Upload (replaces Firebase Storage) ---
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
async function createOutfitDocument({ userId, imageUrl, caption = '', tags = [] }) {
  try {
    const docRef = await addDoc(collection(firestore, 'outfits'), {
      userId,
      imageUrl,
      caption,
      tags,
      createdAt: serverTimestamp(),
      averageRating: 0,
      ratingsCount: 0,
    });
    const created = await getDoc(docRef);
    return { success: true, id: docRef.id, data: created.data() };
  } catch (error) {
    return { success: false, error };
  }
}

async function fetchFeed({ limitCount = 12, startAfterDoc = null } = {}) {
  try {
    let q = query(collection(firestore, 'outfits'), orderBy('createdAt', 'desc'), limit(limitCount));
    if (startAfterDoc) q = query(collection(firestore, 'outfits'), orderBy('createdAt', 'desc'), startAfter(startAfterDoc), limit(limitCount));
    const snap = await getDocs(q);
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

async function fetchUserOutfits(userId, { limitCount = 50 } = {}) {
  try {
    const q = query(collection(firestore, 'outfits'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const items = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d.userId === userId) items.push({ id: docSnap.id, ...d });
    });
    return { success: true, items };
  } catch (error) {
    return { success: false, error };
  }
}

async function fetchOutfitDetails(outfitId) {
  try {
    const oRef = doc(firestore, 'outfits', outfitId);
    const oSnap = await getDoc(oRef);
    if (!oSnap.exists()) return { success: false, error: 'Not found' };

    const ratingsSnap = await getDocs(query(collection(firestore, 'ratings')));
    const ratings = [];
    ratingsSnap.forEach((r) => {
      const d = r.data();
      if (d.outfitId === outfitId) ratings.push({ id: r.id, ...d });
    });

    const commentsSnap = await getDocs(query(collection(firestore, 'comments')));
    const comments = [];
    commentsSnap.forEach((c) => {
      const d = c.data();
      if (d.outfitId === outfitId) comments.push({ id: c.id, ...d });
    });

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

async function addComment({ outfitId, userId, comment }) {
  try {
    const docRef = await addDoc(collection(firestore, 'comments'), {
      outfitId,
      userId,
      comment,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error };
  }
}

export {
  addComment, auth, createOutfitDocument,
  fetchFeed, fetchOutfitDetails, fetchUserOutfits, firestore, loginWithEmail,
  logout, onAuthChange, sendResetEmail, signupWithEmail, submitRating, uploadImage
};

