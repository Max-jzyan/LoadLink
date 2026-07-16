<h1>
  <img src="frontend/public/favicon.svg" width="36" color="#1c9cf0" valign="middle"/>
  &nbsp; Load Link
</h1>

**By Team #5: The Fantastic Five**

## Meet the Team

Alexandar Lackovic (74213307) <br>
Wendy Tso (34159368) <br>
Max Yan (86293560) <br>
Kyle Jones (82804451) <br>
Eojin Lee (25508730)

## Project Description

Truck driving management system designed to streamline the logistics of cargo transport through auction-based marketplace. Our platform allows companies to post freight requirements that drivers can accept through a bidding system.

## Milestone 1

[Milestone 1 PDF Document](docs/M1_Document.pdf)

## Milestone 2

### Milestone 2 Functionality

#### Non-Trivial Features

| Feature                                                                                                                      | M2 Status         | How to Use / Notes                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Time Decay Reverse Auction System** — price creep engine, SSE realtime bid/price streaming, auto accept, heartbeat service | Fully working     | **Company:** `/auctionLive/<loadId>` — **Driver:** `/driverAuctions/<loadId>`. Heartbeat ticks price up every hour and auto accept settles auction when time < threshold and a qualifying bid exists |
| **Auction Management Controls** — accept bid, cancel auction, extend deadline, edit cap price, reopen cancelled auction      | Fully working     | All controls are also visible on `/auctionLive/<loadId>` for the company that owns the load                                                                                                          |
| **Map System** — Leaflet route visualization between origin and destination                                                  | Partially working | Visible on Driver Auctions detail page and Driver Loads page. Live driver tracking was descoped in the M1 feedback session                                                                           |

#### Standard Features

| Feature                                                                                                                                                                           | M2 Status                   | How to Use / Notes                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Secure Authentication** — Firebase email/password and Google OAuth login, role selection (Company / Driver), protected routes, role-based sidebar                               | Fully working               | Go to `http://localhost:3000` -> Sign Up or Log In (each role sees only its own pages)                               |
| **Load Posting** — company creates a freight listing with origin, destination, commodity, weight, truck type, certifications, pickup/dropoff times; Geoapify address autocomplete | Fully working               | Log in as Company -> Loads -> Post Load (`/loads/post`)                                                              |
| **Company Loads Table** — paginated table of all company loads with status badges, bid counts, auction pricing                                                                    | Fully working               | Log in as Company -> Loads (`/loads`)                                                                                |
| **Company Dashboard** — stats cards (active loads, live auctions, loads in transit, bids today) + loads table                                                                     | Fully working               | Log in as Company -> Dashboard (`/company/dashboard`)                                                                |
| **Driver Auctions Browser** — browse all open loads, text search by origin/destination/commodity, recommended loads section                                                       | Fully working               | Log in as Driver -> Auctions (`/driverAuctions`)                                                                     |
| **Bidding Interface** — driver places a bid or claims load at current price; company sees bids in real time                                                                       | Fully working               | Driver: `/driverAuctions/<loadId>` -> Place Bid or Claim Now                                                         |
| **Driver Loads (My Loads)** — stats cards, assigned load table with status filter, delivery timeline, route map                                                                   | Partially working           | Log in as Driver -> My Loads (`/driverLoads`). Stats and table fully working and timeline shows pickup/dropoff steps |
| **Search, Filter & Pagination** — text search on driver load browser, status filter + pagination on driver loads table                                                            | Partially working           | Search bar on `/driverAuctions` and filter bar + pagination on `/driverLoads`                                        |
| **Profile & Fleet Management** — driver profile, truck CRUD (add, edit, delete truck)                                                                                             | Backend complete, no UI yet | API routes exist at `/api/driver/:id` and `/api/driver/:id/trucks`; profile page not yet built                       |
| **Notification System**                                                                                                                                                           | Not started for M2          | Planned for M3                                                                                                       |

#### Stretch Features

