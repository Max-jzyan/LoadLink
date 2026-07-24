# LoadLink Milestone 4 Test Plan

> **Scope:** This plan covers only the functionality added or significantly changed since the Milestone 3 baseline (`origin/Milestone3`, HEAD `2c9bc99`). It is **additive** to `docs/TestPlan M2.md` and `docs/TestPlan M3.md` — run those as the regression suite, and use the cases below for the new/changed M4 surfaces (schedule conflicts, messaging, driver check-in, AI insights, bill of lading, company public profile, admin user actions, document expiry alerts, and enhancements to existing load/report/auction flows).
>
> All routes referenced below are confirmed present in `frontend/src/config/routes.ts`.

## Prerequisites

- Clone the `Milestone4` branch (HEAD `dff8df4` or later)
- Place the provided `.env` file in the project root AND `./backend/.env` (must include AWS S3 keys, Firebase Admin credentials, Geoapify key, and `OPENROUTER_API_KEY` for the AI Insights cases)
- Run `docker compose up --build`
- Wait until all three services are healthy in Docker Desktop (mongo -> backend -> frontend)
- App URL: [http://localhost:3000](http://localhost:3000)
- Backend health: [http://localhost:5001/api/health](http://localhost:5001/api/health)
- The database is seeded automatically on first boot

## Seeded Accounts

| Email                                                       | Password | Role    |
| ------------------------------------------------------------- | -------- | ------- |
| [testUser1@example.com](mailto:testUser1@example.com)       | 12345678 | driver  |
| [testUser2@example.com](mailto:testUser2@example.com)       | 12345678 | driver  |
| [testUser3@example.com](mailto:testUser3@example.com)       | 12345678 | driver  |
| [testUser4@example.com](mailto:testUser4@example.com)       | 12345678 | driver  |
| [testUser5@example.com](mailto:testUser5@example.com)       | 12345678 | driver  |
| [testCompany1@example.com](mailto:testCompany1@example.com) | 12345678 | company |
| [testCompany2@example.com](mailto:testCompany2@example.com) | 12345678 | company |
| [admin@example.com](mailto:admin@example.com)                | 12345678 | admin   |

> **Note:** Test cases are ordered so most steps can be performed sequentially without backtracking. Where a case depends on a load created/booked in an earlier case, that dependency is called out explicitly.

---

## Schedule Conflict Detection

### Test Case 1: Warning shown when bidding on an overlapping load

**Test:**

1. As driver `testUser1`, win or claim a load with a pickup/dropoff window (e.g. via `/driverAuctions/<loadId>` -> Claim Now).
2. Still as `testUser1`, open a **different** open load whose pickup/dropoff window overlaps the one just booked, and open the bid dialog (`PlaceBidDialog` or `ClaimLoadDialog`).

**Expected:** A `ScheduleConflictWarning` banner appears inside the dialog before submission, naming the conflicting load and its dates.

### Test Case 2: No warning on non-overlapping loads

**Test:** As `testUser1` (with the booked load from Test Case 1), open the bid dialog on a load whose window does **not** overlap.

**Expected:** No conflict warning is shown; the bid/claim proceeds normally.

---

## In-App Messaging

### Test Case 1: Start a thread from a load

**Test:**

1. As driver `testUser1`, open a load you're assigned to and click the message icon (`MessageButton`) to open `LoadMessagesDrawer`.
2. Send a message.

**Expected:** The message appears in the thread immediately; a new thread is created if one didn't exist.

### Test Case 2: Company receives and replies

**Test:** As `testCompany1` (the load's owner), open Messages (`/messages`), select the thread from Test Case 1, and reply.

**Expected:** The thread lists both messages in order with sender attribution and timestamps; `testUser1` sees the reply on refresh (or in real time if subscribed).

### Test Case 3: Thread list filtering

**Test:** On `/messages`, switch between the Active / Completed / Cancelled / All filter tabs.

**Expected:** The thread list narrows to threads whose underlying load matches the selected status filter.

### Test Case 4: Message notification

**Test:** After Test Case 2's reply, check `testUser1`'s `NotificationBell`.

**Expected:** A notification for the new message appears (bell badge increments).

---

## Driver Check-In

### Test Case 1: Mark a load in transit

**Test:** As `testUser1`, on `/driverLoads`, set the status of a booked load to **In Transit** by using the Manage button in the My Loads page table.

**Expected:** The load's status badge updates to "In Transit."

### Test Case 2: Reach the check-in flow

**Test:** From the same load, open its map view by opening the Manage button and click on "Go to map & Ping".

**Expected:** The Leaflet route renders between origin and destination, and `CheckpointCheckIn` shows the next upcoming checkpoint along the route (not a bare route viewer).

### Test Case 3: Complete a check-in at current location

**Test:** Click the "check in" button. Allow location access when prompted, and confirm in the popup dialog. Optionally, spoof location using devtools.
**Expected:** There is a locator radius around a (fuzzed) current location (or spoofed location if set in devtool)

### Test Case 4: Complete a checkpoint check-in

**Test:** Click the next checkpoint's check-in action, allow location access when prompted, and confirm in the popup dialog.

**Expected:** The checkpoint is marked complete and the view advances to the next checkpoint (or shows "all checkpoints complete" if it was the last one).

### Test Case 5: Direct `/map` access without a load

**Test:** Navigate to `/map` with no `loadId` query param.

**Expected:** The page does not render a usable standalone map (no load context) — confirms the page is check-in-flow-specific rather than a general map viewer.


> **Note:** The AI Route Insights feature requires the user to supply their own OpenRouter API key and can incur unpredictable cost. Checkpoints are instead generated deterministically from route geometry, giving drivers a visual, dependable way to understand their route and plan accordingly in the case that the key is not provided.

### Test Case 6: Checkpoint locations show under loads in driverAuction

**Test:** Navigate to DriverAuction and click on a load card.

**Expected:** The popup drawer shows drlivery timeline card that lists each suggested checkpoint locations.



---

## Bill of Lading / Proof of Delivery

### Test Case 1: Driver uploads proof of delivery

**Test:** As the driver on a load marked **Completed** (or in the completion flow), upload a bill-of-lading / proof-of-delivery image.

**Expected:** The upload succeeds via a presigned S3 PUT URL and the image is attached to the load/bid record.

### Test Case 2: Admin reviews bill of lading

**Test:** As admin, open `/admin/bill-of-lading` (`AdminBillOfLading`).

**Expected:** The uploaded document from Test Case 1 appears in the list with a link to view the image.

---

## Company Public Profile

### Test Case 1: View a company's public profile

**Test:** As driver `testUser1`, click on a company name (e.g. via a load card or `DriverNameLink`-style link) to navigate to `/company/<companyId>` for `testCompany1`.

**Expected:** A public profile page renders for the company (name, and whatever public company info/reviews are shown), mirroring the existing driver public profile pattern.

---

## Admin User Actions

### Test Case 1: Ban a user

**Test:** As admin, open `/admin/users`, select a non-admin test user, and use `BanUserDialog` to ban them.

**Expected:** The user's row reflects the banned state. Attempting to log in as that user is blocked (an "Account Banned" dialog/state is shown, per `AccountBannedDialog`).

### Test Case 2: Delete a user

**Test:** As admin, on `/admin/users`, use `DeleteUserDialog` on a disposable test account (not a seeded account you still need for other cases).

**Expected:** The user is removed from the directory; the account can no longer log in.

---

## Document Expiry / Renewal Alerts

### Test Case 1: Warning banner for a document expiring soon

**Test:** As a driver, ensure a certification document has an `expiresAt` within 30 days (edit via `/driver` -> Edit Personal Information, or seed data), then load `/driver` or `/dashboard`.

**Expected:** An `AlertBanner` (warning variant) appears naming the document and its expiry date, with an "Update" action that opens the profile editor.

### Test Case 2: Error banner for an already-expired document

**Test:** Repeat with a document whose `expiresAt` is in the past.

**Expected:** An `AlertBanner` (error variant) is shown instead of/alongside the warning banner, and the driver also receives a notification via `NotificationBell`.

### Test Case 3: No banner when documents are current

**Test:** With all certification documents valid for more than 30 days, load `/driver` and `/dashboard`.

**Expected:** No expiry banner is rendered.

---

## Enhancements to Existing Features

### Test Case 1: Saved address autocomplete

**Test:** As `testCompany1`, post a load and enter an address you've used before in an `AddressField` (e.g. origin or destination).

**Expected:** Previously used addresses appear as autocomplete suggestions.

### Test Case 2: "Use my location" auction sort

**Test:** As a driver, open `/driverAuctions`, allow location access, and sort by Distance.

**Expected:** Open loads reorder by proximity to the driver's current location (via `useCurrentLocation`).

### Test Case 3: Admin visibility into user reports

**Test:** Submit a fraud or inaccuracy report (`/report/fraud` or `/report/inaccurate`), then log in as admin and open `/admin/reports`.

**Expected:** The report appears with a working link to the reporter's and target's profiles.

### Test Case 4: Rate confirmation PDF field population

**Test:** Accept a bid to generate a rate confirmation PDF (as in M3 Test Case 1 under "Rate Confirmation PDF + S3 Storage"), then open the generated PDF.

**Expected:** The PDF correctly shows the driver's MC #, US DOT #, phone number, truck unit number, and trailer length (previously blank/incorrect).

### Test Case 5: Company load management consolidated into Auctions

**Test:** As `testCompany1`, look for a standalone `/loads` page/nav link.

**Expected:** No separate `/loads` table exists; `/company/auctions` is the single entry point for viewing and managing the company's loads.

---

## Regression / Cross-Cutting

### Test Case 1: Protected routes still enforced

**Test:** Log in as a driver, then manually navigate to `/admin/users`.

**Expected:** Redirected away (`RoleRoute`) — a driver cannot view admin pages.

### Test Case 2: Backend test suite passes

**Test:** In `backend/`, run `npm test`.

**Expected:** The Jest suite runs with 0 failing suites.

---

## Notes

- The M2 (`docs/TestPlan M2.md`) and M3 (`docs/TestPlan M3.md`) plans remain the canonical regression suites for everything not listed above (auth, auctions/heartbeat/SSE, dashboards, blocklist, driver profile/fleet, reviews, admin document/rate-confirmation review, notifications, eligibility scoring).
- Frontend automated tests are still absent; these cases are manual/UI verifications.
- See `docs/M4-XSS.md` for the separate XSS security assessment.
