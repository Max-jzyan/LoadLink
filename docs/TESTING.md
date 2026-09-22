# LoadLink End-to-End Test Plan

> **Scope:** A single, consolidated manual test pass across the full product. Run this for a full regression.
>
> **Explicitly out of scope (excluded by request):** the AI Insights panel on Driver Auctions (sparkles button / `AiInsightsPanel`), and the Shepherd.js onboarding walkthrough (guided tour). Do not test these — they are being reworked separately.

## Prerequisites

- Clone the repo
- Place the provided `.env` file in the project root,`./frontend/.env`,  **and** `./backend/.env` (must include AWS S3 keys, Firebase Admin credentials, and a Geoapify key for maps)
- Run `docker compose up --build`
- Wait until all three services are healthy in Docker Desktop (mongo -> backend -> frontend)
- App URL: http://localhost:3000
- Backend health: http://localhost:5001/api/health
- The database is seeded automatically on first boot
- To reset seed data between passes: `docker compose down -v && docker compose up --build`

## Seeded Accounts

| Email | Password | Role |
|---|---|---|
| testUser1@example.com | 12345678 | driver |
| testUser2@example.com | 12345678 | driver |
| testUser3@example.com | 12345678 | driver |
| testUser4@example.com | 12345678 | driver |
| testUser5@example.com | 12345678 | driver |
| annoyingUser@delete.me | 12345678 | driver (disposable — safe to ban/delete) |
| testCompany1@example.com | 12345678 | company |
| testCompany2@example.com | 12345678 | company |
| admin@example.com | 12345678 | admin (log in at `/admin`) |

## Key Seeded Loads

| Load ID | Route | Company | Why it's useful |
|---|---|---|---|
| 000000000000000000000101 | Edmonton -> Winnipeg | Company2 | Standard active auction, current price $910 |
| 000000000000000000000102 | Surrey -> Victoria | Company1 | Expires in ~4 min — near-expiry auto-accept demo |
| 000000000000000000000103 | Toronto -> Montreal | Company2 | Expires in ~62 min, `autoAcceptTriggerHours=1` — auto-accepts ~1h before expiry |
| 000000000000000000000104 | Edmonton -> Winnipeg | Company2 | Price creep due in ~2 min: $1180 -> $1190 |
| 000000000000000000000105 | Calgary -> Saskatoon | Company1 | Expires in ~2 min with no bids — closed/no-winner demo |
| 000000000000000000000106 | Vancouver -> Edmonton | Company1 | Recommendation-engine example (geographic + temporal scoring) |
| 000000000000000000000107 | Edmonton -> Winnipeg | Company2 | Recommendation-engine example (geographic + temporal scoring) |
| 000000000000000000000108 | Toronto -> Montreal | Company1 | Recommendation-engine contrast example (geographically distant alternative) |
| 000000000000000000000114 | Halifax -> St. John's | Company1 | Non-overlapping load for the negative schedule-conflict case |
| 000000000000000000000116 | Vancouver -> Kamloops | Company1 | Reefer/produce, used for the overlapping schedule-conflict case |
| 000000000000000000000119 | Calgary -> Vancouver | Company1 | Completed, accepted bid (testUser1) — rate confirmation / signed-BOL / review cases |
| 000000000000000000000120 | Regina -> Winnipeg | Company2 | Completed, accepted bid (testUser3) — rate confirmation / signed-BOL / review cases |
| 000000000000000000000121 | Toronto -> London | Company1 | Completed, accepted bid (testUser4) — rate confirmation / signed-BOL / review cases |
| 000000000000000000000122 | Winnipeg -> Thunder Bay | Company2 | Completed, accepted bid (testUser2) — rate confirmation / signed-BOL / review cases |
| 000000000000000000000123 | Vancouver -> Kelowna | Company1 | Completed, accepted bid (testUser5) — rate confirmation / signed-BOL / review cases |
| 000000000000000000000124 | Edmonton -> Red Deer | Company2 | Completed, accepted bid (testUser5) — rate confirmation / signed-BOL / review cases |
| 000000000000000000000125 | Montreal -> Sherbrooke | Company1 | Completed, accepted bid (testUser3) — rate confirmation / signed-BOL / review cases |
| 000000000000000000000126 | Winnipeg -> Brandon | Company2 | Completed, accepted bid (testUser2) — rate confirmation / signed-BOL / review cases |

> Note: cases below are ordered so most can be run sequentially without backtracking, but each section is independently runnable if you only need to spot-check one area.

---

