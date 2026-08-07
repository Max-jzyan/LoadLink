import { RoutePath } from '@/config/routes'
import type { UserRole } from '@/types/enums'

/**
 * Role-tailored walkthrough scripts.
 *
 * Goal: somebody with zero freight-industry experience can finish the
 * walkthrough for their role and operate the product unaided. Every step
 * explains both *where* something is and *why* it matters, and industry jargon
 * is defined the first time it appears.
 *
 * - `target` is the value of a `data-tour="…"` attribute rendered in the app.
 *   Missing targets degrade gracefully — Shepherd centres the step instead.
 * - `path` is navigated to (React Router) before the step is shown.
 */

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto'

export interface TourStepDef {
  id: string
  title: string
  /** Body copy — plain HTML. */
  text: string
  /** `data-tour` attribute value to attach to. Omit for a centred step. */
  target?: string
  /** Popper placement relative to the target. Defaults to 'bottom'. */
  on?: TourPlacement
  /** Route navigated to before the step is shown. */
  path?: string
}

/** Closing step — a role-specific "do these things first" checklist. */
function finishStep(checklist: string[]): TourStepDef {
  return {
    id: 'finish',
    title: 'Congratulations! You are ready to start using LoadLink',
    text: `
      <p>Your first few minutes, in order:</p>
      <ul style="margin:0;padding-left:1.1rem;list-style:disc;">
        ${checklist.map((item) => `<li style="margin-bottom:0.2rem;">${item}</li>`).join('')}
      </ul>
      <p>Replay this walkthrough any time from your <strong>avatar → Walkthrough</strong>. Nothing is saved until you press save, so click around freely.</p>
    `,
    target: 'nav-user',
    on: 'right',
  }
}

/* ── Driver / carrier ─────────────────────────────────────────────────────── */

