# LoadLink Milestone 3 Test Plan

> **Scope:** This plan covers the functionality added or significantly improved since the Milestone 2 baseline commit `81c7d1b` (`81c7d1b00256cf9efb9dfaa6ed1d5aca21ef8f6a`), i.e. the features verified in `docs/plans/Milestone2_Status.md` as now implemented. It is **additive** to `docs/TestPlan M2.md` — run those M2 cases as a regression suite, and use the cases below for the new surfaces (notifications, rate confirmations + S3, blocklist &amp; preferences, driver profile/fleet, reviews, admin portal).
>
> All new routes referenced below are confirmed present in `frontend/src/config/routes.ts`.

## Prerequisites

- Clone the branch containing the M3 work (HEAD `03db45a` or later)
- Place the provided `.env` file in the project root (must include AWS S3 keys for the PDF/S3 cases, Firebase Private Key, Firebse Client Email, Firebase Project for authentication, Geoapify key for map)
- Run `docker compose up --build`
- Wait until all three services are healthy in Docker Desktop (mongo -&gt; backend -&gt; frontend)
- App URL: [http://localhost:3000](http://localhost:3000)
- Backend health: [http://localhost:5001/api/health](http://localhost:5001/api/health)
- The database is seeded automatically on first boot

## Seeded Accounts


| Email                                                       | Password | Role    |
| ----------------------------------------------------------- | -------- | ------- |
| [testUser1@example.com](mailto:testUser1@example.com)       | 12345678 | driver  |
| [testUser2@example.com](mailto:testUser2@example.com)       | 12345678 | driver  |
| [testUser3@example.com](mailto:testUser3@example.com)       | 12345678 | driver  |
| [testUser4@example.com](mailto:testUser4@example.com)       | 12345678 | driver  |
| [testUser5@example.com](mailto:testUser5@example.com)       | 12345678 | driver  |
| [testCompany1@example.com](mailto:testCompany1@example.com) | 12345678 | company |
| [testCompany2@example.com](mailto:testCompany2@example.com) | 12345678 | company |


> **Note:** Test steps are ordered so that most steps can be performed sequentially without backtracking.

---

## Notifications

### Test Case 1: Notification bell shows unread count

**Test:** Log in as `testCompany1` (company). With at least one prior auction event (e.g. a bid placed on one of company1's loads, or a load claimed), open the app and locate the bell icon in the top nav (`NavUser` -&gt; `NotificationBell`). 

**Expected:** The bell displays a badge with the number of unread notifications. Clicking it opens the notifications drawer listing items with title, message, and relative timestamp.

### Test Case 2: Driver receives "bid accepted" notification

**Test:**

1. In browser one, as a driver (`testUser1`), place a winning bid or claim a load from `testCompany1` via `/driverAuctions/<loadId>` (use load `000000000000000000000101`).
2. In browser two(incognito), as the company (`testCompany1`), open `/auctionLive/000000000000000000000101` and click **Accept bid** on that driver's bid.
3. In browser one, as `testUser1` (driver) and open the notification bell. **Expected:** Notifications titled "Your bid was accepted!" and "Rate confirmation ready" appear for the driver, with the accepted amount and a link to the rate confirmation.

### Test Case 3: Mark as read / mark all read

**Test:** With the notifications drawer open, click an individual notification's "mark read" control, then click "Mark all as read". 

**Expected:** The unread badge count decrements to 0; read items lose their highlighted background.

### Test Case 4: Delete a notification

**Test:** In the notifications drawer, click the delete (trash) control on a notification. 

**Expected:** The notification is removed from the list and the unread count is unchanged if it was already read (decrements if it was unread).

### Test Case 5: Toast on realtime event

**Test:** With two tabs open (one company on `/auctionLive/<loadId>`, one driver placing a bid), place a bid as the driver. 

**Expected:** The company tab shows a Sonner toast (`ToastManager`) for the new bid in addition to the persistent bell notification.

---

## Rate Confirmation PDF + S3 Storage

### Test Case 1: PDF generated and stored on bid accept

**Test:**

1. As driver `testUser1`, claim or win load `000000000000000000000101` (driver claims; company accepts).
2. After accept, open the driver's notification for "Rate confirmation ready" and follow its link (or open `/driverAuctions/000000000000000000000101` and check the "Rate confirmation is being generated" banner once ready). 
3. **Expected:** A real PDF is generated via `pdfService` (pdf-lib), uploaded to S3, and a presigned download URL (`rateConfirmationUrl`) is returned — no longer a placeholder string. The link downloads a valid PDF containing load + driver + payout details.

### Test Case 2: S3 document upload (certifications / profile picture)

**Test:**

1. Register a new driver (or edit profile) and upload a certification file via the Driver Info drawer (`/driver/profile` -&gt; Edit Personal Information -&gt; Upload certification).
2. Also upload a profile picture. 
3. **Expected:** Files upload directly to S3 via a presigned PUT URL; the returned URLs are stored on the driver profile (`certificationDocuments`, `profilePictureUrl`) and render in the UI. No 403 on GET after the backend swaps to a presigned viewable URL.

---

## Blocklist &amp; Preferences

### Test Case 1: Block a company from driver feed

**Test:**

1. Log in as driver `testUser1`.
2. Open `/blocklist` (Blocklist &amp; Preferences).
3. Add `testCompany1` to the blocklist (choose a reason).
4. Toggle "Hide loads from blocked companies" on.
5. Navigate to `/driverAuctions`. 
6. **Expected:** Loads owned by `testCompany1` no longer appear in the driver's auction browser. The blocklist entry is listed in the table.

### Test Case 2: Unblock restores feed

**Test:** From `/blocklist`, unblock `testCompany1`. 

**Expected:** `testCompany1`'s loads reappear in `/driverAuctions`.

### Test Case 3: Company blocks a driver (hides their bids)

**Test:**

1. Log in as `testCompany1`.
2. Open `/blocklist`, block driver `testUser2`.
3. Ensure "Hide bids from blocked drivers" is on.
4. Have `testUser2` place a bid on one of company1's live auctions (`/auctionLive/...`).
5.  **Expected:** The blocked driver's bid is not shown in the company's bid list / auction controls.

### Test Case 4: Report from a blocklist row

**Test:** On `/blocklist`, click the "Report" action on a blocked entry. **Expected:** Redirected to `/report/fraud` with the entity name pre-filled.

### Test Case 5: Feed preferences persist

**Test:** Toggle the hide options off/on, reload the page. **Expected:** Preference toggles retain their state (backed by `getFeedPreferences` / `updateFeedPreferences`).

---

## Driver Profile &amp; Fleet Management (UI)

### Test Case 1: Profile page renders

**Test:** Log in as driver `testUser1` and open `/driver/profile` (via the user dropdown -&gt; Settings/My Profile). 

**Expected:** Page shows Driver Info card (name, carrier creds MC#/DOT#/NSC), Contact card, Trucks card, Trailers card, Performance (ratings) card, and Notification Preferences card.

### Test Case 2: Add a truck

**Test:** On `/driver/profile`, click **Add New Truck**, fill year/make/model/type/trailer length/capacity/plate, set as primary, save. **Expected:** Truck appears in the Trucks card; a success toast shows. `GET /api/driver/<id>/trucks` reflects the new truck.

### Test Case 3: Edit a truck

**Test:** Click the edit (pencil) button on an existing truck, change the trailer length, save.

 **Expected:** The truck card updates with the new value.

### Test Case 4: Delete / remove a truck

**Test:** Open the truck drawer for an existing truck and delete it (confirm). **Expected:** The truck is removed from the list

### Test Case 5: Add a trailer

**Test:** Click **Add Trailer**, fill unit number and details, save. 

**Expected:** Trailer appears in the Trailers card.

### Test Case 6: Edit personal info + certifications

**Test:** Open Edit Personal Information; change the professional title, upload a certification file, save. 

**Expected:** Title updates; the new certification document appears with a `Pending Review` badge; stored on S3.

### Test Case 7: Notification preferences toggle

**Test:** On the Notification Preferences card, toggle Email / SMS / Work notifications. 

**Expected:** Toggles persist and are reflected in `driver.notificationPreferences`.

### Test Case 8: Public driver profile + reviews

**Test:** As a company (`testCompany1`), open a driver's public profile `/driver/profile/<driverId>` (e.g. from a DriverNameLink).

**Expected:** Public profile renders with Performance/ratings, completed loads, and a "Write a Review" button. Submitting a review creates a `Review` and updates the driver's `ratingSummary`.



---

## Enhanced Eligibility &amp; Scoring System

### Test Case 1: High-score load highlighting (≥80)

**Test:**

1. Log in as a driver and navigate to `/driverAuctions`.
2. Look for loads with a green eligibility badge (green progress bar + Star icon) indicating a score ≥ 80.
3. Hover over the "Your Score" badge to see the tooltip.
4. Click on a high-score load to view the right panel details. 
5. **Expected:**
  - The `EligibilityBadge` shows a green progress bar with a Star icon
  - Tooltip lists specific highlights (e.g., "Excellent rate: $X.XX/mi (Y% above minimum)", "Zero deadhead", "Perfect schedule fit", "Low competition", "High value")
  - The `DetailedEligibilityPanel` in the right panel shows a "Top Pick" badge, the large score, and a "Why This is a Top Pick" section with checkmarked highlights

### Test Case 2: Critical ineligibility display (schedule conflict)

**Test:**

1. As a driver with a booked load on July 13–15, navigate to `/driverAuctions`.
2. Look for loads with overlapping pickup/dropoff dates (e.g., another load also on July 13–15).
3. Observe the eligibility badge and hover for tooltip.
4. Click the load to view the right panel. 
5. **Expected:**
  - The badge shows a red progress bar with AlertTriangle icon
  - Tooltip shows "Not fully eligible" with "Schedule conflict" listed
  - In the `DetailedEligibilityPanel`, "Critical Issues" section appears first with a red header, showing "No schedule conflict" with an XCircle icon
  - The status badge reads "Critical Issues"

### Test Case 3: Minor ineligibility display (rate/value/deadhead)

**Test:**

1. As a driver with high minimum rate preferences, look for a load that doesn't meet the minimum rate but has no schedule conflict.
2. Observe the eligibility badge and hover for tooltip.
3. Click the load to view the right panel. 
4. **Expected:**
  - The badge shows an amber progress bar with AlertTriangle icon
  - Tooltip shows "Below minimum rate per mile" in the reasons list
  - In the `DetailedEligibilityPanel`, "Other Issues" section shows the specific issue(s) with amber XCircle icons
  - The status badge reads "Issues Found"

### Test Case 4: Filter by high-score loads

**Test:**

1. Navigate to `/driverAuctions`.
2. Click the "High Score" filter button in the filter bar.
3. Observe the load list and counts. 
4. **Expected:**
  - Only loads with recommendation score ≥ 80 are shown
  - The "High Score" button shows the count of loads meeting this threshold
  - The button is styled with a default (primary) variant when active
  - Load cards show green eligibility badges

### Test Case 5: Filter by critical issues

**Test:**

1. Navigate to `/driverAuctions`.
2. Click the "Critical Issues" filter button.
3. Observe the load list. 
4. **Expected:**
  - Only loads with `eligibleSchedule = false` or `eligibleCertifications = false` are shown
  - The "Critical Issues" button shows the count and uses destructive (red) variant when active
  - Load cards show red eligibility badges

### Test Case 6: Filter by minor issues

**Test:**

1. Navigate to `/driverAuctions`.
2. Click the "Minor Issues" filter button.
3. Observe the load list. 
4. **Expected:**
  - Only loads with minor ineligibility reasons (truck type, trailer length, rate, value, deadhead) are shown
  - The "Minor Issues" button shows the count and uses outline variant with amber styling
  - Load cards show amber eligibility badges

### Test Case 7: Tooltip portal rendering (no clipping)

**Test:**

1. Navigate to `/driverAuctions` and find a load with a long tooltip (e.g., high-score with many highlights, or multiple ineligibility reasons).
2. Scroll the load list so the badge is near the bottom of the viewport.
3. Hover over the "Your Score" badge. 
4. **Expected:** The tooltip appears fully visible above the badge, not clipped by the `LoadCard` container or any parent overflow. The tooltip is rendered at the `document.body` level via React portal.

### Test Case 8: DetailedEligibilityPanel content

**Test:**

1. Select a high-score load (≥80) and view the right panel.
2. Then select an eligible load (score &lt; 80).
3. Then select a critical ineligible load.
4. Then select a minor ineligible load.
5.  **Expected:**
  - High-score: Shows large score, "Top Pick" badge, "Why This is a Top Pick" section with highlighted reasons
  - Eligible (&lt;80): Shows large score, "Eligible" badge, "You meet all basic eligibility requirements", and an info note about scores above 80
  - Critical ineligible: Shows large score, "Critical Issues" badge, critical issues listed first in red, followed by any minor issues in amber
  - Minor ineligible: Shows large score, "Issues Found" badge, minor issues listed in amber

## Recommended Loads / Recommendation Engine

### Test Case 1: Geographic proximity increases recommendation score when driver is at load location

**Test:**

1. Log in as a driver with a completed load ending in Edmonton (e.g. complete load `000000000000000000000106` Vancouver → Edmonton).
2. Navigate to `/driverAuctions` and observe the recommendation scores.
3. Note the score for load `000000000000000000000107` (Edmonton → Winnipeg, current price: $3,056, best bid: $3,194) which originates from Edmonton. 
4. **Expected:** The recommendation score for load 107 is high because:
  - The driver's current location is Edmonton (from the completed load's destination)
  - Load 107's origin is Edmonton (near-zero haversine distance)
  - The geographic proximity sub-score approaches 100
  - This significantly boosts the overall weighted recommendation score compared to loads from distant cities.

### Test Case 2: Temporal adjacency increases recommendation score

**Test:**

1. Log in as a driver (e.g. `testUser1`) and ensure the driver has no existing booked loads.
2. Note the initial recommendation scores on `/driverAuctions` (or the recommended loads section). Loads that are temporally adjacent to the driver's current location should score lower because there is no prior load establishing a location.
3. Have the driver claim/book load `000000000000000000000106` (Vancouver, BC → Edmonton, AB, pickup July 10, dropoff July 12).
4. After booking, revisit the recommended loads list. 
5. **Expected:** Load `000000000000000000000107` (Edmonton, AB → Winnipeg, MB, pickup July 13, current price: $3,056, best bid: $3,194) now appears with a higher recommendation score than before, because:
  - The driver's last known location is Edmonton (from load 106 dropoff)
  - Load 107 originates in Edmonton (same region)
  - Pickup is within 48 hours of load 106 dropoff (temporal adjacency)
  - The combined effect increases the temporal adjacency sub-score, raising the overall weighted recommendation score.
  - **Confirmed manually:** log in as `testUser1`, claim/book load `106` (Vancouver → Edmonton) — load `107`'s recommendation score then goes above 80 (green "Top Pick" badge).

### Test Case 3: Same-day cross-country alternative lowers relative score

**Test:**

1. Continuing from the state above (driver just finished load 106 in Edmonton on July 12), observe the recommendation scores for loads available on July 12.
2. Compare the score for load `000000000000000000000108` (Toronto, ON → Montreal, QC, pickup July 12, current price: $2,847, best bid: $3,152) against load `000000000000000000000107` (Edmonton → Winnipeg, pickup July 13). 
3. **Expected:** Load 107 (Edmonton → Winnipeg, current price: $3,056, best bid: $3,194) scores higher than load 108 (Toronto → Montreal) because:
  - Load 107 is in the same region as the driver's current location (Edmonton)
  - Load 108 is across the country (Toronto), resulting in a much lower geographic proximity score and a higher deadhead penalty
  - Temporal adjacency applies equally (both within 48h), so geographic proximity becomes the differentiator.

### Test Case 4: Schedule conflict reduces eligibility/score

**Test:**

1. As a driver with an existing booked load overlapping July 13–15, open recommended loads.
2. Load `000000000000000000000107` (Edmonton → Winnipeg, July 13–15) should either be ineligible or score very low due to schedule overlap. **Expected:** The `eligibleSchedule` flag is false and the load is either filtered from the recommendation list or deprioritized.

### Test Case 5: Accept load and observe recommendation boost

**Test:**

1. As driver `testUser1`, place a bid on load `000000000000000000000106` (Furniture, Vancouver, BC → Edmonton, AB, 48ft DryVan, 18,000 lbs) via `/driverAuctions/000000000000000000000106` — e.g. bid at the Accept Now price of $1,020.
2. Log in as `testCompany1` and navigate to `/auctionLive/000000000000000000000106`. Observe the current live auction values: Accept Now $1,020 (cap $1,450).
3. Click **Accept bid** on `testUser1`'s bid to accept the load (load 106 is now booked for `testUser1`, with dropoff July 12 in Edmonton).
4. Log back in as `testUser1` and navigate to `/driverAuctions`. **Expected:**
  - Load `000000000000000000000107` (Lumber, Edmonton, AB → Winnipeg, MB, 48ft DryVan, 25,000 lbs, current price: $3,056, best bid: $3,194) now appears with a high recommendation score (above 80, "Top Pick" badge) because:
    - The driver's current location is Edmonton (from the just-booked load 106's destination)
    - Load 107 originates in Edmonton (near-zero haversine distance, zero deadhead)
    - Load 106's dropoff (July 12) is within 48 hours of load 107's pickup (July 13) — temporal adjacency
    - Geographic proximity and temporal adjacency significantly boost the recommendation score
  - The `DetailedEligibilityPanel` shows a "Top Pick" badge with "Why This is a Top Pick" highlighting: "Excellent rate", "Zero deadhead", "Perfect schedule fit", etc.

---

## Admin Portal

### Test Case 1: Admin login

**Test:** Navigate to `/admin` and log in with the seeded admin account (`admin@example.com` / `12345678`).

**Expected:** Redirected to `/admin/dashboard`. Logging in with a non-admin account on this page is rejected with "This account does not have admin privileges."

### Test Case 2: Dashboard overview

**Test:** On `/admin/dashboard`, observe the stat cards and the "Recent Rate Confirmations" panel.

**Expected:** Drivers, Companies, Loads, and Bids counts are non-zero and reflect seed data. "Docs to Review" reads 0 until a document is uploaded (Test Case 3). The "Recent Rate Confirmations" panel reads "No rate confirmations yet." until a bid is accepted (Test Case 4); "Document Review" and "User Management" quick-action links navigate to `/admin/documents` and `/admin/users`.

### Test Case 3: View a submitted document

**Test:**

1. As a driver, upload a certification document (`/driver/profile` -&gt; Edit Personal Information -&gt; Upload certification) — seeded drivers have none uploaded by default, so this step is required to have something to review.
2. As admin, open `/admin/documents`, search for that driver, and expand their row.
3. Click **View** on the uploaded document.

**Expected:** The document appears under "Certification Documents" (or "Insurance Certificates") with a "Pending Review" badge. **View** opens the file via a presigned S3 URL. **Approve** and **Reject** actions are available on the row.

### Test Case 4: View a generated rate confirmation

**Test:**

1. As `testCompany1`, accept a driver's bid on a live auction (e.g. load `000000000000000000000101`) so a rate confirmation PDF is generated — no seeded bid is accepted by default, so this step is required to have something to view.
2. As admin, open `/admin/rate-confirmations`.

**Expected:** The accepted bid is listed with load route, pickup date/commodity, driver name, and bid amount, plus a working **Download** link to the generated PDF (no "PDF not generated" badge). The same entry now also appears in the dashboard's "Recent Rate Confirmations" panel.

### Test Case 5: User directory

**Test:** Open `/admin/users`.

**Expected:** Table lists all seeded users (5 drivers, 2 companies, 1 admin) with role badge, joined date, and last active date. The role filter buttons (all/driver/company/admin) narrow the list correctly.

---

## Reviews &amp; Ratings

### Test Case 1: Submit a review

**Test:** As `testCompany1`, open `/driver/profile/<driverId>` for a driver you've completed a load with, click "Write a Review", pick an eligible load, rate categories, submit. **Expected:** Review appears in the driver's Ratings &amp; Reviews section; average/summary updates.

### Test Case 2: Prevent duplicate review

**Test:** Attempt to review the same driver for the same completed load again. **Expected:** The load is excluded from the eligible-load selector (already reviewed), or a duplicate is rejected.

### Test Case 3: Reviews list pagination

**Test:** On a driver profile with many reviews, page through the reviews. **Expected:** Pagination controls work and the correct slice loads per page.

---

## Reports / Moderation

### Test Case 1: Report fraud

**Test:** Open `/report/fraud`, select a target type and entity, enter details, submit. 

**Expected:** Redirected to `/report` (My Reports) with the new report shown as "Under Review".

### Test Case 2: Report inaccurate details

**Test:** Open `/report/inaccurate`, choose an inaccurate-details category, submit. 

**Expected:** Report is logged and appears under My Reports as "Under Review".

### Test Case 3: Report status lifecycle

**Test:** After admin review (manual/seed), reopen My Reports. 

**Expected:** The report status updates to Resolved or Dismissed and the info panel explains the outcome.

---

## Regression / Cross-Cutting

### Test Case 1: Protected routes still enforced

**Test:** Log in as a driver, then manually navigate to `/company/dashboard` 

**Expected:** Redirected away (RoleRoute) — driver cannot view company pages; 404 or role-home redirect as configured.

### Test Case 2: No `PLACEHOLDER_DRIVER_ID` leakage

**Test:** Log in as `testUser1`, open `/driverAuctions`. 

**Expected:** The Recommended section and active-bids banner use the real logged-in driver ID (no `#PLACEHOLDER` style fallback IDs in the rendered DOM / network calls).

### Test Case 3: Backend test suite passes

**Test:** In `backend/`, run `npm test`. 

**Expected:** The Jest suite (auction, heartbeat, driver, load, blocklist, review, report, truck, upload, user, authorize, requireAuth, errorHandler, etc.) runs with 0 failing suites.

---

## Security

### Test Case 1: Driver2 try to place a bid for Driver1

```
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $JWT" \
    -d '{"amount": 1000, "driverId": "000000000000000000000011"}' \
    http://localhost:5001/api/auctions/000000000000000000000101/bids
```

Expected response: Driver 2 successfully place a bid for themself, since we derive the driverId from firebase token, not from request body.

### Test Case 2:  Company 1 try to place a bid in their own auction

```
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $JWT" \
    -d '{"amount": 600}' \
    http://localhost:5001/api/auctions/000000000000000000000101/bids
```

Expected response: {"message":"Forbidden: insufficient role"}

### Test Cae 3: Company 1 try to view the revenue of Company2

```
curl http://localhost:5001/api/company/000000000000000000000002/dashboard \
    -H "Authorization: Bearer $JWT"
```

Expected response: {"message":"Forbidden: not your resource"}

---

##   
Notes

- The M2 plan (`docs/TestPlan M2.md`) remains the canonical regression suite for auth, load posting, auctions/heartbeat/SSE, dashboards, driver browse/bid, and maps. This M3 plan covers everything added afterward.
- Frontend automated tests are still absent; these cases are manual/UI verifications.