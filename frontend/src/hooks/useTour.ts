import Shepherd, { type Tour } from 'shepherd.js'
import type { UserRole } from '@/types/enums'

const TOUR_PENDING_KEY = 'loadlink_tour_pending'

export function setTourPending() {
  localStorage.setItem(TOUR_PENDING_KEY, 'true')
}

export function consumeTourPending(): boolean {
  const pending = localStorage.getItem(TOUR_PENDING_KEY) === 'true'
  if (pending) localStorage.removeItem(TOUR_PENDING_KEY)
  return pending
}

export function isTourPending(): boolean {
  return localStorage.getItem(TOUR_PENDING_KEY) === 'true'
}

function makeButton(text: string, action: () => void, secondary = false) {
  return {
    text,
    action,
    classes: secondary ? 'shepherd-button-secondary' : 'shepherd-button-primary',
  }
}

/** Navigate to path then wait for React Router + first render to settle. */
function navStep(navigate: (path: string) => void, path: string): () => Promise<void> {
  return () =>
    new Promise<void>((resolve) => {
      navigate(path)
      setTimeout(resolve, 350)
    })
}

export function createTour(role: UserRole, navigate: (path: string) => void): Tour {
  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      cancelIcon: { enabled: true },
      classes: 'loadlink-tour-step',
      scrollTo: { behavior: 'smooth', block: 'center' },
      modalOverlayOpeningPadding: 6,
      modalOverlayOpeningRadius: 6,
    },
  })

  const next = () => tour.next()
  const back = () => tour.back()
  const done = () => tour.complete()

  const nextBtn = makeButton('Next →', next)
  const backBtn = makeButton('← Back', back, true)
  const doneBtn = makeButton('Done ✓', done)
  const skipBtn = makeButton('Skip tour', done, true)

  const roleHome = role === 'driver' ? '/dashboard' : '/company/dashboard'

  // ── Step 1: Welcome ──────────────────────────────────────────────────────────
  tour.addStep({
    id: 'welcome',
    title: 'Welcome to LoadLink!',
    text: `<p>Let's take a quick tour so you know your way around. This will only take a minute.</p>`,
    beforeShowPromise: navStep(navigate, roleHome),
    buttons: [skipBtn, nextBtn],
  })

  // ── Step 2: Sidebar ──────────────────────────────────────────────────────────
  tour.addStep({
    id: 'sidebar',
    title: 'Navigation Sidebar',
    text: '<p>This sidebar is your main navigation hub. Click the toggle icon at the top to collapse or expand it.</p>',
    attachTo: { element: '[data-tour="sidebar"]', on: 'right' },
    buttons: [backBtn, nextBtn],
  })

  // ── Role-specific nav steps ──────────────────────────────────────────────────
  if (role === 'driver') {
    tour.addStep({
      id: 'nav-revenue',
      title: 'Revenue Center',
      text: '<p>Track your earnings, view profit/loss breakdowns, and manage your financial performance here.</p>',
      attachTo: { element: '[data-tour="nav-/dashboard"]', on: 'right' },
      beforeShowPromise: navStep(navigate, '/dashboard'),
      buttons: [backBtn, nextBtn],
    })

    tour.addStep({
      id: 'nav-loads',
      title: 'My Loads',
      text: '<p>Browse and manage loads assigned to you. Filter by eligibility, distance, weight, and more. Open the live map from any load row.</p>',
      attachTo: { element: '[data-tour="nav-/driverLoads"]', on: 'right' },
      beforeShowPromise: navStep(navigate, '/driverLoads'),
      buttons: [backBtn, nextBtn],
    })

    tour.addStep({
      id: 'nav-auctions',
      title: 'Auctions',
      text: '<p>Place bids on loads posted by companies. Live auctions update in real-time.</p>',
      attachTo: { element: '[data-tour="nav-/driverAuctions"]', on: 'right' },
      beforeShowPromise: navStep(navigate, '/driverAuctions'),
      buttons: [backBtn, nextBtn],
    })
  } else {
    // company role
    tour.addStep({
      id: 'nav-dashboard',
      title: 'Dashboard',
      text: '<p>Your company overview: active loads, spend metrics, and performance at a glance.</p>',
      attachTo: { element: '[data-tour="nav-/company/dashboard"]', on: 'right' },
      beforeShowPromise: navStep(navigate, '/company/dashboard'),
      buttons: [backBtn, nextBtn],
    })

    tour.addStep({
      id: 'nav-loads',
      title: 'Loads',
      text: '<p>View and manage all loads your company has posted. Track statuses and driver assignments. Use the Post Load button on this page to create new postings.</p>',
      attachTo: { element: '[data-tour="nav-/loads"]', on: 'right' },
      beforeShowPromise: navStep(navigate, '/loads'),
      buttons: [backBtn, nextBtn],
    })

    tour.addStep({
      id: 'nav-auctions',
      title: 'Auctions',
      text: '<p>Manage your live auctions. Accept bids, set cap prices, and extend deadlines in real-time.</p>',
      attachTo: { element: '[data-tour="nav-/company/auctions"]', on: 'right' },
      beforeShowPromise: navStep(navigate, '/company/auctions'),
      buttons: [backBtn, nextBtn],
    })
  }

  // ── Messages (both roles) ────────────────────────────────────────────────────
  tour.addStep({
    id: 'nav-messages',
    title: 'Messages',
    text: '<p>Chat directly with drivers or companies about load details, check-ins, and coordination — all in one place.</p>',
    attachTo: { element: '[data-tour="nav-/messages"]', on: 'right' },
    beforeShowPromise: navStep(navigate, '/messages'),
    buttons: [backBtn, nextBtn],
  })

  // ── Blocklist (both roles) ───────────────────────────────────────────────────
  tour.addStep({
    id: 'nav-blocklist',
    title: 'Blocklist',
    text: '<p>Manage your blocklist preferences to control which drivers or companies you work with.</p>',
    attachTo: { element: '[data-tour="nav-/blocklist"]', on: 'right' },
    beforeShowPromise: navStep(navigate, '/blocklist'),
    buttons: [backBtn, nextBtn],
  })

  // ── Notifications ────────────────────────────────────────────────────────────
  tour.addStep({
    id: 'notifications',
    title: 'Notifications',
    text: '<p>Stay updated on bid activity, load assignments, and important alerts right here.</p>',
    attachTo: { element: '[data-tour="notification-bell"]', on: 'right' },
    buttons: [backBtn, nextBtn],
  })

  // ── Profile & Appearance ─────────────────────────────────────────────────────
  tour.addStep({
    id: 'nav-user',
    title: 'Profile & Appearance',
    text: '<p>Click your profile picture to access settings, switch between <strong>Light / Dark / System</strong> themes, and log out. You can also restart this tour from that menu anytime.</p>',
    attachTo: { element: '[data-tour="nav-user"]', on: 'right' },
    buttons: [backBtn, doneBtn],
  })

  return tour
}