const DRIVER_STEPS: TourStepDef[] = [
  {
    id: 'welcome',
    title: 'Welcome to LoadLink',
    text: `
      <p>You are signed in as a <strong>driver (carrier)</strong>. LoadLink is a freight marketplace: companies post shipments they need moved, you agree a price, haul it, and get paid.</p>
      <p>By the end of this walkthrough you will know how to find work, win it, run it, and see whether it actually made money.</p>
    `,
    path: RoutePath.Dashboard,
  },
  {
    id: 'glossary',
    title: 'Five words you will see everywhere',
    text: `
      <ul style="margin:0;padding-left:1.1rem;list-style:disc;">
        <li><strong>Load</strong> — one shipment: pick up here, deliver there, by these times.</li>
        <li><strong>Auction</strong> — how the price for a load gets agreed between you and the company.</li>
        <li><strong>Deadhead</strong> — the empty miles you drive to reach a pickup. Deadhead costs money and earns nothing, so shorter is better.</li>
        <li><strong>Rate Confirmation (RC)</strong> — the contract PDF, generated automatically the moment a price is agreed.</li>
        <li><strong>Bill of Lading (BOL)</strong> — the signed delivery receipt you upload at the end as proof the freight arrived.</li>
      </ul>
    `,
  },
  {
    id: 'sidebar',
    title: 'Your navigation sidebar',
    text: `
      <p>Everything in the app is reachable from here. The icon at the top collapses or expands the bar — collapsed shows icons only, and hovering an icon reveals its name.</p>
      <p>Your sections: <strong>Revenue Center</strong>, <strong>My Loads</strong>, <strong>Auctions</strong>, <strong>Messages</strong> and <strong>Blocklist</strong>. We will visit each one.</p>
    `,
    target: 'sidebar',
    on: 'right',
  },
  {
    id: 'nav-auctions',
    title: 'Auctions: where you find work',
    text: `<p>This is the load board: every shipment currently open for bidding, from every company on the platform. Start here whenever you need your next job.</p>`,
    target: 'nav-/driverAuctions',
    on: 'right',
    path: RoutePath.DriverAuctions,
  },
  {
    id: 'auction-filters',
    title: 'Narrowing the board down',
    text: `
      <p>Search by city or commodity, then sort: <strong>Recommended</strong> (best fit for you), rate, distance, or pickup / drop-off time.</p>
      <p>The eligibility filter is the useful one — <em>Eligible</em> hides loads your truck or paperwork cannot legally cover, and <em>Issues</em> shows what you would need to fix to qualify.</p>
    `,
    target: 'page-filters',
    on: 'bottom',
  },
  {
    id: 'load-feed',
    title: 'How to read a load card',
    text: `
      <p>Each card is one load: <strong>origin → destination</strong>, the commodity and weight, the truck type required, the pickup and delivery windows, and the current price.</p>
      <p>The badge and score (0–100) show how well the load matches <em>your</em> profile — your truck, certifications, deadhead limit and minimum rate. Click a card to preview its route on the map; click <strong>View Auction</strong> to open it and bid.</p>
    `,
    target: 'load-feed',
    on: 'right',
  },
  {
    id: 'use-location',
    title: 'Share your location for honest distances',
    text: `
      <p>Turn this on and the board is re-scored from where you actually are: deadhead becomes a real number and the map draws your maximum-deadhead radius (you set that limit in your profile).</p>
      <p>Your exact position is not shown to companies — it is only used to rank loads for you.</p>
    `,
    target: 'use-location',
    on: 'bottom',
  },
  {
    id: 'auction-map',
    title: 'Map, timeline and eligibility detail',
    text: `
      <p>Selecting a load fills this panel: the driving route with distance and estimated hours, a <strong>Delivery Timeline</strong> of checkpoints between pickup and drop-off, and — with AI enabled — suggested fuel stops and rest areas along the way.</p>
      <p>The <strong>Eligibility Details</strong> card spells out every requirement you pass or fail, so a load you cannot take is never a mystery.</p>
    `,
    target: 'auction-map-panel',
    on: 'left',
  },
  {
    id: 'bidding',
    title: 'How pricing actually works (read this one)',
    text: `
      <p>The company posts a <strong>starting price</strong> and a cap. The offer <em>creeps upward</em> automatically over time toward that cap until somebody takes the load, and a countdown shows how long the auction stays open.</p>
      <p>You have two ways to win it:</p>
      <ul style="margin:0.25rem 0 0.5rem 1.1rem;padding:0;list-style:disc;">
        <li><strong>Claim load</strong> — take the current price immediately. Fastest, no waiting.</li>
        <li><strong>Place bid</strong> — ask for the current price or more. The company sees all bids ranked cheapest-first and can accept yours; if your number falls inside their auto-accept tolerance it can be accepted automatically.</li>
      </ul>
      <p>When a price is accepted, the Rate Confirmation PDF is generated and the load is booked to you. Note: winning a load auto-cancels your other open bids, so you cannot double-book yourself.</p>
    `,
  },
  {
    id: 'nav-loads',
    title: 'My Loads: work you already won',
    text: `<p>Everything awarded to you lives here through its whole life: <strong>Booked → In Transit → Completed</strong>, with Cancelled as the escape hatch.</p>`,
    target: 'nav-/driverLoads',
    on: 'right',
    path: RoutePath.DriverLoads,
  },
  {
    id: 'loads-stats',
    title: 'Your at-a-glance counters',
    text: `<p>Total loads, how many are rolling right now, how many bids you still have outstanding, and how many you have completed. If a number looks wrong, the filter bar above is usually why.</p>`,
    target: 'stats-cards',
    on: 'bottom',
  },
  {
    id: 'loads-table',
    title: 'Running a load, day to day',
    text: `
      <p>Click a row to focus it on the map, or hit <strong>Manage</strong> to do the real work:</p>
      <ul style="margin:0.25rem 0 0.5rem 1.1rem;padding:0;list-style:disc;">
        <li><strong>Assign a truck</strong> — which of your trucks is covering it.</li>
        <li><strong>Message the company</strong> — questions, delays, gate codes.</li>
        <li><strong>Move the status</strong> — mark it In Transit when you roll, Completed when it is delivered.</li>
        <li><strong>Track / Ping</strong> — while In Transit, a ping sends a GPS check-in so the company can see progress without calling you.</li>
      </ul>
      <p>After delivery, upload the signed <strong>BOL</strong> here — that is the document that gets you paid.</p>
    `,
    target: 'loads-table',
    on: 'top',
  },
  {
    id: 'loads-map',
    title: 'The route map',
    text: `<p>Every load you are carrying, drawn on one map with status colours. Selecting a row zooms to it; <strong>Reset View</strong> puts everything back.</p>`,
    target: 'loads-map',
    on: 'top',
  },
  {
    id: 'nav-revenue',
    title: 'Revenue Center: did you actually make money?',
    text: `
      <p>A load that pays well can still lose money once fuel, insurance and maintenance are counted. This page does that maths for you.</p>
      <p>The <strong>Completed</strong> tab is money earned; <strong>Potential Revenue</strong> projects what your booked and in-transit loads will pay.</p>
    `,
    target: 'nav-/dashboard',
    on: 'right',
    path: RoutePath.Dashboard,
  },
  {
    id: 'revenue-summary',
    title: 'Gross, expenses, net',
    text: `<p><strong>Gross</strong> is what companies paid you. <strong>Expenses</strong> is what running the truck cost. <strong>Net</strong> is what you keep — plus your rate per mile, the number most carriers actually manage their business on.</p>`,
    target: 'revenue-summary',
    on: 'bottom',
  },
  {
    id: 'expense-settings',
    title: 'Set your costs once: do this early',
    text: `
      <p>These profit figures are only as good as the cost assumptions behind them. In here you enter fuel price and MPG, insurance, maintenance, tolls and other per-mile or fixed costs — globally, or per individual truck.</p>
      <p>Five minutes here makes every number on this page trustworthy, and powers the minimum-rate filter on the load board.</p>
    `,
    target: 'expense-settings',
    on: 'bottom',
  },
  {
    id: 'revenue-charts',
    title: 'Trends and patterns',
    text: `<p>Revenue over time, profit by route, expense breakdown and distance versus profit. This is how you spot which <strong>lanes</strong> (repeat origin → destination pairs) are worth chasing and which to leave alone.</p>`,
    target: 'revenue-charts',
    on: 'top',
  },
  {
    id: 'revenue-table',
    title: 'Load-by-load profit and loss',
    text: `<p>One row per load with its own profit and loss. You can override expenses for a single load — handy when one trip had an unusual repair, permit or lumper fee.</p>`,
    target: 'revenue-table',
    on: 'top',
  },
  {
    id: 'nav-messages',
    title: 'Messages',
    text: `<p>Every conversation with a company, grouped by load, so pickup instructions and delay updates stay attached to the job they belong to instead of scattered across texts.</p>`,
    target: 'nav-/messages',
    on: 'right',
    path: RoutePath.Messages,
  },
  {
    id: 'nav-blocklist',
    title: 'Blocklist and feed preferences',
    text: `
      <p>Block a company and their loads disappear from your board — useful after a bad experience.</p>
      <p>You can also hide loads that fall below your minimum rate, so the board only ever shows work worth taking.</p>
    `,
    target: 'nav-/blocklist',
    on: 'right',
    path: RoutePath.BlocklistPreferences,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    text: `<p>Live alerts: a bid accepted, a load awarded, an auction about to close, a new message, or a document about to expire. The dot means unread — click to read and clear.</p>`,
    target: 'notification-bell',
    on: 'right',
  },
  {
    id: 'nav-user',
    title: 'Your account menu',
    text: `<p>Your avatar opens your profile, the <strong>Light / Dark / System</strong> theme switch, log out, and the button that replays this walkthrough. Let us finish inside your profile — it decides which loads you are allowed to take.</p>`,
    target: 'nav-user',
    on: 'right',
  },
  {
    id: 'profile-info',
    title: 'Profile: identity and paperwork',
    text: `
      <p>Your name, contact details, licence, <strong>MC and DOT numbers</strong> (the federal registration numbers identifying a carrier) and your <strong>insurance certificates</strong> live here.</p>
      <p>Uploads are reviewed by a LoadLink admin and marked Verified, and you get a warning banner before anything expires. Unverified or expired paperwork blocks you from loads that require it.</p>
    `,
    target: 'profile-info',
    on: 'right',
    path: RoutePath.DriverProfile,
  },
  {
    id: 'profile-trucks',
    title: 'Profile: your trucks and trailers',
    text: `
      <p>Add each truck with its type (dry van, reefer, flatbed…), length, weight capacity and certifications such as refrigeration or hazmat.</p>
      <p>This is the most important thing to fill in: every eligibility check and recommendation score on the load board is calculated against these specs.</p>
    `,
    target: 'profile-trucks',
    on: 'left',
  },
  {
    id: 'profile-pricing',
    title: 'Profile: pricing preferences',
    text: `<p>Your <strong>minimum rate per mile</strong>, minimum acceptable load value, and <strong>maximum deadhead</strong> — how far you will drive empty for a pickup. LoadLink uses these to flag or hide loads that are not worth your time.</p>`,
    target: 'profile-pricing',
    on: 'left',
  },
  {
    id: 'profile-score-weights',
    title: 'Profile: tune "Recommended"',
    text: `<p>Decide what matters most to you — pay, distance, deadhead, timing — and the Recommended sort on the load board re-ranks around your priorities.</p>`,
    target: 'profile-score-weights',
    on: 'left',
  },
  finishStep([
    'Add your truck(s) with type, length and capacity.',
    'Upload your insurance certificate and licence, then wait for the Verified badge.',
    'Set your minimum rate per mile and maximum deadhead.',
    'Enter fuel and running costs in Revenue Center → Expense Settings.',
    'Open Auctions, sort by Recommended, and claim or bid on your first load.',
  ]),
]