## Authentication

### Test Case 1: Register (driver and company)
**Test:** At `/signup`, register once as Driver and once as Company with valid data.

**Expected:** Redirected to the correct role home (`/dashboard` for driver, `/company/dashboard` for company). Sidebar nav matches the role (no driver-only items for a company and vice versa).

### Test Case 2: Registration validation
**Test:** Attempt to register with mismatched passwords, a password under 8 characters, and an email already in use.

**Expected:** Field-level errors for mismatch/length; a global "account already exists" error for the duplicate email. No account is created in any case.

### Test Case 3: Login — bad credentials, wrong role tab, Google unregistered
**Test:** Log in with a wrong password; log in with correct credentials but the wrong role tab selected; click "Sign in with Google" with a Google account that never signed up.

**Expected:** "Invalid email or password."; a role-mismatch error naming the correct role; "Account not found. Please sign up first." respectively. No redirect in any case.

### Test Case 4: Admin login
**Test:** Navigate to `/admin` and log in with `admin@example.com`. Then attempt the same page with a non-admin account.

**Expected:** Admin redirected to `/admin/dashboard`. Non-admin login on this page is rejected with an admin-privileges error.

---

## Company: Load Posting & Auction Management

### Test Case 1: Post a load
**Test:** As `testCompany1`, go to Post Load, submit the empty form, then submit with invalid values (delivery before pickup, negative numbers, origin = destination, max price < min price), then submit a fully valid form.

**Expected:** Field errors appear and clear appropriately; the valid submission returns 201 and the load appears in `/company/auctions`.

### Test Case 2: Auction Live — core controls
**Test:** Open `/auctionLive/000000000000000000000101` (active auction owned by Company2). Exercise: Accept a bid, Extend Deadline (try 0/negative/positive minutes), Edit Cap Price (below current cap and above current price).

**Expected:** Accepting shows a winner banner with driver + amount; Extend only applies for a positive value; Cap Price updates only when the new value is valid.

### Test Case 3: Auction Live — cancel and reopen
**Test:** On a live auction, click "Cancel Auction & Remove Load" and confirm. Then reopen a closed/cancelled auction with a positive hours value.

**Expected:** Cancelling disables all controls and shows a Cancelled banner. Reopening brings the auction back live and returns any previously accepted bids to submitted.

### Test Case 4: Closed with no winner
**Test:** Visit `/auctionLive/000000000000000000000105` after its ~2 minute expiry with no bids placed.

**Expected:** "Closed — Auction closed with no driver" banner with a Reopen button.

### Test Case 5: Price creep
**Test:** Fresh seed, log in as `testCompany2`, watch `/auctionLive/000000000000000000000104`'s current price without reloading.

**Expected:** Price moves from $1180 to $1190 within ~2 minutes with no hard refresh.

### Test Case 6: Auto-accept on near expiry / trigger hours
**Test:** Fresh seed, watch `/auctionLive/000000000000000000000102` (expires ~4 min) and `/auctionLive/000000000000000000000103` (expires ~62 min, `autoAcceptTriggerHours=1`) without reloading.

**Expected:** Load 000000000000000000000102 auto-closes and accepts the best bid at expiry. Load 000000000000000000000103 auto-closes and accepts the best bid roughly 1 hour before its listed expiry.

### Test Case 7: Invalid auction route
**Test:** Navigate to `/auctionLive/not-a-valid-id`.

**Expected:** 404 page.

---

## Driver: Browsing, Bidding & Claiming

### Test Case 1: Browse and filter
**Test:** As a driver, open `/driverAuctions`, search/filter by origin, destination, commodity.

**Expected:** List narrows correctly; clearing filters restores the full list. Typing quickly does not refetch on every keystroke (filters are debounced ~400ms).

### Test Case 2: View an auction and place a bid
**Test:** Open `/driverAuctions/000000000000000000000101`, review the load summary, live price, and bid table, then submit a bid.

**Expected:** Non-negative bid submits successfully and appears in the bid list.

### Test Case 3: Claim at current price
**Test:** On an active auction, click "Claim Now."

**Expected:** Load books immediately at the current price with a payout confirmation; the auction closes and bidding/claim controls disappear.

### Test Case 4: Cannot act on a closed auction
**Test:** After the previous case closes the auction, attempt to bid or claim on the same load again.

**Expected:** Request is rejected; UI reflects the closed state.

### Test Case 5: My Loads overview and map
**Test:** Open `/driverLoads`. Check the summary stat cards, the loads table, and click a row.

