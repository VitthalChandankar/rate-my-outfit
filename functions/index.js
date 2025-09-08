/* eslint-disable object-curly-spacing */
/* eslint-disable max-len */
const admin = require("firebase-admin");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");

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
        outfitId: notificationData.outfitId, // Pass extra data for navigation
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
