/* eslint-disable object-curly-spacing */
/* eslint-disable max-len */
const admin = require("firebase-admin");
const {onDocumentCreated, onDocumentDeleted, onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {onTaskDispatched} = require("firebase-functions/v2/tasks");
const { onCall, HttpsError } = require("firebase-functions/v2/https");



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
    } else if (type === "achievement") {
      title = notificationData.title || "Achievement Unlocked!";
      body = notificationData.body || "You've earned a new badge!";
    } else if (type === "contest_win") {
      title = "You're a Winner! 🏆";
      body = `Congratulations! You won the "${notificationData.contestTitle || "contest"}".`;
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
        contestId: notificationData.contestId, // Add contestId for navigation
        type: type, // Pass type to help client-side navigation
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
exports.onLikeCreate = onDocumentCreated(
    {
      document: "likes/{likeId}",
      // Set concurrency to allow one instance to handle many requests
      concurrency: 80,
    },
    async (event) => {
      const snap = event.data;
      if (!snap) return;
      const likeData = snap.data();
      const {outfitId, userId} = likeData;

      if (!outfitId || !userId) {
        console.error("Like is missing outfitId or userId", snap.id);
        return;
      }

      const db = admin.firestore();
      const outfitRef = db.doc(`outfits/${outfitId}`);

      try {
        // 1. Increment outfit's likesCount
        await outfitRef.update({likesCount: admin.firestore.FieldValue.increment(1)});

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
 * When an entry is updated (e.g., rated, or declared a winner), sync relevant stats to the corresponding outfit document.
 */
exports.syncEntryToOutfit = onDocumentUpdated("entries/{entryId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  const updates = {};

  // Check for rating changes
  if (before.averageRating !== after.averageRating) {
    updates.averageRating = after.averageRating;
  }
  if (before.ratingsCount !== after.ratingsCount) {
    updates.ratingsCount = after.ratingsCount;
  }
  // Check for winner status change
  if (before.isWinner !== after.isWinner && after.isWinner === true) {
    updates.isWinner = true;
  }

  if (Object.keys(updates).length === 0) {
    console.log(`No relevant fields changed for entry ${event.params.entryId}, skipping sync.`);
    return null;
  }

  const { outfitId } = after;
  if (!outfitId) {
    console.log(`Entry ${event.params.entryId} has no outfitId, skipping sync.`);
    return null;
  }

  const outfitRef = admin.firestore().doc(`outfits/${outfitId}`);

  try {
    await outfitRef.update(updates);
    console.log(`Successfully synced updates from entry ${event.params.entryId} to outfit ${outfitId}.`, updates);
  } catch (error) {
    console.error(`Failed to sync ratings for outfit ${outfitId}:`, error);
  }
  return null;
});

/**
 * When an outfit is created, increment the user's post count and award "First Post" achievement if applicable.
 */
exports.onOutfitCreate = onDocumentCreated("outfits/{outfitId}", async (event) => {
  const snap = event.data;
  if (!snap) {
    console.log("No data on outfit create, exiting.");
    return null;
  }
  const outfitData = snap.data();
  const { userId } = outfitData;

  if (!userId) {
    console.log(`Outfit ${event.params.outfitId} has no userId, cannot increment count.`);
    return null;
  }

  const db = admin.firestore();
  const userRef = db.doc(`users/${userId}`);

  const achievementId = "first_post";
  const achievementRef = db.collection("achievements").doc(achievementId);
  const achievementDataSnap = await achievementRef.get();

  // This check is important. If the achievement isn't defined, we can't award it.
  if (!achievementDataSnap.exists) {
    console.error(`Achievement definition for '${achievementId}' not found in Firestore.`);
    return null;
  }

  const FIRST_POST_ACHIEVEMENT = achievementDataSnap.data();


  const userAchievementRef = db.collection("users").doc(userId).collection("userAchievements").doc(achievementId);

  try {
    await db.runTransaction(async (transaction) => {
      const [userSnap, achievementSnap] = await Promise.all([
        transaction.get(userRef),
        transaction.get(userAchievementRef),
      ]);

      if (!userSnap.exists) {
        console.log(`User ${userId} does not exist. Cannot update stats.`);
        return;
      }

      const currentStats = userSnap.data().stats || {};
      const newStats = {
        ...currentStats,
        postsCount: (currentStats.postsCount || 0) + 1,
      };

      // Check if achievement should be awarded
      if (!achievementSnap.exists) {
        console.log(`Awarding achievement "${achievementId}" to user ${userId}.`);
        newStats.achievementsCount = (currentStats.achievementsCount || 0) + 1;

        // 1. Award the achievement
        transaction.set(userAchievementRef, {
          ...FIRST_POST_ACHIEVEMENT,
          unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 2. Create a notification for the user
        const notificationRef = db.collection("notifications").doc();
        transaction.set(notificationRef, {
          recipientId: userId,
          senderId: userId, // For achievement, sender is the system/user themselves
          type: "achievement", // This will be handled by sendPushNotification
          title: "Achievement Unlocked!",
          body: `You've earned the "${FIRST_POST_ACHIEVEMENT.title}" badge!`,
          imageUrl: FIRST_POST_ACHIEVEMENT.imageUrl,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // 3. Update user stats in one go
      transaction.update(userRef, { stats: newStats });
    });
    console.log(`Successfully processed onOutfitCreate for user ${userId}.`);
  } catch (error) {
    console.error(`Error in onOutfitCreate for user ${userId}:`, error);
  }

  return null;
});

/**
 * When a new contest is created, schedule a Cloud Function to run when it ends.
 */
exports.onContestCreate = onDocumentCreated("contests/{contestId}", async (event) => {
  const snap = event.data;
  if (!snap) return null;

  const contestData = snap.data();
  const { endAt, title } = contestData;

  if (!endAt || !endAt.toDate) {
    console.error(`Contest ${event.params.contestId} is missing a valid endAt timestamp.`);
    return null;
  }

  const endTime = endAt.toDate();
  const now = new Date();

  // Don't schedule for contests that have already ended.
  if (endTime <= now) {
    console.log(`Contest "${title}" has already ended. Not scheduling.`);
    return null;
  }

  // Schedule the 'processContestEnd' function to run at the contest's end time.
  // This requires enabling the Cloud Scheduler API in your Google Cloud project.
  const {getFunctions} = require("firebase-admin/functions");
  const queue = getFunctions().taskQueue("resolvecontestwinner");

  try {
    await queue.enqueue(
        {contestId: event.params.contestId},
        {scheduleTime: endTime},
    );
    console.log(`Successfully scheduled winner processing for contest "${title}" at ${endTime.toISOString()}`);
  } catch (error) {
    console.error(`Failed to schedule task for contest ${event.params.contestId}:`, error);
  }

  return null;
});

/**
 * Processes a contest when it ends to find and declare a winner.
 * This function is triggered by a Cloud Scheduler task created by onContestCreate.
 */
exports.resolveContestWinner = onTaskDispatched({taskQueue: "resolvecontestwinner"}, async (event) => {
  const { contestId } = event.data;
  if (!contestId) {
    console.error("No contestId provided in the scheduled task payload.");
    return;
  }

  console.log(`Processing end of contest ${contestId}.`);
  const db = admin.firestore();
  const MIN_VOTES = 10; // Minimum votes an entry needs to be considered for winning.

  // 1. Fetch all entries for the contest.
  const entriesQuery = db.collection("entries").where("contestId", "==", contestId);
  const entriesSnap = await entriesQuery.get();

  if (entriesSnap.empty) {
    console.log(`Contest ${contestId} has no entries. No winner to declare.`);
    return null;
  }

  // 2. Find the winning entry using a fair, multi-level tie-breaking system.
  let winnerEntry = null;

  for (const doc of entriesSnap.docs) {
    const entry = { id: doc.id, ...doc.data() };

    // Rule 1: Must meet minimum votes to be eligible.
    if ((entry.ratingsCount || 0) < MIN_VOTES) {
      continue;
    }

    // If this is the first valid entry, it's the current winner.
    if (!winnerEntry) {
      winnerEntry = entry;
      continue;
    }

    // Rule 2: Higher average rating wins.
    const currentWinnerRating = winnerEntry.averageRating || 0;
    const entryRating = entry.averageRating || 0;
    if (entryRating > currentWinnerRating) {
      winnerEntry = entry;
    } else if (entryRating === currentWinnerRating) {
      // Rule 3 (Tie-breaker 1): More votes wins.
      const currentWinnerVotes = winnerEntry.ratingsCount || 0;
      const entryVotes = entry.ratingsCount || 0;
      if (entryVotes > currentWinnerVotes) {
        winnerEntry = entry;
      } else if (entryVotes === currentWinnerVotes) {
        // Rule 4 (Tie-breaker 2): Earlier submission wins.
        if ((entry.createdAt?.toMillis() || 0) < (winnerEntry.createdAt?.toMillis() || 0)) {
          winnerEntry = entry;
        }
      }
    }
  }

  if (!winnerEntry) {
    console.log(`No entry in contest ${contestId} met the minimum of ${MIN_VOTES} votes.`);
    return null;
  }

  // Fetch contest data to use in the notification
  const contestRef = db.collection("contests").doc(contestId);
  const contestSnap = await contestRef.get();
  const contestData = contestSnap.exists ? contestSnap.data() : {};
  const contestTitle = contestData.title || "a contest";

  // 3. Mark the winning entry as the winner.
  // This will trigger the `syncEntryToOutfit` function to handle achievements and stats.
  const winnerRef = db.collection("entries").doc(winnerEntry.id);
  try {
    await winnerRef.update({isWinner: true});
    console.log(`Declared user ${winnerEntry.userId} as the winner of contest ${contestId} with entry ${winnerEntry.id}.`);

    // 4. Create a notification for the winner
    const notificationRef = db.collection("notifications").doc();
    await notificationRef.set({
      recipientId: winnerEntry.userId,
      senderId: "system", // System-generated notification
      type: "contest_win",
      contestTitle: contestTitle,
      contestId: contestId,
      outfitImage: winnerEntry.imageUrl, // For thumbnail in notification list
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Created contest win notification for user ${winnerEntry.userId}.`);
  } catch (error) {
    console.error(`Failed to update winner status for entry ${winnerEntry.id}:`, error);
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

// Define report thresholds
const FLAG_THRESHOLD = 5;
const DELETE_THRESHOLD = 10;

/**
 * A callable function for users to report a post.
 * This handles the logic securely on the backend.
 */
exports.reportPost = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to report a post.");
  }

  const { outfitId, reason } = request.data;
  const reporterId = request.auth.uid;

  if (!outfitId) {
    throw new HttpsError("invalid-argument", "The function must be called with an 'outfitId'.");
  }

  const db = admin.firestore();
  const reportRef = db.collection("reports").doc(`${outfitId}_${reporterId}`);
  const outfitRef = db.collection("outfits").doc(outfitId);

  try {
    await db.runTransaction(async (transaction) => {
      const [reportSnap, outfitSnap] = await Promise.all([
        transaction.get(reportRef),
        transaction.get(outfitRef),
      ]);

      if (reportSnap.exists) {
        // To prevent spamming, we don't throw an error, just acknowledge the existing report.
        throw new HttpsError("already-exists", "You have already reported this post.");
      }

      if (!outfitSnap.exists) {
        throw new HttpsError("not-found", "The post you are trying to report does not exist.");
      }

      // 1. Create the report document.
      transaction.set(reportRef, {
        outfitId,
        reporterId,
        reason: reason || "No reason provided.",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 2. Increment reportsCount and update status if thresholds are met.
      const currentReports = outfitSnap.data().reportsCount || 0;
      const newReportsCount = currentReports + 1;

      let newStatus = "under_review";
      if (newReportsCount >= DELETE_THRESHOLD) {
        newStatus = "deleted";
      } else if (newReportsCount >= FLAG_THRESHOLD) {
        newStatus = "flagged";
      }

      transaction.update(outfitRef, {
        reportsCount: admin.firestore.FieldValue.increment(1),
        status: newStatus,
      });
    });

    return { success: true, message: "Post reported successfully." };
  } catch (error) {
    console.error("Error reporting post:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "An error occurred while reporting the post.");
  }
});



/**
 * Sends a push notification to a user when a post is shared with them.
 * This function triggers whenever a new document is created in the /shares collection.
 */
exports.onSharePost = onDocumentCreated("shares/{shareId}", async (event) => {
  const snap = event.data;
  if (!snap) {
    console.log("No data associated with the share event, exiting.");
    return;
  }

  const shareData = snap.data();
  const { recipientId, senderName, outfitId, outfitData } = shareData;

  if (!recipientId || !senderName) {
    console.log("Share document is missing recipientId or senderName.");
    return null;
  }

  // Get the recipient's user document to find their push tokens.
  const recipientDoc = await admin.firestore().collection("users").doc(recipientId).get();

  if (!recipientDoc.exists) {
    console.log(`Recipient user document not found for ID: ${recipientId}`);
    return null;
  }

  const recipient = recipientDoc.data();
  const pushTokens = recipient.pushTokens; // Assumes tokens are an array of Expo push tokens

  if (!pushTokens || pushTokens.length === 0) {
    console.log(`Recipient ${recipientId} has no push tokens to notify.`);
    return null;
  }

  // Construct the payload for Expo's push service
  const messages = pushTokens.map((token) => ({
    to: token,
    sound: "default",
    title: "New Post Shared!",
    body: `${senderName} shared a post with you.`,
    data: {
      type: "share",
      outfitId: outfitId,
      outfitData: JSON.stringify(outfitData || {}),
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

    if (!response.ok) {
      console.error("Error response from Expo Push API for onSharePost:", { status: response.status, body: responseData });
      return null;
    }

    console.log("Expo push response for onSharePost:", responseData);

    // Clean up invalid tokens
    if (responseData.data && Array.isArray(responseData.data)) {
      const invalidTokens = [];
      responseData.data.forEach((ticket, i) => {
        if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          invalidTokens.push(pushTokens[i]);
        }
      });

      if (invalidTokens.length > 0) {
        console.log("Removing invalid tokens for onSharePost:", invalidTokens);
        await recipientDoc.ref.update({
          pushTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
        });
      }
    }
  } catch (error) {
    console.error("Error sending share push notification via Expo:", error);
  }
  return null;
});