**Expected:** Stat cards show correct counts (My Loads, In Transit, Active Bids, Completed). Clicking a row highlights/pans the map to that route. Route lines render for all listed loads. A load posted by a company with a long name truncates with an ellipsis in the Company column (no layout break) and shows the full name on hover.

---

## Eligibility Scoring & Recommendations

### Test Case 1: Eligibility badges and detail panel
**Test:** On `/driverAuctions`, find a high-score load (green badge, ≥80), a load with a schedule conflict (red badge), and a load with only a minor issue like rate/deadhead (amber badge). Hover each badge and open the right-hand detail panel for each.

**Expected:** Colors/icons match severity. Tooltip and detail panel content match the category: "Top Pick" highlights for high score, "Critical Issues" (red, listed first) for schedule/certification conflicts, "Issues Found" (amber) for minor issues like rate or deadhead.

### Test Case 2: Score filters
**Test:** Use the "High Score", "Critical Issues", and "Minor Issues" filter buttons on `/driverAuctions`.

**Expected:** Each filter narrows the list to the matching category only, and its button shows an accurate count.

### Test Case 3: Recommendation boost from recent activity and location
**Test:** As `testUser1`, claim/complete load 000000000000000000000106 (drops off in Edmonton), then revisit `/driverAuctions`.

