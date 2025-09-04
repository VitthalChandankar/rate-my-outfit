Firebase rules before adding leaderBoard and contestDetailsScreen v0:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users: allow user to read their doc; write only their own doc
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update, delete: if request.auth != null && request.auth.uid == userId;
    }

    // Outfits: anyone can read (public feed), only authenticated users can create
    match /outfits/{outfitId} {
      allow read: if true;
      allow create: if request.auth != null;
      // allow update/delete by owner only (if you store userId in doc)
      allow update, delete: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
    }

    // Ratings: one rating per user per outfit enforced in code (doc id = outfitId_userId)
    match /ratings/{ratingId} {
      allow read: if true; // or restrict if needed
      allow create, update: if request.auth != null;
      allow delete: if request.auth != null;
    }

    // Comments: anyone can read; only authenticated can write
    match /comments/{commentId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null;
    }
  }
}


-----------------------
FireStoreRules :

rules_version = '2';
service cloud.firestore {
match /databases/{database}/documents {

text
function isSignedIn() {
  return request.auth != null;
}

// Add your admin UID(s) here
function isAdmin() {
  return isSignedIn() && (
    request.auth.uid in [
      "YOUR_ADMIN_UID_1"
    ]
  );
}

// users: everyone can read; a user can write only their own doc
match /users/{userId} {
  allow read: if true;
  allow create, update, delete: if isSignedIn() && userId == request.auth.uid;
}

// contests: public read; only admin can create/update/delete
match /contests/{contestId} {
  allow read: if true;
  allow create, update, delete: if isAdmin();
}

// entries: owner-only create; public read
// Owner can edit only non-sensitive fields; admins can manage status
match /entries/{entryId} {
  allow read: if true;

  // Create: userId must equal requester; some fields required
  allow create: if isSignedIn()
    && request.resource.data.userId == request.auth.uid
    && request.resource.data.contestId is string
    && request.resource.data.imageUrl is string;

  // Update:
  // - Owner may NOT change stats/status; only edit caption/tags
  // - Admin can update anything (e.g., status='flagged')
  allow update: if isSignedIn() && (
    (
      request.auth.uid == resource.data.userId
      && request.resource.data.averageRating == resource.data.averageRating
      && request.resource.data.ratingsCount == resource.data.ratingsCount
      && request.resource.data.aiFlagsCount == resource.data.aiFlagsCount
      && request.resource.data.status == resource.data.status
    )
    || isAdmin()
  );

  // Delete: admin only (optional)
  allow delete: if isAdmin();
}

// ratings: one user—one rating per entry via doc id entryId_userId
match /ratings/{ratingId} {
  allow read: if true;

  allow create, update: if isSignedIn()
    && request.resource.data.userId == request.auth.uid
    && request.resource.data.entryId is string
    && ratingId == (request.resource.data.entryId + "_" + request.resource.data.userId)
    && request.resource.data.rating is number
    && request.resource.data.rating >= 0 && request.resource.data.rating <= 10
    && request.resource.data.aiFlag is bool;

  allow delete: if isAdmin();
}

// comments: public read; only signed-in can create; owner/admin can update/delete
match /comments/{commentId} {
  allow read: if true;

  allow create: if isSignedIn()
    && request.resource.data.userId == request.auth.uid
    && request.resource.data.outfitId is string
    && request.resource.data.comment is string;

  allow update, delete: if isSignedIn() && (
    request.auth.uid == resource.data.userId || isAdmin()
  );
}

// outfits (your legacy/general feed)
match /outfits/{outfitId} {
  allow read: if true;
  allow create: if isSignedIn()
    && request.resource.data.userId == request.auth.uid;
  allow update, delete: if isSignedIn() && request.auth.uid == resource.data.userId;
}
}
}
// current issue :- normal upload opening contest entry upload screen. and uploading to contest only
rating is getting saved but not able to see other users entries 


before this change the ui and look was completely different of ProfileScreen.js. i liked the post grid view.. now added changes if required will revert to that. added changes for edit profile and other required changes. 

Why two screens: ProfileScreen vs UserProfileScreen
ProfileScreen: the owner’s self profile inside the MainTabs. It shows personal stats, own uploads, and provides actions like Edit Profile. It assumes the current authenticated user.