| Feature                                                                                             | M2 Status          | Notes                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PDF Rate Confirmation** — auto-generate contract PDF on auction close using pdf-lib, upload to S3 | Not implemented    | `pdf-lib` is a dependency and the constant `RATE_CONFIRMATION_URL_BASE` is defined, but no generation or upload code exists yet; accept-bid returns a placeholder URL string |
| **AWS S3 Document Storage** — driver licence/insurance uploads, rate confirmation PDFs              | Not implemented    | AWS keys are in `.env` but no upload code exists in the backend at M2                                                                                                        |
| **Blocklist & Preferences** — block companies/drivers from appearing in feeds                       | Not implemented    | `Blocklist` Mongoose model created; no endpoints or UI at M2                                                                                                                 |
| **Live Driver Location Tracking**                                                                   | Removed from scope | Descoped in M1 peer-feedback session; replaced with static route visualization                                                                                               |
| **AI Route Suggestions** (fuel stops, rest areas)                                                   | Not started        | Planned to potentially be added after M2                                                                                                                                     |

### Standard Features — M1 Cross-Reference

Here are some features in our M1 design doc's standard features and their M2 state.

| M1 Standard Feature                                                    | M2 Implementation                                                                                                                                         |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secure user authentication for different roles (companies and drivers) | Firebase Auth with email/password and Google OAuth. Role selected at signup. Role-specific protected routes and sidebar navigation enforced               |
| Load posting (CRUD for freight)                                        | Full create via `/loads/post`. Read via `/loads` table and `/loads/:loadId` detail. Update via `PATCH /api/loads/:loadId`. Delete via cancel auction flow |
| Search, filter, and pagination of loads                                | Text search (origin/destination/commodity) on Driver Auctions page. Status filter + paginator on Driver Loads table                                       |
| Bidding interface                                                      | Driver can place a bid (below current price) or claim load at current price. Company sees all bids ranked best-first via SSE                              |
| Dashboard specific to drivers                                          | Stats cards (loads, in-transit, active bids, completed) + load table + Leaflet map on `/driverLoads`                                                      |
| Revenue dashboard for companies                                        | Stats cards (active loads, live auctions, in-transit, bids today) + loads table on `/company/dashboard`                                                   |

### Test Plan

[Milestone 2 Test Plan](docs/TestPlan%20M2.md)

### Things We Still Need To Implement

- We don't have automated test suites exist yet (`npm test` runs 0 suites in both frontend and backend - TA said just having a test plan is sufficient for M2)
- `PLACEHOLDER_DRIVER_ID` in `DriverAuctions.tsx` affects only the recommended loads and active bids banner on the browse page — bid placement and claim both use the real logged-in driver ID
- Profile/Fleet management UI not yet built (backend API complete)
- Notification system not started
- PDF rate confirmation and S3 document storage not yet implemented (placeholder URL returned on bid accept)

## Milestone 3

### Milestone 3 Functionality

> All features below are on the `Milestone3` branch (`origin/Milestone3`, HEAD `228d574`).
> The `feat/ai-insights` feature branch (OpenRouter AI route suggestions) is **not yet merged** into Milestone3 — see AI Route Suggestions in Stretch Features below.

#### Non-Trivial Features

| Feature                                                                                                                                                                 | M3 Status                    | How to Use / Notes                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Time Decay Reverse Auction System** — price creep engine, SSE real-time bid/price streaming, auto-accept, heartbeat service                                           | Fully working             | **Company:** `/auctionLive/<loadId>` — **Driver:** `/driverAuctions/<loadId>`. `heartbeatService` ticks `currentPrice` up every `HEARTBEAT_INTERVAL_MS` and auto-accepts when within `autoAcceptTriggerHours` of deadline or when price meets the lowest submitted bid / cap                                                                                                          |
| **Auction Management Controls** — accept bid, cancel, extend deadline, edit cap price, reopen cancelled auction                                                         | Fully working             | `AuctionControls`, `CancelAuctionDialog`, `ReopenAuctionDialog`, `EditCapPriceDialog`, `ExtendDeadlineDialog` all on `/auctionLive/<loadId>` for the owning company                                                                                                                                                                                                                   |
| **Custom Algorithm Load Recommendation & Eligibility Engine** — multi-factor scoring (0–100), critical/minor eligibility flags, high-score highlights, detailed breakdown panel | Fully working (NEW in M3) | Log in as Driver → Auctions (`/driverAuctions`). Each load card shows an `EligibilityBadge` with score. Click a card to see the full `DetailedEligibilityPanel`. Scoring factors: schedule fit, certification match, truck-type match, rate-per-mile vs driver prefs, route value. Recommendations ranked best-first. Backend: `driverService.getScoredLoads` + `getRecommendedLoads` |

