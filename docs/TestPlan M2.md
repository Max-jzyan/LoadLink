# LoadLink Milestone 2 Test Plan

## Prerequisites

- Clone the Milestone2 branch
- Place the provided `.env` file in the project root
- Run `docker compose up --build`
- Wait until all three services are healthy in Docker Desktop (mongo -> backend -> frontend)
- App URL: http://localhost:3000
- Backend health: http://localhost:5001/api/health
- The database is seeded automatically on first boot

## Seeded Accounts

| Email | Password |
|---|---|
| testUser1@example.com | 12345678 |
| testUser2@example.com | 12345678 |
| testUser3@example.com | 12345678 |
| testUser4@example.com | 12345678 |
| testUser5@example.com | 12345678 |
| testCompany1@example.com | 12345678 |
| testCompany2@example.com | 12345678 |

## Seeded Loads, Auctions and Users

**testCompany1** owns the following pairs (loadId, auctionId):
- (000000000000000000000101, 000000000000000000000201)
- (000000000000000000000102, 000000000000000000000202)
- (000000000000000000000105, 000000000000000000000205)

**testCompany2** owns the following pairs (loadId, auctionId):
- (000000000000000000000103, 000000000000000000000203)
- (000000000000000000000104, 000000000000000000000204)

> **Note:** Test steps are ordered so that most steps can be performed sequentially without backtracking.

---

## Company Workflow

### Test Case 1: Register as Company
**Test:** Navigate to `/signup`, select "Company", fill in a company name, valid email, password ≥ 8 chars, matching confirm password, click Create account. Log out.
**Expected:** Redirected to `/loads`. No error shown. The sidebar should show Dashboard, Loads, Auction Live, Map, and My Fleet. Driver-only items (My Loads, Auctions) are not shown.

### Test Case 2: Log in as Company
**Test:** Navigate to `/login`, select "Company" tab, log in using testCompany1@example.com / 12345678
**Expected:** Redirected to `/loads`. The sidebar should show Dashboard, Loads, Auction Live, Map, and My Fleet. Driver-only items (My Loads, Auctions) are not shown.

### Test Case 3: Navigate to Post Load
**Test:** Click "Post Load" in the page header, or "Post your first load" button in the `/loads` page
**Expected:** Navigated to `/loads/post`.

### Test Case 4: Post Load (empty form)
**Test:** Click Post without filling any fields
**Expected:** Error messages appear under all required fields. Each error clears when valid input is entered.

### Test Case 5: Post Load (form validation)
**Test:** Set delivery date before pickup, enter negative values for any numerical field, set origin equal to destination, set max price below min price
**Expected:** Each field shows an appropriate validation error that clears once corrected.

### Test Case 6: Post Load (valid form)
**Test:** Fill all required fields with valid data and click Post
**Expected:** Sidebar summary populates with the entered fields. Browser dev console shows a 201 response.

### Test Case 7: View Loads page (with loads)
**Test:** Log in as a company that has posted loads
**Expected:** Each load renders as a card showing route, commodity, trailer type, weight, pickup/dropoff times, status badge, and auction prices where applicable.

### Test Case 8: Auction Live (load valid page)
**Test:** Navigate to `/auctionLive/<valid-loadId>` for an active auction.
`/auctionLive/000000000000000000000101`
**Expected:** Load summary, price tracker, auction controls, and bid list all render with no skeleton loaders remaining.

### Test Case 9: Auction Live (invalid load ID)
**Test:** Navigate to `/auctionLive/not-a-valid-id`
`/auctionLive/7`
**Expected:** 404 page is shown.

### Test Case 10: Auction Live (Accept bid)
**Test:** Navigate to `/auctionLive/<valid-loadId>` for an active auction.
`/auctionLive/000000000000000000000101`
**Expected:** On success, a winner banner appears with the driver name and accepted amount.

