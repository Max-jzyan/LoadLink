import Shepherd from 'shepherd.js'
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
    classes: secondary
      ? 'shepherd-button-secondary'
      : 'shepherd-button-primary',
  }
}

export function createTour(role: UserRole): Shepherd.Tour {
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

  // ── Step 1: Welcome ──────────────────────────────────────────────────
  tour.addStep({
    id: 'welcome',
    title: 'Welcome to LoadLink!',
    text: `<p>Let's take a quick tour so you know your way around. This will only take a minute.</p>`,
    buttons: [skipBtn, nextBtn],
  })

  // ── Step 2: Sidebar ──────────────────────────────────────────────────
  tour.addStep({
    id: 'sidebar',
    title: 'Navigation Sidebar',
    text: '<p>This sidebar is your main navigation hub. You can collapse it by clicking the toggle icon at the top.</p>',
    attachTo: { element: '[data-tour="sidebar"]', on: 'right' },
    buttons: [backBtn, nextBtn],
  })

  // ── Role-specific nav steps ──────────────────────────────────────────
  if (role === 'driver') {
    tour.addStep({
      id: 'nav-revenue',
      title: 'Revenue Center',
      text: '<p>Track your earnings, view profit/loss breakdowns, and manage your financial performance here.</p>',
      attachTo: { element: '[data-tour="nav-/dashboard"]', on: 'right' },
      buttons: [backBtn, nextBtn],
    })

    tour.addStep({
      id: 'nav-loads',
      title: 'Available Loads',
      text: '<p>Browse and claim loads assigned to you. Filter by eligibility, distance, and more.</p>',
      attachTo: { element: '[data-tour="nav-/driverLoads"]', on: 'right' },
      buttons: [backBtn, nextBtn],
    })

    tour.addStep({
      id: 'nav-auctions',
      title: 'Auctions',
      text: '<p>Place bids on loads posted by companies. Live auctions update in real-time.</p>',
      attachTo: { element: '[data-tour="nav-/driverAuctions"]', on: 'right' },
      buttons: [backBtn, nextBtn],
    })

    tour.addStep({
      id: 'nav-map',
      title: 'Map',
      text: '<p>View load origins and destinations on an interactive map to plan your routes.</p>',
      attachTo: { element: '[data-tour="nav-/map"]', on: 'right' },
      buttons: [backBtn, nextBtn],
    })
  } else {
    // company role
    tour.addStep({
      id: 'nav-dashboard',
      title: 'Dashboard',
      text: '<p>Your company overview: active loads, spend metrics, and performance at a glance.</p>',
      attachTo: { element: '[data-tour="nav-/company/dashboard"]', on: 'right' },
      buttons: [backBtn, nextBtn],
    })

    tour.addStep({
      id: 'nav-loads',
      title: 'Loads',
      text: '<p>View and manage all loads your company has posted. Track statuses and driver assignments.</p>',
      attachTo: { element: '[data-tour="nav-/loads"]', on: 'right' },
      buttons: [backBtn, nextBtn],
    })

    tour.addStep({
      id: 'nav-post-load',
      title: 'Post a Load',
      text: '<p>Create a new load posting for drivers or put it up for auction. Fill in route, weight, and pay details.</p>',
      attachTo: { element: '[data-tour="nav-/loads/post"]', on: 'right' },
      buttons: [backBtn, nextBtn],
    })

    tour.addStep({
      id: 'nav-auctions',
      title: 'Auctions',
      text: '<p>Manage your live auctions. Accept bids, set cap prices, and extend deadlines in real-time.</p>',
      attachTo: { element: '[data-tour="nav-/company/auctions"]', on: 'right' },
      buttons: [backBtn, nextBtn],
    })
  }

  // ── Step: Notifications ──────────────────────────────────────────────
  tour.addStep({
    id: 'notifications',
    title: 'Notifications',
    text: '<p>Stay updated on bid activity, load assignments, and important alerts right here.</p>',
    attachTo: { element: '[data-tour="notification-bell"]', on: 'right' },
    buttons: [backBtn, nextBtn],
  })

  // ── Step: Profile & Appearance ───────────────────────────────────────
  tour.addStep({
    id: 'nav-user',
    title: 'Profile & Appearance',
    text: '<p>Click your profile picture to access your settings, switch between <strong>Light / Dark / System</strong> themes, and log out. You can also restart this tour from that menu anytime.</p>',
    attachTo: { element: '[data-tour="nav-user"]', on: 'right' },
    buttons: [backBtn, doneBtn],
  })

  return tour
}