#### Standard Features

| Feature                                                                                                                                                                                                                                 | M3 Status                              | How to Use / Notes                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Secure Authentication** — Firebase email/password + Google OAuth, role selection (Company / Driver / Admin), protected routes, role-based sidebar                                                                                     | Fully working                       | `http://localhost:3000` → Sign Up / Log In. `RoleRoute` auth guard + `requireAuth` / `authorize` middleware enforces role-based access. Firebase persistence upgraded to full-browser (local) persistence          |
| **Load Posting (CRUD)** — create, read, update freight listings; Geoapify address autocomplete                                                                                                                                          | Fully working                       | Log in as Company → Loads → Post Load (`/loads/post`). View detail at `/loads/:loadId`. Edit at `/loads/:loadId/edit`                                                                                              |
| **Company Loads Table** — paginated table with status badges, bid counts, auction pricing                                                                                                                                               | Fully working                       | Log in as Company → Loads (`/loads`)                                                                                                                                                                               |
| **Company Dashboard + Spending Analytics** — stats cards (active loads, live auctions, in-transit, bids today), loads table, spend-over-time chart, spend-by-route chart, spend summary cards                                           | Fully working (analytics NEW in M3) | Log in as Company → Dashboard (`/company/dashboard`). `SpendTimeChart`, `SpendByRouteChart`, `CompanySpendCards` show historical freight spend                                                                     |
| **Company Auctions Overview** — searchable list of all company auctions across all statuses with live/closed/cancelled badges and direct links to auction detail                                                                        | Fully working (NEW in M3)           | Log in as Company → Auctions (`/company/auctions`)                                                                                                                                                                 |
| **Driver Auctions Browser** — browse all open loads, text search, recommended loads section with scores, eligibility badges                                                                                                             | Fully working                       | Log in as Driver → Auctions (`/driverAuctions`). Recommendations engine + `EligibilityBadge` score per card                                                                                                        |
| **Bidding Interface** — driver places a bid or claims load at current price; company sees bids in real time via SSE                                                                                                                     | Fully working                       | Driver: `/driverAuctions/<loadId>` → Place Bid (`PlaceBidDialog`) or Claim Now (`ClaimLoadDialog`). SSE streams bids/price to company live                                                                         |
| **Driver Revenue Center (My Loads)** — stats cards, assigned load table with full filter bar (status / truck / date / price / origin / destination), delivery timeline, route map, truck assignment, revenue/expense charts             | Fully working (enhanced in M3)      | Log in as Driver → My Loads (`/driverLoads`). `DeliveryTimeline`, `DriverMap` (Leaflet), `RevenueTimeChart`, `DistanceProfitScatterChart`, `ExpenseBreakdownChart`, `ProfitByRouteChart` all on this page          |
| **Driver Revenue Center Dashboard** — revenue stats, animated numbers, expense tracking, global expense drawer                                                                                                                          | Fully working (NEW in M3)           | Log in as Driver → Revenue Center (`/dashboard`). Shows `RevenueStatsRow`, `RevenueSummaryCards`, charts, and `GlobalExpenseDrawer`                                                                                |
| **Profile & Fleet Management** — driver profile, truck CRUD (add/edit/delete, set primary), trailer CRUD (add/edit/delete, set primary), certifications, carrier credentials (MC/DOT), notification preferences, profile picture upload | Fully working (UI NEW in M3)        | Log in as Driver → Profile (`/driver`). `TruckDrawer`, `TrailerDrawer`, `DriverInfoDrawer`, `NotificationPreferencesCard`. Backend API at `/api/driver/:id` and `/api/driver/:id/trucks` + `/api/trailers` |
| **Notification System** — in-app notification bell, toast notifications, bid-accepted / rate-confirmation-ready / load-status events                                                                                                    | Fully working (NEW in M3)           | `NotificationBell` in the top navigation. `ToastManager` fires on key events. Backend: `notificationService` fires events on bid-accept and auction close                                                          |
| **Blocklist & Preferences** — block companies/drivers from appearing in feeds, server-side enforcement                                                                                                                                  | Fully working (NEW in M3)           | Log in as Driver or Company → Settings → Blocklist (`/blocklist`). `blocklistService` enforces blocking in all feed and recommendation queries                                                                     |
| **Driver Public Profile + Reviews/Ratings** — public-facing driver profile with star ratings, review submission                                                                                                                         | Fully working (NEW in M3)           | Navigate to `/driver/:driverId` (linked via `DriverNameLink` components throughout app). Submit a review via `ReviewForm`                                                                                  |
| **Report System** — report fraud, report inaccurate listings, report hub                                                                                                                                                                | Fully working (NEW in M3)           | `/report` → `ReportHub`. Report fraud at `/report/fraud`, inaccurate listing at `/report/inaccurate`. Backend: `reportController` + `reportService`                                                                |
| **Map System** — Leaflet route visualization between origin and destination                                                                                                                                                             | Fully working                       | Visible on Driver Loads (`/driverLoads`) and Driver Auction detail (`/driverAuctions/:loadId`). Also available at standalone `/map`. Static route visualization (Leaflet + Geoapify tiles)                         |
| **Search, Filter & Pagination** — text search on load browser, comprehensive filter bar on driver loads                                                                                                                                 | Fully working                       | Search bar + eligibility filter on `/driverAuctions`; `DriverLoadFilterBar` (status, truck, date, price, origin, destination) + paginated `DataTable` on `/driverLoads`                                            |
| **Role-Based Auth Guard** — `RoleRoute` component prevents unauthorized access, Firebase token enforced on every API call                                                                                                               | Fully working (NEW in M3)           | Attempting to access a restricted route redirects to the appropriate role home. Backend `requireAuth` + `authorize` middleware validates Firebase JWT on all protected endpoints                                   |

