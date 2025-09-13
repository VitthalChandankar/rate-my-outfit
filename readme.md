Contest entry and how the user is getting selected for winner.

Let me break down the entire lifecycle for you, from a user rating a post to a winner being declared.

The Two Types of Posts
First, you are correct. There are two main types of posts, and understanding this is key:

Normal Post: This is a standard upload. It exists as a single document in your outfits collection in Firestore. It has likesCount and commentsCount, but no rating system.
Contest Post: This is a special post submitted to a contest. It's represented by two documents:
One document in the entries collection. This is the "source of truth" for the contest, holding its rating data.
A corresponding document in the outfits collection. This allows the contest entry to appear in the main feed alongside normal posts.
A backend function keeps the rating data from the entries document synced to the outfits document.

1. How Ratings are Stored and Averages are Calculated
This process is designed to be fast and accurate, using a Firestore Transaction.

Where are individual ratings stored? When a user rates an entry, a new document is created in a ratings collection. The ID of this document is a combination of the entry and the user (e.g., entryId_userId). This ensures a user can only rate an entry once; rating again simply updates their existing rating document.

How is the average calculated and stored? This happens inside the fbRateEntry function in services/firebase.js. It's a clever process:

It reads the entries document to get the current averageRating and ratingsCount.
It calculates the new total score: (oldAverage * oldRatingCount) - oldUserRating + newUserRating.
It calculates the new average: newTotalScore / newRatingCount.
It then updates the averageRating and ratingsCount fields directly on the document in the entries collection.
How does the rating appear on the post in the main feed? A Cloud Function in functions/index.js called syncEntryToOutfit is listening for changes. When it sees that averageRating has been updated on a document in the entries collection, it automatically copies that new average over to the corresponding document in the outfits collection. This is why the OutfitCard in your HomeScreen can display the rating.

2. How the Contest Winner is Decided (The Automated Part)
This is a fully automated, "set it and forget it" process handled by your backend Cloud Functions. You don't need to press any buttons.

Scheduling the Winner Declaration:

When an admin creates a new contest, the onContestCreate function in functions/index.js is triggered.
This function reads the contest's endAt time and automatically schedules another function, resolveContestWinner, to run at that exact time.
Declaring the Winner:

When the contest's end time arrives, the scheduled resolveContestWinner function wakes up and runs.
It queries all documents in the entries collection for that contest.
It finds the winning entry based on a fair, multi-level system:

1.  **Highest Average Rating**: The entry with the best score wins.
2.  **Most Votes (Tie-breaker)**: If ratings are tied, the entry with more votes wins.
3.  **Earliest Submission (Final Tie-breaker)**: If both rating and vote count are tied, the entry that was submitted first wins.

This ensures the process is always deterministic and fair. Entries must also meet a minimum number of votes to be eligible.
Flagging the Winner:

The function then updates the winning document in the entries collection by setting a new field: isWinner: true.
Displaying the Ribbon:

The syncEntryToOutfit function sees this isWinner: true change and copies it to the corresponding document in the outfits collection.
Now, when your app's ProfileGridItem component renders that outfit, it sees the isWinner flag and knows to display the animated "WINNER" ribbon.

Notifying the Winner:

When resolveContestWinner successfully declares a winner, it also creates a new document in the notifications collection.
This document has a type of contest_win and includes the contest title and ID.
A separate Cloud Function, sendPushNotification, listens for new notification documents and sends a push notification to the user's device, congratulating them on their win. Tapping this notification takes them directly to the contest's leaderboard.