UserProfileScreen: any other user’s profile opened by navigating with userId; it shows Follow/Unfollow and the other user’s posts, without self-only actions like Edit. Keeps responsibilities clean and route parameters explicit.

Both can share subcomponents (header, stats, grid). They are separated to simplify logic, permissions, and navigation flows (self vs other). In the future, you can unify into a single Profile screen that switches modes based on route.userId === authed uid, but keeping two screens is common for clarity.

in this commit , changed the home feed . distinguish betn normal upload and contest upload 
upload screen also changed. if something breaks come to this commit . upload screen is working best till here 


after uploading pic , not able to see that on homefeed and in profile


todo:
currently follow and following is not working. using option B as of now.
Practical recommendation

If the goal is robust counters for follows, use Firestore onCreate/onDelete triggers (background functions) and host on Blaze. This removes client security tradeoffs and ensures counts stay correct without letting clients write other users’ counters.

If switching to Blaze isn’t possible right now, temporarily use the client-side counters write rule (Option B) you enabled, and schedule a migration to Functions later. Keep the rules strict to only allow numeric counters fields and deny other writes.


added instagram like following and followeses screen.. still follow and followers are not reflecting 
getting below
 WARN  [2025-09-04T21:51:33.159Z]  @firebase/firestore: Firestore (12.1.0): RestConnection RPC 'Commit' 0x5fdf7f35 failed with error:  {"code":"permission-denied","name":"FirebaseError"} url:  https://firestore.googleapis.com/v1/projects/rateoutfit-d84af/databases/(default)/documents:commit request: {"writes":[{"update":{"name":"projects/rateoutfit-d84af/databases/(default)/documents/counters/S3YNVH6Tn8RCauiQrj2oy6e37FI3","fields":{"followersCount":{"integerValue":"0"},"followingCount":{"integerValue":"0"},"postsCount":{"integerValue":"0"}}},"updateMask":{"fieldPaths":["followersCount","followingCount","postsCount"]},"currentDocument":{"exists":false}},{"update":{"name":"projects/rateoutfit-d84af/databases/(default)/documents/counters/q6D3Srtac9cXqMMz39iPYxl25hy2","fields":{"followersCount":{"integerValue":"0"},"followingCount":{"integerValue":"0"},"postsCount":{"integerValue":"0"}}},"updateMask":{"fieldPaths":["followersCount","followingCount","postsCount"]},"currentDocument":{"exists":false}},{"update":{"name":"projects/rateoutfit-d84af/databases/(default)/documents/follows/S3YNVH6Tn8RCauiQrj2oy6e37FI3_q6D3Srtac9cXqMMz39iPYxl25hy2","fields":{"id":{"stringValue":"S3YNVH6Tn8RCauiQrj2oy6e37FI3_q6D3Srtac9cXqMMz39iPYxl25hy2"},"followerId":{"stringValue":"S3YNVH6Tn8RCauiQrj2oy6e37FI3"},"followingId":{"stringValue":"q6D3Srtac9cXqMMz39iPYxl25hy2"},"followerName":{"stringValue":"Vitthal"},"followerPicture":{"stringValue":"https://res.cloudinary.com/dvhwtormd/image/upload/v1756839103/av5o8mj2szod1ihgpld5.jpg?v=1756839104254"}}},"updateTransforms":[{"fieldPath":"createdAt","setToServerValue":"REQUEST_TIME"}],"currentDocument":{"exists":false}},{"update":{"name":"projects/rateoutfit-d84af/databases/(default)/documents/counters/S3YNVH6Tn8RCauiQrj2oy6e37FI3","fields":{"followingCount":{"integerValue":"1"}}},"updateMask":{"fieldPaths":["followingCount"]}},{"update":{"name":"projects/rateoutfit-d84af/databases/(default)/documents/counters/q6D3Srtac9cXqMMz39iPYxl25hy2","fields":{"followersCount":{"integerValue":"1"}}},"updateMask":{"fieldPaths":["followersCount"]}}]}
 ERROR  follow (client counters) error: [FirebaseError: Missing or insufficient permissions.]