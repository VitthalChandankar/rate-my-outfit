/* eslint-disable object-curly-spacing */
/* eslint-disable max-len */
const admin = require("firebase-admin");
const {onDocumentCreated, onDocumentDeleted, onDocumentUpdated} = require("firebase-functions/v2/firestore");

admin.initializeApp();

const firestore = admin.firestore();

/**
 * Sends a push notification when a new document is created in the /notifications collection.
 */
exports.sendPushNotification = onDocumentCreated("notifications/{notificationId}", async (event) => {
    const snap = event.data;
    if (!snap) {
      console.log("No data associated with the event, exiting.");
      return;
    }

    const notificationData = snap.data();

    const { recipientId, senderId, senderName, type, commentText } = notificationData;

    // Prevent self-notifications
    if (senderId === recipientId) {
      console.log("Sender and recipient are the same, skipping notification.");
      return null;
    }

    if (!recipientId) {
      console.log("No recipient ID, exiting.");
      return null;
    }

    // Get the recipient's user document to find their push token(s)
    const recipientDoc = await firestore
      .collection("users")
      .doc(recipientId)
      .get();

    if (!recipientDoc.exists) {
      console.log(`Recipient ${recipientId} not found.`);
      return null;
    }

    const recipientData = recipientDoc.data();
    const pushTokens = recipientData.pushTokens; // Assumes tokens are stored in an array

    if (!pushTokens || pushTokens.length === 0) {
      console.log(`Recipient ${recipientId} has no push tokens.`);
      return null;
    }

    // Construct the notification message
    let title = "New Activity";
    let body = "";

    if (type === "like") {
      title = "New Like! ❤️";
      body = `${senderName} liked your outfit.`;
    } else if (type === "comment") {
      title = "New Comment! 💬";
      body = `${senderName}: ${commentText}`;
    } else if (type === "follow") {
      title = "New Follower! 👋";
      body = `${senderName} started following you.`;
    } else {
      console.log(`Unknown notification type: ${type}`);
      return null;
    }

    // Construct the payload for Expo's push service
    const messages = pushTokens.map((token) => ({
      to: token,
      sound: "default",
      title: title,
      body: body,
      data: {
        // For 'follow', navigate to the sender's profile. For others, to the outfit.
        // For 'comment' or 'like', navigate to the outfit details.
        outfitId: notificationData.outfitId,
        senderId: notificationData.senderId, // Add senderId for navigation
      },
    }));

    // Use fetch to call Expo's push API.
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

      const responseData = await response.json();

      // Add a check for non-successful HTTP responses from Expo's API
      if (!response.ok) {
        console.error("Error response from Expo Push API:", { status: response.status, body: responseData });
        return null;
      }

        console.log("Expo push response:", responseData);

      // Optional: Clean up invalid tokens that Expo reports.
      if (responseData.data && Array.isArray(responseData.data)) {
        const invalidTokens = [];
        responseData.data.forEach((ticket, i) => {
          // eslint-disable-next-line max-len
          if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
            invalidTokens.push(pushTokens[i]);
          }
        });

        if (invalidTokens.length > 0) {
          console.log("Removing invalid tokens:", invalidTokens);
          await recipientDoc.ref.update({
            pushTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
          });
        }
      }
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
    return null;
  });

/**
 * Handles creating a comment.
 * - Increments the comment count on the associated outfit.
 * - If it's a reply, increments the reply count on the parent comment.
 * - Creates a notification for the post owner.
 */
exports.onCommentCreate = onDocumentCreated("comments/{commentId}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const commentData = snap.data();
  const { outfitId, userId, parentId, text } = commentData;

  if (!outfitId || !userId) {
    console.error("Comment is missing outfitId or userId", snap.id);
    return;
  }

  const db = admin.firestore();
  const outfitRef = db.doc(`outfits/${outfitId}`);

  try {
    // 1. Increment outfit's commentsCount
    await outfitRef.update({ commentsCount: admin.firestore.FieldValue.increment(1) });

    // 2. If it's a reply, increment parent comment's replyCount
    if (parentId) {
      const parentCommentRef = db.doc(`comments/${parentId}`);
      await parentCommentRef.update({ replyCount: admin.firestore.FieldValue.increment(1) });
    }

    // 3. Create notification for post owner (if not self-comment)
    const outfitSnap = await outfitRef.get();
    const outfitData = outfitSnap.data();
    if (outfitData && outfitData.userId !== userId) {
      const senderProfile = (await db.doc(`users/${userId}`).get()).data();
      const notificationRef = db.collection("notifications").doc();
      await notificationRef.set({
        recipientId: outfitData.userId,
        senderId: userId,
        senderName: senderProfile?.name || "Someone",
        senderAvatar: senderProfile?.profilePicture || null,
        type: "comment",
        outfitId: outfitId,
        outfitImage: outfitData.imageUrl,
        commentText: text,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
      });
    }
  } catch (error) {
    console.error(`Error in onCommentCreate for comment ${snap.id}:`, error);
  }
});