### Test Case 11: Auction Live (extend deadline)
**Test:** Navigate to `/auctionLive/<valid-loadId>` for an active auction.
`/auctionLive/000000000000000000000102`
Click "Extend Deadline", enter 0, negative number, or positive number of minutes, click Extend
**Expected:** Dialog closes and updates time only if a positive number is entered.

### Test Case 12: Auction Live (edit cap price)
**Test:** Click "Edit Cap Price". Enter a value below the current cap and above the current price, click Save.
**Expected:** If the entered value is above the current cap, dialog closes. New cap price is reflected in the auction.

### Test Case 13: Auction Live (cancel auction)
**Test:** Click "Cancel Auction & Remove Load", then confirm in the dialog
**Expected:** Dialog closes. A "Cancelled" banner replaces the controls. All auction controls are disabled.

### Test Case 14: Auction Live (closed with no winner)
**Test:** Go to `localhost:3000/auctionLive/000000000000000000000105`, an auction closed with no winner
**Expected:** "Closed — Auction closed with no driver" banner with a Reopen button shown.

### Test Case 15: Auction Live (reopen closed auction)
**Test:** With a closed or cancelled auction visible, click "Reopen Auction", enter a positive hours value, confirm
**Expected:** Auction goes live again. Controls re-enable. Previously accepted bids return to submitted status.

### Test Case 16: Auction Live (price creeping)
**Test:** View an auction that price is about to increment
**Expected:** Initial price 1180 creeps up to 1190 within 2 mins.

**Test Steps:**
1. Run `docker compose down -v` at root directory
2. Run `docker compose up --build` at root directory
3. Login as testCompany1
4. Go to `localhost:3000/auctionLive/000000000000000000000104` and make sure the current price you see is 1180. Wait around 2 mins and you will see the price updated to 1190 w/out hard reload.

> Note: You are expected to finish the seeding and login in 2 mins, otherwise you will miss the price creeping.

### Test Case 17: Auction Live (near expiry auction and auto-accept the best bid)
**Test:** Verify an auction auto-closes in 4 mins w/out hard reload and picks the best bid.
**Expected:** The auction ends on time and the UI displays a closed state.

**Test Steps:**
1. Run `docker compose down -v` at root directory
2. Run `docker compose up --build` at root directory
3. Login as testCompany2
4. Go to `localhost:3000/auctionLive/000000000000000000000102`. Wait around 4 min, and the auction should be closed and auto accept the best bid.

### Test Case 18: Auction Live (autoAcceptTriggerHours=1)
**Test:** Verify that an auction expiring in 62 mins but with `autoAcceptTriggerHours=1` will auto accept the best bid when it is one hour from expiration.
**Expected:** The auction ends an hour before expiration time and takes the best bid.

**Test Steps:**
1. Run `docker compose down -v` at root directory
2. Run `docker compose up --build` at root directory
3. Login as testCompany2
4. Go to `localhost:3000/auctionLive/000000000000000000000103`. You can see the countdown timer is around 1h 1 min-ish till close. When it is around 1h, the auction should auto accept the best bid and close.

---

## Driver Workflow

### Test Case 1: Register as Driver
**Test:** Navigate to `/signup`, select "Driver", fill in full name, valid email, password ≥ 8 chars, matching confirm password, click Create account
**Expected:** Redirected to `/driverLoads`. No error shown.

### Test Case 2: Log in as Driver
**Test:** Navigate to `/login`, select "Driver" tab, enter valid driver credentials, click Sign in
testUser1@example.com / 12345678
**Expected:** Redirected to `/driverLoads`.

### Test Case 3: Search/filter
**Test:** Navigate to `/driverAuction` or "Auctions" on the sidebar
**Expected:** List filters to only the Vancouver -> Calgary (Lumber) load. Clearing the search shows all loads again.

### Test Case 4: Recommended loads
**Test:** Log in as Driver 1 (testuser1@example.com) and view `/driverAuctions`.
**Expected:** A "Recommended" section appears with loads matched to this driver's profile.

