import Shepherd, { type Tour } from 'shepherd.js'
import type { UserRole } from '@/types/enums'
import { ROLE_HOME } from '@/config/routes'
import { TOUR_STEPS, type TourStepDef } from '@/hooks/tourSteps'

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

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Strip a trailing slash so '/driver/' and '/driver' compare equal. */
const normalizePath = (path: string) => (path.length > 1 ? path.replace(/\/+$/, '') : path)

/**
 * Resolve once the selector exists in the DOM (or the timeout elapses).
 * Keeps steps attached correctly after a route change, and lets a step whose
 * target genuinely isn't rendered fall back to a centred card instead of
 * pointing at nothing.
 */
function waitForElement(selector: string, timeout = 2500): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      resolve()
      return
    }
    const start = Date.now()
    const tick = () => {
      if (document.querySelector(selector) || Date.now() - start > timeout) {
        resolve()
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

/** Navigate (if needed) and wait for the step's anchor before showing it. */
function prepareStep(
  navigate: (path: string) => void,
  step: TourStepDef,
  selector: string | null
): () => Promise<void> {
  return async () => {
    if (step.path && normalizePath(window.location.pathname) !== normalizePath(step.path)) {
      navigate(step.path)
      // Let React Router swap the route and the page mount its first frame.
      await delay(250)
    }
    if (selector) await waitForElement(selector)
    await delay(60)
  }
}

/**
 * Build the walkthrough for a role.
 *
 * Steps are declared in `tourSteps.ts` — one tailored script per role
 * (driver, company, admin) — and turned into Shepherd steps here, with
 * navigation, anchor-waiting, progress counters and consistent buttons.
 */
export function createTour(role: UserRole, navigate: (path: string) => void): Tour {
  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    exitOnEsc: true,
    keyboardNavigation: true,
    defaultStepOptions: {
      cancelIcon: { enabled: true },
      classes: 'loadlink-tour-step',
      scrollTo: { behavior: 'smooth', block: 'center' },
      modalOverlayOpeningPadding: 6,
      modalOverlayOpeningRadius: 6,
    },
  })

  const nextBtn = makeButton('Next', () => tour.next())
  const backBtn = makeButton('Back', () => tour.back(), true)
  const doneBtn = makeButton('Done', () => tour.complete())
  const skipBtn = makeButton('Skip tour', () => tour.complete(), true)

  const steps = TOUR_STEPS[role] ?? []
  const total = steps.length

  steps.forEach((step, index) => {
    const selector = step.target ? `[data-tour="${step.target}"]` : null
    const isFirst = index === 0
    const isLast = index === total - 1

    let buttons = [backBtn, nextBtn]
    if (isFirst) buttons = [skipBtn, nextBtn]
    else if (isLast) buttons = [backBtn, doneBtn]

    tour.addStep({
      id: step.id,
      title: step.title,
      text: `${step.text}<p class="shepherd-progress">Step ${index + 1} of ${total}</p>`,
      ...(selector ? { attachTo: { element: selector, on: step.on ?? 'bottom' } } : {}),
      beforeShowPromise: prepareStep(navigate, step, selector),
      buttons,
    })
  })

  // Return the user to their home screen when the tour ends mid-flow, so they
  // never finish stranded on a page they were only shown as an example.
  const goHome = () => {
    const home = ROLE_HOME[role]
    if (home && normalizePath(window.location.pathname) !== normalizePath(home)) navigate(home)
  }
  tour.on('cancel', goHome)

  return tour
}