/* ── Company / shipper ────────────────────────────────────────────────────── */

const COMPANY_STEPS: TourStepDef[] = [
  {
    id: 'welcome',
    title: 'Welcome to LoadLink',
    text: `
      <p>You are signed in as a <strong>company (shipper)</strong>. You post freight that needs moving, drivers compete for it, and you choose the price you are happy with.</p>
      <p>By the end of this walkthroughyou will be able to post a load, run its auction, award it, and track it to delivery.</p>
    `,
    path: RoutePath.CompanyDashboard,
  },
  {
    id: 'glossary',
    title: 'Five words you will see everywhere',
    text: `
      <ul style="margin:0;padding-left:1.1rem;list-style:disc;">
        <li><strong>Load</strong> — one shipment you post: pickup, delivery, times, weight, truck type.</li>
        <li><strong>Auction</strong> — your offer for that load. It opens at your start price and rises automatically toward your cap until a driver takes it.</li>
        <li><strong>Bid</strong> — a driver's asking price. You see bids ranked cheapest-first.</li>
        <li><strong>Rate Confirmation (RC)</strong> — the contract PDF generated automatically when you award the load.</li>
        <li><strong>Bill of Lading (BOL)</strong> — the signed delivery receipt the driver uploads as proof of delivery.</li>
      </ul>
    `,
  },
  {
    id: 'sidebar',
    title: 'Your navigation sidebar',
    text: `<p>Everything lives here, and the top icon collapses or expands the bar. Your sections: <strong>Dashboard</strong>, <strong>Auctions</strong>, <strong>Messages</strong> and <strong>Blocklist</strong>. We will walk through each.</p>`,
    target: 'sidebar',
    on: 'right',
  },
  {
    id: 'nav-dashboard',
    title: 'Dashboard: your control room',
    text: `<p>Everything you have posted, in one place: what is live, what is moving, what is delivered, and what it all cost.</p>`,
    target: 'nav-/company/dashboard',
    on: 'right',
    path: RoutePath.CompanyDashboard,
  },
  {
    id: 'stats-cards',
    title: 'Your four numbers',
    text: `<p><strong>Active Loads</strong> are shipments in play, <strong>Live Auctions</strong> are still taking bids, <strong>In Transit</strong> are on the road right now, and <strong>Total Bids Today</strong> tells you whether drivers find your pricing attractive. Few bids usually means the start price is too low or the pickup window too tight.</p>`,
    target: 'stats-cards',
    on: 'bottom',
  },
  {
    id: 'loads-table',
    title: 'The loads table',
    text: `
      <p>One row per load with its status: <strong>Auction Live</strong> (taking bids) → <strong>Booked</strong> (driver awarded) → <strong>In Transit</strong> → <strong>Completed</strong>.</p>
      <p>Click a row to focus it on the map, or open <strong>Details</strong> for the full load, the awarded driver, the Rate Confirmation and the uploaded BOL. Loads not yet awarded can still be edited or cancelled.</p>
    `,
    target: 'loads-table',
    on: 'top',
  },
  {
    id: 'loads-map',
    title: 'Where your freight is',
    text: `<p>All of your routes on one map, colour-coded by status and updated when drivers send GPS check-ins — so you can answer "where is my shipment?" without phoning anyone.</p>`,
    target: 'loads-map',
    on: 'top',
  },
  {
    id: 'page-tabs',
    title: 'Spending Analytics tab',
    text: `<p>Switch to <strong>Spending Analytics</strong> for what you have actually spent on freight: weekly totals (committed versus completed) and your most expensive <strong>lanes</strong> — the repeat origin → destination pairs where better pricing saves the most money.</p>`,
    target: 'page-tabs',
    on: 'bottom',
  },
  {
    id: 'post-load-btn',
    title: 'Posting a load',
    text: `<p>This is the button that starts everything. Let us walk through the form, section by section.</p>`,
    target: 'post-load-btn',
    on: 'bottom',
  },
  {
    id: 'load-form-details',
    title: 'Step 1: truck and load details',
    text: `
      <p>What is moving and what it needs: <strong>truck type</strong> (dry van for general freight, reefer for temperature-controlled, flatbed for oversized or open cargo), truck length, weight in pounds, and the commodity.</p>
      <p>Certifications you require — hazmat, food-grade, refrigeration — are set here too, and drivers who lack them are filtered out automatically.</p>
    `,
    target: 'load-form-details',
    on: 'right',
    path: RoutePath.PostLoad,
  },
  {
    id: 'load-form-route',
    title: 'Step 2: route and schedule',
    text: `
      <p>Enter pickup and delivery addresses (they autocomplete, and frequently used ones can be saved as favourites), then your pickup and delivery windows.</p>
      <p>Distance and driving time are calculated for you and shown to drivers. Realistic windows attract more bids; impossibly tight ones get ignored.</p>
    `,
    target: 'load-form-route',
    on: 'right',
  },
  {
    id: 'load-form-pricing',
    title: 'Step 3: pricing and auction settings',
    text: `
      <p>This is the clever part. Set a <strong>start price</strong> (your opening offer), a <strong>cap price</strong> (the most you will ever pay), and how much the offer <strong>creeps up</strong> each interval. LoadLink then raises the offer for you until a driver accepts or the cap is reached.</p>
      <p><strong>Auto-accept</strong> closes deals while you sleep: any bid inside your chosen tolerance, once the trigger window is reached, is accepted automatically. Start low, cap sensibly, and let the auction find the market price.</p>
    `,
    target: 'load-form-pricing',
    on: 'left',
  },
  {
    id: 'load-form-summary',
    title: 'Step 4: review and post',
    text: `<p>The summary mirrors exactly what drivers will see. Press <strong>Post</strong> and the load goes live immediately: the auction opens and matching drivers are notified.</p>`,
    target: 'load-form-summary',
    on: 'left',
  },
  {
    id: 'nav-auctions',
    title: 'Auctions: managing what you posted',
    text: `<p>Every auction you have run, live or finished, lives here.</p>`,
    target: 'nav-/company/auctions',
    on: 'right',
    path: RoutePath.CompanyAuctions,
  },
  {
    id: 'auction-list',
    title: 'Reading the auction list',
    text: `<p>Each row shows the route, a <strong>Live / Closed / Cancelled</strong> badge, the current price against your cap, and how many bids arrived. <strong>View Live</strong> opens the real-time auction room; <strong>Details</strong> opens the load itself.</p>`,
    target: 'auction-list',
    on: 'top',
  },
  {
    id: 'auction-live',
    title: 'Inside a live auction',
    text: `
      <p>The auction room updates in real time: a countdown to close, a price tracker showing the creep, and the bid table with each driver's rating. Badges flag the <strong>Best</strong> bid and any bid <strong>within auto-accept</strong>.</p>
      <p>From here you can <strong>accept a bid</strong>, <strong>raise the cap</strong>, <strong>extend the deadline</strong> if nobody has bitten, or cancel and later reopen the auction. Accepting generates the Rate Confirmation and books that driver instantly.</p>
    `,
  },
  {
    id: 'nav-messages',
    title: 'Messages',
    text: `<p>Conversations with drivers, grouped by load — gate codes, delays, appointment changes — all attached to the shipment they concern.</p>`,
    target: 'nav-/messages',
    on: 'right',
    path: RoutePath.Messages,
  },
  {
    id: 'nav-blocklist',
    title: 'Blocklist',
    text: `<p>Block a driver and they can no longer bid on your loads. Use it sparingly — a smaller pool of drivers means fewer bids and higher prices.</p>`,
    target: 'nav-/blocklist',
    on: 'right',
    path: RoutePath.BlocklistPreferences,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    text: `<p>New bids, auto-accepted loads, status changes, check-ins, delivery confirmations and messages all arrive here in real time.</p>`,
    target: 'notification-bell',
    on: 'right',
  },
  {
    id: 'nav-user',
    title: 'Your account menu',
    text: `<p>Your avatar opens your company profile, the theme switch, log out, and the button that replays this walkthrough. One last stop: your profile.</p>`,
    target: 'nav-user',
    on: 'right',
  },
  {
    id: 'profile-info',
    title: 'Company profile',
    text: `<p>Your company name, contact details and registration numbers (<strong>MC and DOT</strong>), plus your public rating. Drivers read this page before bidding — a complete profile with good reviews attracts cheaper, better bids.</p>`,
    target: 'profile-info',
    on: 'right',
    path: RoutePath.CompanyProfile,
  },
  {
    id: 'profile-documents',
    title: 'Business documents',
    text: `<p>Upload the paperwork proving you are a legitimate shipper — registration, insurance, operating authority. A LoadLink admin verifies these, and verified companies attract noticeably more drivers.</p>`,
    target: 'profile-documents',
    on: 'left',
  },
  finishStep([
    'Complete your company profile and upload your business documents.',
    'Post your first load — truck type, route, windows, then pricing.',
    'Set a start price, a cap, and a creep amount so the auction prices itself.',
    'Watch the auction and accept a bid (or let auto-accept do it).',
    'Track the load on the dashboard map and download the BOL after delivery.',
  ]),
]

