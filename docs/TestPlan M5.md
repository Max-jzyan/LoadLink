# LoadLink Milestone 5 Test Plan

> **Scope:** This plan covers only the functionality added or significantly changed since the Milestone 4 baseline (`origin/Milestone4`, HEAD `c28b7c6`). It is **additive** to `docs/TestPlan M2.md`, `docs/TestPlan M3.md`, and `docs/TestPlan M4.md` — run those as the regression suite, and use the cases below for the new/changed M5 surfaces.
>
> M5 so far is a bug-fix / polish pass on top of M4 (no new headline feature).

## Prerequisites

- Clone the `FinalRelease` branch 
- Place the provided `.env` file in the project root , `./backend/.env` , and `./frontend/.env`
- Run `docker compose up --build`
- Wait until all three services are healthy in Docker Desktop (mongo -&gt; backend -&gt; frontend)
- App URL: [http://localhost:3000](http://localhost:3000)
- Backend health: [http://localhost:5001/api/health](http://localhost:5001/api/health)
- The database is seeded automatically on first boot
- To reset seed data between runs: `docker compose down -v` then `docker compose up --build`

## Seeded Accounts


| Email                                                       | Password | Role    |
| ----------------------------------------------------------- | -------- | ------- |
| [testUser1@example.com](mailto:testUser1@example.com)       | 12345678 | driver  |
| [testUser2@example.com](mailto:testUser2@example.com)       | 12345678 | driver  |
| [testUser3@example.com](mailto:testUser3@example.com)       | 12345678 | driver  |
| [testUser4@example.com](mailto:testUser4@example.com)       | 12345678 | driver  |
| [testUser5@example.com](mailto:testUser5@example.com)       | 12345678 | driver  |
| [annoyingUser@delete.me](mailto:annoyingUser@delete.me)     | 12345678 | driver  |
| [testCompany1@example.com](mailto:testCompany1@example.com) | 12345678 | company |
| [testCompany2@example.com](mailto:testCompany2@example.com) | 12345678 | company |
| [admin@example.com](mailto:admin@example.com)               | 12345678 | admin   |


> **Note:** Test cases are ordered so most steps can be performed sequentially without backtracking. Where a case depends on state created in an earlier case, that dependency is called out explicitly.

---

## SSE Connection Leak Fix 

Root cause: browsers cap concurrent HTTP/1.1 connections per origin at 6. Leaving auction/notification pages open kept EventSource sockets alive for up to 60s (`keepUnusedDataFor`) after navigating away, and `AccountBannedDialog` opened a duplicate notification stream. Fix: `keepUnusedDataFor: 0` on the streaming queries, and `AccountBannedDialog` now shares `NotificationBell`'s stream instead of opening its own.

### Test Case 1: Claiming multiple loads back-to-back is not delayed

**Test:**

1. As driver `testUser1`, open `/driverAuctions`, open a load's auction detail page, and claim/bid it.
2. Immediately navigate to a different load's auction detail page and claim/bid it too.
3. Repeat for a third load without pausing between them.

**Expected:** Each claim/bid completes promptly (no multi-second hang on the second or third request). Previously the second claim in quick succession would hang for up to ~60s.

### Test Case 2: Socket count stays flat across navigation

**Test:** Open browser DevTools -&gt; Network tab, filter by `stream`. As `testUser1`, visit several different auction detail pages in a row (`/driverAuctions/<loadId>`), navigating away each time.

**Expected:** Old `/api/notifications/stream`, `/api/auctions/.../stream-bids`, `/api/auctions/.../stream-price` connections show as closed/cancelled shortly after navigating away rather than accumulating as still-pending.

### Test Case 3: Account-banned dialog still fires from the shared stream

**Test:** As admin, ban `testUser2` while `testUser2` is logged in and sitting on any page.

**Expected:** `AccountBannedDialog` still appears immediately with the ban reason (same behavior as M4 Admin User Actions Test Case 1), confirming the switch to the shared `useStreamNotificationsQuery` didn't break the ban flow.

---

## Signed Bill of Lading Upload 

The signed-BOL upload control was moved  into the driver's **Manage** dialog on `/driverLoads`

### Test Case 1: Driver uploads a signed BOL from the Manage dialog

**Test:**

1. As driver `testUser1` (or whichever seeded driver has a completed load), go to `/driverLoads`.
2. Open the **Manage** dialog for a load with status **Completed**.
3. Under "Upload Document", click **Upload Signed BOL** and select a PDF or image.

**Expected:** Button shows a loading spinner while uploading, then a success toast ("Signed BOL uploaded."). The upload control is only present for loads in **Completed** status — it does not appear for Booked/In Transit/etc.

### Test Case 2: Company/admin can review the uploaded signed BOL

**Test:** As `testCompany1` (owner of the load from Test Case 1) or as admin, open the same load's detail page.

**Expected:** The "Signed Bill of Lading" row shows a **Review** button linking to the uploaded file once the driver has submitted it.

### Test Case 3: Failed upload can be retried

**Test:** Trigger an upload failure (e.g. disconnect network briefly, or use devtools to block the upload request), attempt the upload.

**Expected:** An error toast appears ("Could not upload the signed BOL. Please try again."), the file input is cleared, and re-selecting the same file retries the upload.

---

## Automated Testing

### Test Case 1: Backend test suite passes

**Test:** In `backend/`, run `npm test`.

**Expected:** The Jest suite runs with 0 failing suites.

### Test Case 2: Frontend Test suite passes

**Test:** In `frontend/`, run `npm test`.

**Expected:** The Jest suite runs with 0 failing suites.

---

## Notes

- The M2 (`docs/TestPlan M2.md`), M3 (`docs/TestPlan M3.md`), and M4 (`docs/TestPlan M4.md`) plans remain the canonical regression suites for everything not listed above.