/**
 * Handles deleting a comment.
 * - Decrements the comment count on the associated outfit.
 * - If it was a reply, decrements the reply count on the parent comment.
 */
exports.onCommentDelete = onDocumentDeleted("comments/{commentId}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const commentData = snap.data();
  const { outfitId, parentId } = commentData;

  if (!outfitId) return;

  const db = admin.firestore();
  const outfitRef = db.doc(`outfits/${outfitId}`);

  try {
    await outfitRef.update({ commentsCount: admin.firestore.FieldValue.increment(-1) });
    if (parentId) {
      const parentCommentRef = db.doc(`comments/${parentId}`);
      await parentCommentRef.update({ replyCount: admin.firestore.FieldValue.increment(-1) });
    }
  } catch (error) {
    console.error(`Error in onCommentDelete for comment ${snap.id}:`, error);
  }
});

/**
 * Handles creating a like.
 * - Increments the like count on the associated outfit.
 * - Creates a notification for the post owner.
 */
exports.onLikeCreate = onDocumentCreated("likes/{likeId}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const likeData = snap.data();
  const { outfitId, userId } = likeData;

  if (!outfitId || !userId) {
    console.error("Like is missing outfitId or userId", snap.id);
    return;
  }

  const db = admin.firestore();
  const outfitRef = db.doc(`outfits/${outfitId}`);

  try {
    // 1. Increment outfit's likesCount
    await outfitRef.update({ likesCount: admin.firestore.FieldValue.increment(1) });

    // 2. Create notification for post owner (if not self-like)
    const outfitSnap = await outfitRef.get();
    const outfitData = outfitSnap.data();
    if (outfitData && outfitData.userId !== userId) {
      const senderProfile = (await db.doc(`users/${userId}`).get()).data();
      const notificationRef = db.collection("notifications").doc();
      await notificationRef.set({
        recipientId: outfitData.userId,
        senderId: userId,
        senderName: senderProfile?.name || "Someone",
        senderAvatar: senderProfile?.profilePicture || null,
        type: "like",
        outfitId: outfitId,
        outfitImage: outfitData.imageUrl,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
      });
    }
  } catch (error) {
    console.error(`Error in onLikeCreate for like ${snap.id}:`, error);
  }
});

/**
 * Handles deleting a like.
 * - Decrements the like count on the associated outfit.
 */
exports.onLikeDelete = onDocumentDeleted("likes/{likeId}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const likeData = snap.data();
  const { outfitId } = likeData;

  if (!outfitId) return;

  const db = admin.firestore();
  const outfitRef = db.doc(`outfits/${outfitId}`);
  try {
    await outfitRef.update({ likesCount: admin.firestore.FieldValue.increment(-1) });
  } catch (error) {
    console.error(`Error in onLikeDelete for like ${snap.id}:`, error);
  }
});

/**
 * Updates user stats when a follow relationship is created and sends a notification.
 */
exports.onFollowCreate = onDocumentCreated("follows/{followId}", async (event) => {
  const snap = event.data;
  if (!snap) {
    console.log("No data on follow create, exiting.");
    return;
  }
  const followData = snap.data();
  const {followerId, followingId} = followData;

  if (!followerId || !followingId) {
    console.error("Missing followerId or followingId in follow document.");
    return;
  }

  const db = admin.firestore();
  const followerRef = db.doc(`users/${followerId}`);
  const followingRef = db.doc(`users/${followingId}`);

  try {
    // Update counts in a transaction
    await db.runTransaction(async (tx) => {
      const [followerSnap, followingSnap] = await Promise.all([
        tx.get(followerRef),
        tx.get(followingRef),
      ]);

      if (followerSnap.exists) {
        const newFollowingCount = (followerSnap.data().stats?.followingCount || 0) + 1;
        tx.update(followerRef, {"stats.followingCount": newFollowingCount});
      }
      if (followingSnap.exists) {
        const newFollowersCount = (followingSnap.data().stats?.followersCount || 0) + 1;
        tx.update(followingRef, {"stats.followersCount": newFollowersCount});
      }
    });
    console.log(`Successfully updated counts for follow: ${followerId} -> ${followingId}`);

    // Create a notification for the new follower
    const followerProfile = (await followerRef.get()).data();
    const notificationRef = db.collection("notifications").doc();
    await notificationRef.set({
      recipientId: followingId,
      senderId: followerId,
      senderName: followerProfile?.name || "Someone",
      senderAvatar: followerProfile?.profilePicture || null,
      type: "follow",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    });
    console.log(`Created follow notification for ${followingId}`);
  } catch (error) {
    console.error("Error in onFollowCreate transaction:", error);
  }
});

/**
 * Updates user stats when a follow relationship is deleted.
 */