#### Stretch Features

| Feature                                                                                                                     | M3 Status                     | Notes                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PDF Rate Confirmation** — auto-generate contract PDF on auction close using pdf-lib, upload to S3, presigned download URL | Fully working (NEW in M3)  | `pdfService.generateRateConfirmationPdf` (pdf-lib) runs on bid accept and claim in `auctionService`; uploads to S3 and stores presigned URL on the `Bid` model (`rateConfirmationUrl` / `rateConfirmationKey`). Company and admin can manually regenerate via admin portal |
| **AWS S3 Document Storage** — certification/insurance uploads, business docs, profile pictures, rate-confirmation PDFs      | Fully working (NEW in M3)  | `uploadService` + `s3Client` + `uploadController` issue presigned PUT URLs. Used for certification/business docs (`/api/upload`), profile pictures (`AvatarUploadField`), and rate-confirmation PDFs                                                                       |
| **Admin Portal** — document verification/review, rate-confirmation listing, user management                                 | Fully working (NEW in M3)  | Log in as Admin → Dashboard (`/admin/dashboard`), Documents (`/admin/documents`), Users (`/admin/users`), Rate Confirmations (`/admin/rate-confirmations`). Seeded admin credentials in Canvas `.env` file                                                                 |
| **AI Route Suggestions** — OpenRouter-powered route analysis with fuel stop, rest area, and route insights                  | Not merged into Milestone3 | Implemented on local `feat/ai-insights` branch (`8881d62`) — `aiInsightsService`, `openrouterService`, `AiInsightsPanel`. Needs to be merged before final submission                                                                                                       |
| **Live Driver Location Tracking**                                                                                           | Removed from scope            | Descoped in M1 peer-feedback session; replaced with static route visualization                                                                                                                                                                                             |

---

### Standard Features — M1 Cross-Reference

| M1 Standard Feature                                                    | M3 Implementation                                                                                                                                                                                   |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secure user authentication for different roles (companies and drivers) | Firebase Auth (email/password + Google OAuth), role selected at signup, `RoleRoute` auth guard + `requireAuth`/`authorize` middleware, role-specific sidebar enforced. Admin role added in M3       |
| Load posting (CRUD for freight)                                        | Create via `/loads/post`; read via `/loads` table and `/loads/:loadId` detail; update via `PATCH /api/loads/:loadId` (`LoadEdit`); delete/cancel via cancel-auction flow                            |
| Search, filter, and pagination of loads                                | Text search (origin/destination/commodity) + eligibility filter on Driver Auctions; full `DriverLoadFilterBar` (status/truck/date/price/origin/destination) + paginated `DataTable` on Driver Loads |
| Bidding interface                                                      | Driver places a bid (below current price) or claims at current price (`PlaceBidDialog`/`ClaimLoadDialog`); company sees all bids ranked best-first via SSE (`AuctionLive`)                          |
| Dashboard specific to drivers                                          | Revenue Center (`/dashboard`) with stats, charts, expense tracking + My Loads (`/driverLoads`) with full filter bar, load table, Leaflet `DriverMap`, and `DeliveryTimeline`                        |
| Revenue dashboard for companies                                        | Stats cards + loads table + spend analytics charts on `/company/dashboard`                                                                                                                          |