**Expected:** Load 000000000000000000000107 (originates in Edmonton, pickup within 48h of 000000000000000000000106's dropoff) now scores noticeably higher — geographic proximity and temporal adjacency both apply — while a same-day but geographically distant alternative (load 000000000000000000000108, Toronto -> Montreal) scores lower by comparison.

---

## Schedule Conflict Detection

### Test Case 1: Warning on overlapping claim
**Test:** As a driver with a booked load in a given date range, attempt to claim/bid load 000000000000000000000116 (Vancouver -> Kamloops) whose pickup/dropoff overlaps.

**Expected:** A conflict warning appears in the dialog before submission, naming the conflicting load and its dates.

### Test Case 2: No warning on non-overlapping loads
**Test:** Claim/bid load 000000000000000000000114 (Halifax -> St. John's), which has no date overlap with existing bookings.

**Expected:** No warning shown; the action proceeds normally.

---

## Realtime Sync (SSE)

### Test Case 1: Multi-client bid and price sync
**Test:** Open the same auction in two company-side tabs; from a third tab (driver), place a bid, then have the company accept it.

**Expected:** Both company tabs reflect the new bid and the accepted/price update within 2 seconds, no refresh needed.

### Test Case 2: Disconnection and keep-alive
**Test:** Open an auction live page, then stop the backend (`docker compose stop backend`). Separately, leave a near-expiry auction page open, untouched, for 3+ minutes.

**Expected:** A "Connection lost" banner appears within 30 seconds of the backend stopping. The untouched tab shows no false disconnect and the countdown keeps ticking.

### Test Case 3: No socket leak across navigation
**Test:** With DevTools Network tab filtered to `stream`, visit several different auction/notification pages in a row, navigating away each time.

**Expected:** Old stream connections close/cancel shortly after navigating away rather than accumulating as pending (browsers cap concurrent connections per origin at 6 — this used to cause multi-second hangs on rapid back-to-back claims).

---

## Notifications

### Test Case 1: Bell badge and drawer
**Test:** Trigger an event (bid placed, bid accepted) then open the notification bell.

**Expected:** Unread badge count is accurate; drawer lists title, message, and relative timestamp; a Sonner toast also appears for the realtime event.

### Test Case 2: Mark read / delete
**Test:** Mark a single notification read, then "Mark all as read"; delete a notification.

**Expected:** Unread count decrements correctly in both cases; deleted items disappear from the list.

### Test Case 3: Account-banned dialog still fires
**Test:** As admin, ban a logged-in user while they're sitting on any page.

**Expected:** `AccountBannedDialog` appears immediately with the ban reason (shares the same stream as the notification bell, not a separate connection).

---

## In-App Messaging

### Test Case 1: Start and reply to a thread
**Test:** As a driver, open an assigned load's Manage dialog, click "Message [Company]," send a message. As the company, open `/messages`, find the thread, reply.

**Expected:** Messages appear in order with sender attribution/timestamps on both sides; the driver receives a message notification.

### Test Case 2: Thread filtering
**Test:** On `/messages`, switch between Active / Completed / Cancelled / All tabs.

**Expected:** Thread list narrows to match the underlying load's status.

---

## Driver Check-In & Live Tracking

### Test Case 1: Mark in transit and open the map
**Test:** As a driver, set a booked load to "In Transit" via Manage, then open its map/check-in view.

**Expected:** A curvy Leaflet route renders between origin and destination with generated checkpoints along the way.

### Test Case 2: Check in at current and checkpoint locations
**Test:** Click "check in" at the current location (allow/spoof location access); then click a checkpoint.

**Expected:** Current-location check-in shows a locator radius around the (fuzzed) position. Checkpoint check-in shows a confirmation popup if within 10km, or a warning popup (still confirmable) otherwise.

---

## Rate Confirmation (PDF + S3)

### Test Case 1: Generated on bid acceptance
**Test:** As a driver, win/claim a load; as the company, accept the bid. Open the driver's "Rate confirmation ready" notification/link.

**Expected:** A real PDF (via `pdf-lib`) is generated, uploaded to S3, and downloadable via a presigned URL containing load, driver, and payout details.

### Test Case 2: S3 uploads for profile documents
**Test:** As a driver, upload a certification file and a profile picture from the Driver profile page.

**Expected:** Both upload via presigned PUT to S3; URLs are stored on the profile and render correctly (no 403 on view).

---

## Bill of Lading

### Test Case 1: Driver uploads a signed BOL
**Test:** As `testUser1`, whose load 000000000000000000000119 is Completed with an accepted bid, open the Manage dialog on `/driverLoads` and use "Upload Signed BOL."

**Expected:** Spinner while uploading, then a success toast. The upload control only appears for Completed loads — not Booked/In Transit.

### Test Case 2: Retry on failed upload
**Test:** Simulate an upload failure (block the request in DevTools) and attempt the upload.

**Expected:** Error toast, file input clears, and re-selecting the file retries cleanly.

### Test Case 3: Company/admin review on load detail
**Test:** As the owning company or as admin, open load 000000000000000000000119's detail page.

**Expected:** "Signed Bill of Lading" row shows a Review link once the driver has submitted it (no upload control appears here for anyone — upload lives only in the driver's Manage dialog).

### Test Case 4: Admin Bills of Lading console
**Test:** As admin, open `/admin/bill-of-lading`.

**Expected:** All bids with a generated BOL are listed (route, commodity, pickup date, driver, bid amount) with working Download (original PDF) and Signed Copy (once uploaded) links, and correct status badges ("PDF not generated" / "Awaiting signed copy" / "Shipper-signed copy on file"). Search filters by origin/destination/commodity/driver.

---

## Blocklist & Feed Preferences

### Test Case 1: Driver blocks/unblocks a company
**Test:** As a driver, block a company from `/blocklist` with "Hide loads from blocked companies" on, then check `/driverAuctions`; then unblock.

**Expected:** That company's loads disappear then reappear accordingly.

### Test Case 2: Company blocks a driver's bids
**Test:** As a company, block a driver with "Hide bids from blocked drivers" on; have that driver bid on a live auction.

**Expected:** The blocked driver's bid does not appear in the company's bid list.

### Test Case 3: Report from blocklist, preferences persist
**Test:** Click "Report" on a blocked entry; toggle feed preferences off/on and reload the page.

**Expected:** Redirects to `/report/fraud` pre-filled with the entity. Preference toggles retain state after reload.

---

## Driver Profile & Fleet Management

### Test Case 1: Profile renders and edits
**Test:** Open `/driver`. Edit personal info (title), upload a certification, toggle notification preferences.

**Expected:** All cards (Driver Info, Contact, Trucks, Trailers, Performance, Notification Preferences) render; edits persist; new certification shows "Pending Review."

### Test Case 2: Truck and trailer CRUD
**Test:** Add, edit, and delete a truck; add a trailer.

**Expected:** Each action reflects immediately in the respective card with a success toast.

### Test Case 3: Public driver profile and review
**Test:** As a company, open a driver's public profile for a driver you've completed a load with; write a review.

**Expected:** Profile shows performance/ratings and completed loads; the review posts and updates the rating summary; attempting to review the same driver+load again is prevented.

---

## Company Public Profile

### Test Case 1: View a company's public profile
**Test:** As a driver, click through to a company's public profile page.

**Expected:** Company profile renders (name, public info/reviews), mirroring the driver public-profile pattern.

---

## Document Expiry Alerts

### Test Case 1: Expiring and expired document banners
**Test:** Upload a certification with an expiry date within 30 days, then one already in the past.

**Expected:** A warning `AlertBanner` for the soon-to-expire case; an error banner (plus a notification) for the already-expired case; no banner at all when all documents are valid for 30+ days.

---

## Reports & Moderation

### Test Case 1: Submit fraud / inaccuracy reports
**Test:** Submit via `/report/fraud` and `/report/inaccurate` with an autocompleted target (only entities/loads you've actually collaborated with should be selectable).

**Expected:** Both land in `/report` (My Reports) as "Under Review."

### Test Case 2: Admin visibility and resolution
**Test:** As admin, open `/admin/reports`, find the submitted report, follow the reporter/target profile links.

**Expected:** Links resolve correctly. Once resolved/dismissed (via admin action or seed), the reporter's My Reports view reflects the updated status with an explanation.

---

## Admin Portal

### Test Case 1: Dashboard overview
**Test:** Open `/admin/dashboard`.

**Expected:** Stat cards (Drivers, Companies, Loads, Bids, Docs to Review) reflect real counts; Recent Rate Confirmations panel and quick-action links to Documents/Users work.

### Test Case 2: Document review
**Test:** As admin, open `/admin/documents`, find a driver with an uploaded certification, view it, then Approve/Reject.

**Expected:** File opens via a presigned S3 URL; status updates after the action.

### Test Case 3: User directory and actions
**Test:** Open `/admin/users`. Filter by role. Ban `annoyingUser@delete.me` while logged in elsewhere, then delete a disposable test user.

**Expected:** Role filters narrow the table correctly. Banning shows the ban reason to the affected session immediately and blocks future login with the reason shown. Deletion removes the account and blocks login.

---

## Regression / Cross-Cutting

### Test Case 1: Protected routes and unknown routes
**Test:** As a driver, navigate to an admin or company-only route (e.g. `/admin/users`, `/company/dashboard`); navigate to a nonexistent path (e.g. `/xyz`).

**Expected:** Role-gated routes redirect away; unknown routes show a 404 page.

### Test Case 2: Filter debounce doesn't break dialogs
**Test:** On any filter bar (Company Auctions, Company Dashboard, Driver Dashboard, Driver Revenue Center), type into a filter field and immediately open an action dialog (Accept Bid, Claim Load) while the debounce is still pending.

**Expected:** No stuck state or frozen UI; the dialog opens/responds normally, and results settle to the debounced filter value (~400ms) rather than updating on every keystroke.

### Test Case 3: UI polish smoke check
**Test:** Load `/login` and toggle between Driver/Company tabs; view a Spend-by-Route or Profit-by-Route chart on a dashboard with several routes; open Post Load / Load Detail / Edit Load as a company.

**Expected:** Login panel transitions smoothly with no layout jump. Chart x-axis route labels are fully legible, not truncated/overlapping. Post Load, Load Detail, and Edit Load show a Back link instead of the usual breadcrumb.

### Test Case 4: Backend test suite passes
**Test:** In `backend/`, run `npm test`.

**Expected:** Full Jest suite passes with 0 failing suites.

### Test Case 5: Frontend build and lint are clean
**Test:** In `frontend/`, run `npm test`.

**Expected:** Full test suite passes with 0 failing suites.

---

## Security (API-level authorization)

### Test Case 1: Driver cannot bid as another driver
**Test:**
```
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $JWT" \
    -d '{"amount": 1000, "driverId": "000000000000000000000011"}' \
    http://localhost:5001/api/auctions/000000000000000000000101/bids
```
(JWT belongs to testUser2; `driverId` in the body points at testUser1 — `000000000000000000000011`.)

**Expected:** The bid is placed under testUser2 (the authenticated driver), not testUser1 — `driverId` is derived from the Firebase token and the request body value is ignored.

### Test Case 2: Company cannot bid in its own auction
**Test:**
```
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $JWT" \
    -d '{"amount": 600}' \
    http://localhost:5001/api/auctions/000000000000000000000101/bids
```
(JWT belongs to testCompany1 or testCompany2.)

**Expected:** `{"message":"Forbidden: insufficient role"}`

### Test Case 3: Company cannot view another company's dashboard
**Test:**
```
curl http://localhost:5001/api/company/000000000000000000000002/dashboard \
    -H "Authorization: Bearer $JWT"
```
(JWT belongs to testCompany1 — `000000000000000000000001` — requesting testCompany2's — `000000000000000000000002` — dashboard.)

**Expected:** `{"message":"Forbidden: not your resource"}`

---

## Notes

- `docs/security-xss.md` covers the separate XSS security assessment and is not duplicated here.