exports.onFollowDelete = onDocumentDeleted("follows/{followId}", async (event) => {
  const snap = event.data;
  if (!snap) {
    console.log("No data on follow delete, exiting.");
    return;
  }
  const followData = snap.data();
  const {followerId, followingId} = followData;

  if (!followerId || !followingId) {
    console.error("Missing followerId or followingId in deleted follow document.");
    return;
  }

  const db = admin.firestore();
  const followerRef = db.doc(`users/${followerId}`);
  const followingRef = db.doc(`users/${followingId}`);

  try {
    await db.runTransaction(async (tx) => {
      const [followerSnap, followingSnap] = await Promise.all([
        tx.get(followerRef),
        tx.get(followingRef),
      ]);

      if (followerSnap.exists) {
        const newFollowingCount = Math.max(0, (followerSnap.data().stats?.followingCount || 0) - 1);
        tx.update(followerRef, {"stats.followingCount": newFollowingCount});
      }
      if (followingSnap.exists) {
        const newFollowersCount = Math.max(0, (followingSnap.data().stats?.followersCount || 0) - 1);
        tx.update(followingRef, {"stats.followersCount": newFollowersCount});
      }
    });
    console.log(`Successfully updated counts for unfollow: ${followerId} -> ${followingId}`);
  } catch (error) {
    console.error("Error in onFollowDelete transaction:", error);
  }
});

/**
 * When an entry is rated, sync its rating stats to the corresponding outfit document for the main feed.
 */
exports.onEntryRated = onDocumentUpdated("entries/{entryId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  // Check if rating stats have actually changed to avoid unnecessary writes
  if (
    before.averageRating === after.averageRating &&
    before.ratingsCount === after.ratingsCount &&
    before.aiFlagsCount === after.aiFlagsCount
  ) {
    console.log(`No rating change for entry ${event.params.entryId}, skipping sync.`);
    return null;
  }

  const { outfitId } = after;
  if (!outfitId) {
    console.log(`Entry ${event.params.entryId} has no linked outfitId, skipping sync.`);
    return null;
  }

  const outfitRef = admin.firestore().doc(`outfits/${outfitId}`);

  try {
    await outfitRef.update({
      averageRating: after.averageRating,
      ratingsCount: after.ratingsCount,
      aiFlagsCount: after.aiFlagsCount,
    });
    console.log(`Successfully synced ratings from entry ${event.params.entryId} to outfit ${outfitId}.`);
  } catch (error) {
    console.error(`Failed to sync ratings for outfit ${outfitId}:`, error);
  }
  return null;
});

/**
 * When an outfit is created, increment the user's post count.
 */
exports.onOutfitCreate = onDocumentCreated("outfits/{outfitId}", async (event) => {
  const snap = event.data;
  if (!snap) {
    console.log("No data on outfit create, exiting.");
    return;
  }
  const outfitData = snap.data();
  const { userId } = outfitData;

  if (!userId) {
    console.log(`Outfit ${event.params.outfitId} has no userId, cannot increment count.`);
    return;
  }

  const userRef = admin.firestore().doc(`users/${userId}`);
  try {
    await userRef.update({ "stats.postsCount": admin.firestore.FieldValue.increment(1) });
    console.log(`Incremented postsCount for user ${userId}.`);
  } catch (error) {
    console.error(`Failed to increment postsCount for user ${userId}:`, error);
  }
  return null;
});

/**
 * When an outfit is deleted, clean up its sub-collections (likes, comments)
 * and decrement the user's post count.
 */
exports.onOutfitDelete = onDocumentDeleted("outfits/{outfitId}", async (event) => {
  const snap = event.data;
  if (!snap) {
    console.log("No data on outfit delete, exiting.");
    return;
  }
  const outfitData = snap.data();
  const {outfitId} = event.params;
  const {userId, type, entryId} = outfitData;

  if (!userId) {
    console.log(`Outfit ${outfitId} has no userId, cannot decrement count.`);
    return;
  }

  const db = admin.firestore();
  const batch = db.batch();

  // 1. Decrement user's postsCount
  const userRef = db.doc(`users/${userId}`);
  batch.update(userRef, {"stats.postsCount": admin.firestore.FieldValue.increment(-1)});

  // 2. Delete all comments for the outfit
  const commentsQuery = db.collection("comments").where("outfitId", "==", outfitId);
  const commentsSnap = await commentsQuery.get();
  commentsSnap.forEach((doc) => batch.delete(doc.ref));

  // 3. Delete all likes for the outfit
  const likesQuery = db.collection("likes").where("outfitId", "==", outfitId);
  const likesSnap = await likesQuery.get();
  likesSnap.forEach((doc) => batch.delete(doc.ref));

  // 4. If it's a contest entry, delete the entry document as well
  if (type === 'contest' && entryId) {
    const entryRef = db.doc(`entries/${entryId}`);
    batch.delete(entryRef);
    console.log(`Scheduled deletion for contest entry ${entryId}`);
  }

  await batch.commit();
});