### Test Case 5: View individual auction
**Test:** Log in as Driver and navigate to `/driverAuctions/000000000000000000000101`.
**Expected:** Full auction detail page renders showing load summary (Vancouver -> Calgary, Lumber, 22,000 lbs), live price tracker ($910), bid table with existing bids, and Claim Now / Place Bid controls.

### Test Case 6: Place a bid
**Test:** In `/Auction`, click on the Grain load posting (Edmonton -> Winnipeg). Enter the bid amount.
**Expected:** For a non-negative number, a bid can be submitted.

### Test Case 7: Claim at current price
**Test:** On `/driverAuctions/000000000000000000000101`, click "Claim Now" while the auction is active.
**Expected:** Load is immediately booked at the current price. An alert/confirmation shows the final payout. The auction closes and bid controls disappear.

### Test Case 8: Cannot bid on closed auction
**Test:** After the previous step closes auction 101, attempt to place a bid on that same load.
**Expected:** Error returned. UI shows the auction is closed and prevents bidding.

### Test Case 9: My Loads: page loads with stats
**Test:** Navigate to `/driverLoads`
**Expected:** Summary cards show correct counts for My Loads, Current Loads in Transit, Active Bids, and Completed Loads.

### Test Case 10: My Loads: loads table
**Test:** View the page with loads present in the backend
**Expected:** Available Loads table renders rows. "Loading…" title shows while fetching.

### Test Case 11: My Loads: click a row selects route on map
**Test:** Click any row in the Available Loads table
**Expected:** The map highlights or pans to the corresponding route.

### Test Case 12: My Loads: map renders routes
**Test:** With loads present, check the map section
**Expected:** Route lines are drawn between origin and destination coordinates for each load.

---

## Shared Tests

### Test Case 1: Unknown route
**Test:** Navigate to any path not in the route list (e.g., `/xyz`)
**Expected:** 404 page is shown.

---

## Authentication

### Test Case 1: Register with mismatched passwords
**Test:** Fill all fields but enter a different value in Confirm password
**Expected:** "Passwords do not match." appears under Confirm password. No account created.

### Test Case 2: Register with short password
**Test:** Enter a password under 8 characters
**Expected:** "Must be at least 8 characters long." appears under Password.

### Test Case 3: Register with duplicate email
**Test:** Attempt to register with an email already in use
**Expected:** "An account with this email already exists." global error shown.

### Test Case 4: Log in with bad credentials
**Test:** Enter a valid email with wrong password
**Expected:** "Invalid email or password." shown. No redirect.

### Test Case 5: Log in with wrong role selected
**Test:** Enter valid credentials for one role but with the other role's tab selected (run for both: company creds + Driver tab, driver creds + Company tab)
**Expected:** Error "This account is registered as a [company/driver]. Please select '[company/driver]' and try again."

### Test Case 6: Log in with Google (unregistered account)
**Test:** Click "Sign in with Google" using a Google account that has never signed up
**Expected:** "Account not found. Please sign up first." error shown.

---

## SSE/Realtime Syncing

### Test Case 1: Multi-client bid sync
**Test:** Open `/auctionLive/000000000000000000000101` in two browser tabs simultaneously. In a third tab (logged in as a driver), navigate to `/driverAuctions/000000000000000000000101` and place a bid.
**Expected:** Both company tabs update the bid list within 2 seconds without a page refresh.

### Test Case 2: Price tracker sync
**Test:** With two tabs open on `/auctionLive/000000000000000000000101`, accept a bid in one tab.
**Expected:** The price tracker and auction status update in the second tab within 2 seconds.

### Test Case 3: Disconnection banner
**Test:** Open `/auctionLive/000000000000000000000101` then run `docker compose stop backend` in terminal.
**Expected:** A "Connection lost" or disconnected warning banner appears on the auction page within 30 seconds.

### Test Case 4: SSE keep-alive
**Test:** Open `/auctionLive/000000000000000000000102` (near expiry auction) and leave the tab open for 3+ minutes without interaction.
**Expected:** No disconnection banner appears. The countdown timer continues ticking.