// File: fixPostCounts.js

const admin = require('firebase-admin');

// --- IMPORTANT ---
// Replace './serviceAccountKey.json' with the actual path to the key you downloaded.
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixUserPostCounts() {
  console.log('Starting script to fix user post counts...');

  const usersCollection = db.collection('users');
  const outfitsCollection = db.collection('outfits');

  // Get all users from the database.
  const usersSnapshot = await usersCollection.get();

  if (usersSnapshot.empty) {
    console.log('No users found. Exiting.');
    return;
  }

  console.log(`Found ${usersSnapshot.size} users. Processing...`);

  let batch = db.batch();
  let writeCount = 0;
  let batchIndex = 0;
  let totalUpdates = 0;

  // Loop through each user document.
  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    const userData = userDoc.data();
    const currentDbCount = userData.stats?.postsCount;

    // For each user, query the 'outfits' collection to get their actual post count.
    const outfitsQuery = outfitsCollection.where('userId', '==', userId);
    const outfitsSnapshot = await outfitsQuery.get();
    const correctPostCount = outfitsSnapshot.size;

    // Only update the user document if the stored count is incorrect.
    if (correctPostCount !== currentDbCount) {
      console.log(`User ${userId} (${userData.name || 'No Name'}): DB count is ${currentDbCount}, actual is ${correctPostCount}. Scheduling update.`);
      
      const userRef = usersCollection.doc(userId);
      batch.update(userRef, { 'stats.postsCount': correctPostCount });
      writeCount++;
      totalUpdates++;

      // Firestore batches have a limit of 500 operations.
      // We commit the batch and start a new one when it's full.
      if (writeCount >= 499) {
        batchIndex++;
        console.log(`\n--- Committing batch #${batchIndex} ---\n`);
        await batch.commit();
        batch = db.batch(); // Start a new batch
        writeCount = 0;
      }
    }
  }

  // Commit any remaining operations in the last batch.
  if (writeCount > 0) {
    batchIndex++;
    console.log(`\n--- Committing final batch #${batchIndex} with ${writeCount} updates... ---\n`);
    await batch.commit();
  }

  console.log(`Script finished. Corrected post counts for ${totalUpdates} users.`);
}

// Run the main function and catch any errors.
fixUserPostCounts().catch(error => {
  console.error('An error occurred:', error);
});
