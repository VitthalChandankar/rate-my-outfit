Project Context Pack (paste this at the top of any new thread)

App overview

Platform: React Native (Expo), React Navigation (Native Stack + Bottom Tabs), React Native Paper, Expo Image.

Data backend: Firebase (Auth + Firestore). Cloudinary for image hosting in contest entry flow.

Architecture: Bottom tab app with a root stack for global detail screens and rating flow. State handled via custom Zustand stores (useAuthStore, useOutfitStore, useContestStore).

Navigation structure

Root stack (headerShown: false):

MainTabs (Bottom Tabs)

OutfitDetails (legacy outfit detail)

ContestDetails (contest overview + enter + rate + leaderboard)

RateEntry (preview of a single entry/outfit with big “Rate” CTA)

RateScreen (animated slider with emoji sentiments, submission)

MainTabs (Bottom Tabs):

Home: Public feed (mix of general outfits and possibly contest entries)

Contests: ContestsListScreen (filters: active/upcoming/ended; polished UI)

Upload: UploadScreen (branches to either general upload or contest entry)

Profile: User profile and uploads

Uploads logic

UploadScreen determines path from route.params.contestId:

isContest = !!contestId

Contest entry flow:

Upload local image to Cloudinary → receives image URL

createEntry in Firestore entries collection: { contestId, imageUrl, caption, tags, userId, createdAt, averageRating:0, ratingsCount:0 }

Navigate back to ContestDetails(contestId)

General feed flow:

uploadOutfit to Firestore outfits collection with local file upload service (your existing uploadOutfit)

Navigate Home

Animated progress UI in UploadScreen:

Fancy program with phases: preparing → uploading → finalizing → done

Animated shimmer bar; different theme colors for contest vs normal

Contests domain

Collections:

contests: { id, title, theme, country, startAt, endAt, entryFee, prize, bannerImage, bannerCaption, host }

entries: { id, contestId, userId, imageUrl, caption, tags, createdAt, averageRating, ratingsCount, userName?, userPhoto? }

ratings: deterministic ID per (entryId, userId) → rating doc: { entryId, userId, rating, aiFlag, createdAt }

Screens:

ContestsListScreen:

Time helpers normalize Firestore timestamps

Filter segmented control (active/upcoming/ended)

Animated cards with meta chips

Pagination: onEndReached; Pull-to-refresh supported

When label uses absolute dates (toLocaleDateString)

ContestDetailsScreen:

Premium UI with:

Optional host banner (contest.bannerImage/bannerCaption/host)

Status + date range + country

Prize and Entry fee pills

Actions: Upload Outfit (passes contestId), Go to Rate

Animated segmented tabs: Enter | Rate | Leaderboard

Enter tab:

Reference text + Recent entries list

Each entry opens RateEntry (mode:'entry')

Rate tab:

Each item shows an OutfitCard + quick EntryRateCard with 0–10 pills + “Looks AI”

Self-rating and self-flag blocked

Leaderboard tab:

LeaderboardList(contestId, limit, minVotes)

Rating flow

RateEntryScreen:

Large image, creator info, caption, big “Rate” CTA

Navigates to RateScreen with a normalized target payload:
target = { id, userId, userName, userPhoto, imageUrl, caption, createdAt, contestId, averageRating, ratingsCount }

RateScreen (contest entries and legacy outfits):

Defensive against missing route.params/target; shows fallback if no id

Emoji sentiment slider:

Scale 0–10 mapped to sentiments: 😖 Awful (0–2), 🙁 Bad (3–4), 😐 Okay (5–6), 🙂 Good (7–8), 😍 Awesome (9–10)

Animated thumb with glow, floating value bubble, gradient fill, tick marks

Haptics on sentiment threshold change; heavy haptic on submit

“Looks AI?” chip overlay on image

Submit:

mode === 'entry' → rateEntry({ entryId, contestId, rating, aiFlag:false })

mode === 'outfit' → submitRatingLegacy({ outfitId, stars: round(rating/2), comment:'' })

Blocks self-rating and self-flagging

Firestore queries and indexes

List entries by contest:

Query: collection('entries'), where('contestId','==',contestId), orderBy('createdAt','desc'), limit(N), startAfter(cursor)