/* ── Admin / platform operator ────────────────────────────────────────────── */

const ADMIN_STEPS: TourStepDef[] = [
  {
    id: 'welcome',
    title: 'Welcome, admin',
    text: `
      <p>You are a <strong>platform operator</strong>. You do not post freight and you do not haul it — your job is keeping the marketplace trustworthy: verifying paperwork, watching platform health, handling reports and managing accounts.</p>
      <p>This walkthrough covers every admin screen and the decision you are expected to make on each one.</p>
    `,
    path: RoutePath.AdminDashboard,
  },
  {
    id: 'glossary',
    title: 'Who is who, and the paperwork',
    text: `
      <ul style="margin:0;padding-left:1.1rem;list-style:disc;">
        <li><strong>Company (shipper)</strong> — posts loads that need moving.</li>
        <li><strong>Driver (carrier)</strong> — bids on loads and hauls them.</li>
        <li><strong>Load</strong> — one shipment. <strong>Auction</strong> — how its price is agreed.</li>
        <li><strong>MC / DOT numbers</strong> — federal registration numbers identifying a carrier. Fake or mismatched numbers are the classic fraud signal.</li>
        <li><strong>Insurance certificate</strong> — proof a carrier is covered. Lapsed cover is the biggest liability on a freight platform.</li>
        <li><strong>Rate Confirmation (RC)</strong> — the price contract. <strong>Bill of Lading (BOL)</strong> — signed proof of delivery. Both are your evidence in a dispute.</li>
      </ul>
    `,
  },
  {
    id: 'sidebar',
    title: 'The admin sidebar',
    text: `<p>Six screens, used in roughly this order each day: <strong>Dashboard</strong> → <strong>Document Review</strong> → <strong>Reports</strong> → <strong>Users</strong>, with <strong>Rate Confirmations</strong> and <strong>Bills of Lading</strong> as archives you search when something is disputed.</p>`,
    target: 'sidebar',
    on: 'right',
  },
  {
    id: 'admin-kpis',
    title: 'Platform vitals',
    text: `<p>Revenue moving through the platform, how many drivers and companies are registered, loads and bids created, and — the one that is a to-do list rather than a statistic — <strong>Docs to Review</strong>. If that number climbs, drivers are waiting on you.</p>`,
    target: 'admin-kpis',
    on: 'bottom',
  },
  {
    id: 'admin-analytics',
    title: 'Trends over time',
    text: `<p>Sign-ups, loads posted and bidding activity charted over time. Use it as a health check: bids falling while loads rise usually means pricing or driver supply is out of balance.</p>`,
    target: 'admin-analytics',
    on: 'top',
  },
  {
    id: 'admin-insights',
    title: 'Top companies, drivers and lanes',
    text: `<p>Your most valuable participants, and your busiest <strong>lanes</strong> (repeat origin → destination pairs). Useful for spotting both your best customers and any single account the platform leans on too heavily.</p>`,
    target: 'admin-insights',
    on: 'top',
  },
  {
    id: 'admin-activity',
    title: 'Recent activity and quick actions',
    text: `<p>A live feed of what is happening across the platform, next to shortcuts into <strong>Document Review</strong> and <strong>User Management</strong> — where you will spend most of your time.</p>`,
    target: 'admin-activity',
    on: 'top',
  },
  {
    id: 'admin-docs-preview',
    title: 'Latest contracts and delivery receipts',
    text: `<p>The most recent Rate Confirmations and Bills of Lading with one-click PDF access. When someone disputes a price or a delivery, this is the fastest route to the evidence.</p>`,
    target: 'admin-docs-preview',
    on: 'top',
  },
  {
    id: 'nav-documents',
    title: 'Document Review: your main queue',
    text: `<p>The screen that matters most. Drivers upload insurance certificates and certification documents; nothing is trusted until you approve it.</p>`,
    target: 'nav-/admin/documents',
    on: 'right',
    path: RoutePath.AdminDocuments,
  },
  {
    id: 'admin-doc-filters',
    title: 'Finding a specific carrier',
    text: `<p>Search by name, email, MC number or DOT number. The badge on the right shows how many drivers match, so you always know how big the queue really is.</p>`,
    target: 'admin-doc-filters',
    on: 'bottom',
  },
  {
    id: 'admin-doc-expiry-tabs',
    title: 'Expiring Soon and Expired',
    text: `<p>These two tabs are your risk list. <strong>Expiring Soon</strong> is anything lapsing within 30 days — nudge those drivers before it becomes a problem. <strong>Expired</strong> means cover is already gone, and that carrier should not be hauling freight until they re-upload.</p>`,
    target: 'admin-doc-expiry-tabs',
    on: 'bottom',
  },
  {
    id: 'admin-doc-list',
    title: 'Approving and rejecting',
    text: `
      <p>Expand a driver to see each document. <strong>View</strong> opens the file through a short-lived secure link (it expires, so do not share the URL).</p>
      <p>Check three things: the document is legible, the insurer and policy number match the driver's stated details, and the expiry date is in the future. Then <strong>Approve</strong> — which marks them verified and unlocks matching loads — or <strong>Reject</strong> with a reason, which notifies the driver so they know exactly what to re-upload. Always give a reason; a bare rejection just creates support work.</p>
    `,
    target: 'admin-doc-list',
    on: 'top',
  },
  {
    id: 'nav-reports',
    title: 'Reports: fraud and bad data',
    text: `<p>Drivers and companies report each other here, in two flavours: <strong>fraud</strong> (someone acting in bad faith) and <strong>inaccurate details</strong> (a load whose weight, address or timing did not match reality).</p>`,
    target: 'nav-/admin/reports',
    on: 'right',
    path: RoutePath.AdminReports,
  },
  {
    id: 'admin-reports-filters',
    title: 'Triaging the queue',
    text: `<p>Filter by status and work newest-first. Aim to leave nothing in <em>Pending</em> at the end of a shift — an unanswered fraud report is how a marketplace loses trust.</p>`,
    target: 'page-filters',
    on: 'bottom',
  },
  {
    id: 'admin-reports-table',
    title: 'Resolving a report',
    text: `
      <p>Click any report to open its drawer: who reported it, who it targets (both are links to their profiles), the category, the full description and when it arrived.</p>
      <p>Then choose an outcome — <strong>Mark Resolved</strong> when you have acted, <strong>Dismiss</strong> when the claim does not hold up, or <strong>Reopen</strong> to put it back under review. For serious cases, resolve the report and then ban the account from the Users screen.</p>
    `,
    target: 'page-content',
    on: 'top',
  },
  {
    id: 'nav-users',
    title: 'Users: every account on the platform',
    text: `<p>Drivers, companies and fellow admins, newest registrations first.</p>`,
    target: 'nav-/admin/users',
    on: 'right',
    path: RoutePath.AdminUsers,
  },
  {
    id: 'admin-user-filters',
    title: 'Search and filters',
    text: `<p>Search by name or email, filter by role (driver / company / admin) and by status (active or banned). "Banned only" is the quickest way to review past enforcement decisions.</p>`,
    target: 'admin-user-filters',
    on: 'bottom',
  },
  {
    id: 'admin-users-table',
    title: 'Acting on an account',
    text: `
      <p>Click a row for the full record: contact details, role, join date, last active, and any ban history with its reason.</p>
      <p><strong>Ban</strong> locks the account out but keeps all their history and documents — reversible, and the right choice almost every time. <strong>Delete</strong> is permanent. Note you cannot ban yourself or another admin; that guard is deliberate.</p>
    `,
    target: 'admin-users-table',
    on: 'top',
  },
  {
    id: 'nav-rate-confirmations',
    title: 'Rate Confirmations: archive',
    text: `<p>Every price contract the platform has generated, searchable by route, commodity or driver. When a company and a driver disagree about the agreed rate, the RC PDF settles it.</p>`,
    target: 'nav-/admin/rate-confirmations',
    on: 'right',
    path: RoutePath.AdminRateConfirmations,
  },
  {
    id: 'nav-bill-of-lading',
    title: 'Bills of Lading archive',
    text: `<p>The signed delivery receipts. A BOL is the proof freight was collected and delivered — the document that decides "was this load actually delivered?" and therefore whether payment is owed.</p>`,
    target: 'nav-/admin/bill-of-lading',
    on: 'right',
    path: RoutePath.AdminBillOfLading,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    text: `<p>New document uploads, fresh reports and platform events land here, so you do not have to poll the queues manually.</p>`,
    target: 'notification-bell',
    on: 'right',
  },
  {
    // Land admins back on the dashboard, where their day actually starts.
    ...finishStep([
      'Clear Document Review — approve or reject with a reason.',
      'Work the Expired and Expiring Soon tabs so no carrier hauls uninsured.',
      'Triage every pending report, then resolve or dismiss it.',
      'Ban (not delete) accounts that reports prove are acting in bad faith.',
      'Glance at the dashboard vitals for anything trending the wrong way.',
    ]),
    path: RoutePath.AdminDashboard,
  },
]

export const TOUR_STEPS: Record<UserRole, TourStepDef[]> = {
  driver: DRIVER_STEPS,
  company: COMPANY_STEPS,
  admin: ADMIN_STEPS,
}
