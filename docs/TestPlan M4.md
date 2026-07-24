# LoadLink Milestone 4 Test Plan

> **Scope:** This plan covers only the functionality added or significantly changed since the Milestone 3 baseline (`origin/Milestone3`, HEAD `2c9bc99`). It is **additive** to `docs/TestPlan M2.md` and `docs/TestPlan M3.md` — run those as the regression suite, and use the cases below for the new/changed M4 surfaces.
>
> All routes referenced below are confirmed present in `frontend/src/config/routes.ts`.

## Prerequisites

- Clone the `Milestone4` branch (HEAD `dff8df4` or later)
- Place the provided `.env` file in the project root AND `./backend/.env` 
- Run `docker compose up --build`
- Wait until all three services are healthy in Docker Desktop (mongo -&gt; backend -&gt; frontend)
- App URL: [http://localhost:3000](http://localhost:3000)
- Backend health: [http://localhost:5001/api/health](http://localhost:5001/api/health)
- The database is seeded automatically on first boot

## Seeded Accounts


| Email                                                            | Password | Role    |
| ---------------------------------------------------------------- | -------- | ------- |
| [testUser1@example.com](mailto:testUser1@example.com)            | 12345678 | driver  |
| [testUser2@example.com](mailto:testUser2@example.com)            | 12345678 | driver  |
| [testUser3@example.com](mailto:testUser3@example.com)            | 12345678 | driver  |
| [testUser4@example.com](mailto:testUser4@example.com)            | 12345678 | driver  |
| [testUser5@example.com](mailto:testUser5@example.com)            | 12345678 | driver  |
| [annoyingUser@delete.me](mailto:annoyingUser@delete.me)          | 12345678 | driver  |
| [testCompany1@example.com](mailto:testCompany1@example.com)      | 12345678 | company |
| [testCompany2@example.com](mailto:testCompany2@example.com)      | 12345678 | company |
| [admin@example.com](mailto:admin@example.com)                    | 12345678 | admin   |


> **Note:** Test cases are ordered so most steps can be performed sequentially without backtracking. Where a case depends on a load created/booked in an earlier case, that dependency is called out explicitly.

---

## Schedule Conflict Detection

### Test Case 1: Warning shown when bidding on an overlapping load

**Test:**

1. As driver `testUser1`, try to claim the load for Produce  (Vancouver -&gt; Camloops)

**Expected:** A `ScheduleConflictWarning` banner appears inside the dialog before submission, naming the conflicting load and its dates.

### Test Case 2: No warning on non-overlapping loads

**Test:** As `testUser1` , claim load Seafood Products (Halifax -&gt; St.John's)

**Expected:** No conflict warning is shown; the bid/claim proceeds normally.

---

## In-App Messaging

### Test Case 1: Start a thread from a load

**Test:**

1. As driver `testUser1`, navigate to My Loads page and click on the Manage button of an assigned load (with testCompany1 as poster)
2. Click `Message testCompany1`
3. Send a message.

**Expected:** The message appears in the thread immediately; a new thread is created if one didn't exist.

### Test Case 2: Company receives and replies

**Test:** As `testCompany1` (the load's owner), open Messages (`/messages`), select the thread from Test Case 1, and reply.

**Expected:** The thread lists both messages in order with sender attribution and timestamps; `testUser1` sees the reply

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

**Test:** From the same load, open its map view by opening the Manage button and click on "Go to map &amp; Ping".

**Expected:** The Leaflet curvy route renders between origin and destination, and a list of checkpoints will be generated based on the distance between origin and destination. 

### Test Case 3: Complete a check-in at current location

**Test:** Click the "check in" button. Allow location access when prompted, and confirm in the popup dialog. Optionally, spoof location using devtools. **Expected:** There is a locator radius around a (fuzzed) current location (or spoofed location if set in devtool)

### Test Case 4: Complete a checkpoint check-in

**Test:** Click any checkpoint on the bar. 

**Expected:** There's a pop up dialogue showing up and the content depends on the distance between your current location and the checkpoint location. If the distance is within 10 km, you will see a confirmation popup; otherwise you will seeing a warning popup, but you can still confirm checkin.



---

## Bill of Lading 

### Test Case 1: Company Navigate to load details to view BoL

**Test:** Act as a company. Navigate to `[http://localhost:3000/company/auctions](http://localhost:3000/company/auctions)`. Go to any load with 'Auction Closed' status.

**Expected:** 'Bill of Lading' is ready for download. Note Issue#272.

---

## Company Public Profile

### Test Case 1: View a company's public profile

**Test:** As driver `testUser1`, click on a company name (e.g. via a load card or `DriverNameLink`-style link) to navigate to `/company/<companyId>` for `testCompany1`.

**Expected:** A public profile page renders for the company (name, and whatever public company info/reviews are shown), mirroring the existing driver public profile pattern.

---

## Admin User Actions

### Test Case 1: Ban a user

**Test:** 

1. As admin, open `/admin/users`, select a non-admin test user
2. Click on the row and ban user 

**Expected:** The user's row reflects the banned state.  If user was already logged in, the reason for ban is shown and user is redirected to login page. Attempting to log in as that user is blocked and the reason for ban is shown.

### Test Case 2: Delete a user

**Test:** 

1. As admin, on `/admin/users`,  delete user 'annoyingUser@delete.me'.

**Expected:** This user is removed from the directory; the account can no longer log in.

---

## Document Expiry / Renewal Alerts

### Test Case 1: Warning banner for a document expiring soon

**Test:** 

1. login as driver, go to profile
2. click the pencil icon by the profile card and upload certifications
3. pick expiry date within 30 days of the current day

**Expected:** An `AlertBanner` (warning variant) appears naming the document and its expiry date, with an "Update" action that opens the profile editor.

### Test Case 2: Error banner for an already-expired document

**Test:** Repeat with a document whose `expiresAt` is in the past.

**Expected:** An `AlertBanner` (error variant) is shown instead of/alongside the warning banner, and the driver also receives a notification via `NotificationBell`.

### Test Case 3: No banner when documents are current

**Test:** With all certification documents valid for more than 30 days, load `/driver` and `/dashboard`.

**Expected:** No expiry banner is rendered.

---

## Enhancements to Existing Features

### Test Case 1: "Use my location" auction sort

**Test:** As a driver, open `/driverAuctions`  and click Use my location button

**Expected:**  Loads that are closer to current location have improved recommendation scores

### Test Case 2: Admin visibility into user reports

**Test:** Submit a fraud or inaccuracy report (`/report/fraud` or `/report/inaccurate`), then log in as admin and open `/admin/reports`.

**Expected:** The report appears with a working link to the reporter's and target's profiles.

### Test Case 3: Autocomplete when reporting users and a user can only block the ones collaborated with before

**Test:** Login as a driver. Navigate to`[http://localhost:3000/report](http://localhost:3000/report)`and click 'Report Fraud' or 'Report Inaccurate Details'. Click the dropdown.

**Expected:** The dropdown will show a list of companies you have collaborated with before or a list of loads you have worked for, depending on the report category you are using. If you type something in the input box, it will auto-filter the companies.



### Test Case 4: A list of checkpoints to preview in driverAuction

**Test:** Login as a driver. Navigate to `[http://localhost:5173/driverAuctions](http://localhost:5173/driverAuctions)` and click a random load.

**Expected:** You are expected to see a drawer showing up and you will see a single curvy route with multiple checkpoints being rendered on the map. Also, the checkpoints are available in the table, where you can find the area and the estimated arrival time.



&nbsp;

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