Requires composite index: entries: contestId asc, createdAt desc

Ratings upsert:

Deterministic doc ID ratingId = ${entryId}_${userId} to ensure 1 rating per user per entry

Update entry aggregates (averageRating, ratingsCount) via transaction or server-side function (recommended to avoid race conditions)

Security rules (typical approach):

Allow read on contests and entries (public)

Ratings: allow create/update by authenticated user where request.auth.uid == userId and document id matches ${entryId}_${userId}

Aggregates ideally updated via Cloud Functions with admin privileges

Data modeling expectations

contests document should include:

title, theme, host (e.g., Myntra, Gucci), bannerImage (reference styling), bannerCaption, country, prize, entryFee, startAt, endAt

entries document should include:

contestId, userId, imageUrl, caption, tags, createdAt (serverTimestamp), averageRating (number), ratingsCount (number)

Optionally denormalized userName/userPhoto for faster renders

Known UX decisions

Public users see Home feed; tapping any item opens RateEntry → RateScreen flow

Contest-only UI never leaks into general outfit details

UploadScreen uses distinct contest vs general themes and progress

ContestsList shows clean segmented filter and modern cards

ContestDetails shows:

Host banner for brand reference image (e.g., “Style New Balance 1434” with a model image)

Clear prize and fee info

Tabs to Enter/Rate/Leaderboard with fluid animation

Payments (for paid contests)

Entry fee shown in ContestsList and ContestDetails via contest.entryFee

Payment collection strategy (planned):

Before allowing “Upload Outfit” for paid contests:

Check whether user has a paid ticket for this contest

If not, navigate to a “Checkout” screen or modal (not implemented yet in code provided)

On success, mark a subcollection contests/{id}/tickets/{userId} with payment confirmation

Upload proceeds only if ticket exists

UI shows Entry pill as “Entry ₹X” or “Free”; prize pill shows “₹Amount + Feature” etc.

Cloudinary integration (contest entries)

uploadImageToCloudinary(fileUri) used in UploadScreen contest branch, returns { success, url }

After Cloudinary upload, createEntry({ contestId, imageUrl:url, caption, tags:[] })

Error handling and diagnostics

Defensive guards in RateScreen prevent “length of undefined” by validating route.params and target before use

ContestDetails and lists handle loading, empty, pagination gracefully

Self-rating and self-flagging blocked with alerts

Code delivery preference

Always provide full files inside a single fenced code block for easy copy-paste

Key files and responsibilities

navigation/AppNavigator.js: registers tabs and global stack routes (OutfitDetails, ContestDetails, RateEntry, RateScreen)

screens/contests/ContestsListScreen.js: premium list UI, segmented filter, pagination

screens/contests/ContestDetailsScreen.js: banner, meta, actions, animated tabs, Recent entries, Rate list, Leaderboard

screens/rating/RateEntryScreen.js: entry preview + Rate CTA

screens/rating/RateScreen.js: animated emoji slider, AI flag, submission

screens/main/UploadScreen.js: robust URI resolution, orientation normalize, animated progress, contest vs general upload

stores:

useAuthStore: initializeAuth, isAuthenticated, user

useContestStore: listContests, fetchEntries, createEntry, rateEntry, fetchLeaderboard, entries bag by contestId, optional contestById selector

useOutfitStore: uploadOutfit, fetchOutfitDetails, submitRating, addComment

Common pitfalls and fixes

“NAVIGATE not handled by any navigator”:

Ensure ContestDetails, RateEntry, RateScreen are registered on the root stack (not inside tabs only)

Entries not visible:

Verify entries actually saved under entries with correct contestId

Ensure composite index exists for (contestId asc, createdAt desc)

Refresh or re-fetch after upload

Timestamp display “Ends just now”:

Normalize Firestore timestamps to ms and format with toLocaleDateString

RateScreen crash:

Always pass normalized target from RateEntry

Defensively handle missing id in RateScreen and show fallback

Extensibility roadmap

Payment/Checkout flow for paid contests, with ticket validation before entry

Confetti and gradient enhancements on successful rating

Real-time listeners (onSnapshot) for entries and leaderboard (trade-off: read costs)

Deep links to contests/entries

Server-side function to maintain rating aggregates atomically