---

### Test Plan

[Milestone 3 Test Plan](docs/TestPlan%20M3.md)

### Bug Tracking

Known bugs are tracked on [GitHub Issues](https://github.students.cs.ubc.ca/CPSC455-2026S/team05/issues)

### Backend Test Suite

`cd backend && npm test` runs **22 Jest test files** covering:

- **Controllers:** auction, blocklist, company, driver, load, report, review, truck, upload, user
- **Services:** auction, blocklist, driver, heartbeat, load, report, review, truck, upload
- **Middleware:** authorize, errorHandler, requireAuth

Frontend automated tests are not yet implemented.

---

### Tech Stack

| Layer          | Tech                                   | Version   |
| -------------- | -------------------------------------- | --------- |
| Frontend       | React                                  | 19        |
| Build Tool     | Vite                                   | 8         |
| Language       | Typescript                             | 6         |
| Style          | TailwindCSS                            | 4         |
| Components     | shadcn (radix, nova, lucide and geist) | 4         |
| Maps           | Leaflet/React Leaflet                  | 1/5       |
| Testing        | Vitest and RTL                         | 4.1/16.3  |
| Formatting     | Prettier and ESLint                    | 10.3/10.1 |
| Backend        | Node + Express                         | 22/5.2    |
| Database       | MongoDB and Mongoose                   | 9.7       |
| Auth           | Firebase Admin                         | 14        |
| File Storage   | AWS S3                                 | 3         |
| PDF Generation | pdf-lib                                | 1.17      |

### Frontend Setup

```bash
cd frontend
npm install
npm run dev # dev serever
npm run build #prod build
npm run format # auto format all files
npm run format:check # check formatting
npm test # run unit tests

# To add components to the frontend
# https://ui.shadcn.com/docs/components
cd frontend
npx shadcn@latest add <componentName>

```

### Backend Setup

```bash
cd backend
npm install
npm run dev # dev serever with auto reload
npm run build #prod build
npm run start # run compiled build
npm run test # run Jest tests
npm run format # auto format all files
npm run format:check # check formatting
```

---

## Seeded Accounts

**Type:** Driver
**Email:** testUser1@example.com
**Password:** 12345678

**Type:** Driver
**Email:** testUser2@example.com
**Password:** 12345678

**Type:** Driver
**Email:** testUser3@example.com
**Password:** 12345678

**Type:** Driver
**Email:** testUser4@example.com
**Password:** 12345678

**Type:** Driver
**Email:** testUser5@example.com
**Password:** 12345678

**Type:** Company
**Email:** testCompany1@example.com
**Password:** 12345678

**Type:** Company
**Email:** testCompany2@example.com
**Password:** 12345678

**Type:** Admin
**Email:** admin@example.com
**Password:** 12345678

---

## TA Docker Instructions

### Note: You can create your own accounts and everything, however, we have pre seeded some to be able to follow our test plan.

1. Clone `Milestone3` branch
2. Put `.env` into project root AND `./backend/.env`
3. `docker compose up --build`
4. Open `http://localhost:3000` (healthcheck is on `http://localhost:5001/api/health`)
5. To stop use `docker compose down` (to also delete db volume use `docker compose down -v`)

### Dev Docker Instructions

This will start all the services with hot reload so you dont neeed to rebuild when you save files

1. Run `docker compose -f docker-compose.dev.yml up -d` (you can run without -d if you want to see everything in your terminal but I dont like that)

- Frontend is on `http://localhost:5173`
- Backend is on `http://localhost:5001`
- MongoDB is on `localhost:27018`
