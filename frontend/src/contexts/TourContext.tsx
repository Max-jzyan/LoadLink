import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { selectRole } from '@/services/authSlice'
import { createTour, isTourPending, consumeTourPending } from '@/hooks/useTour'
import { TOUR_STEPS } from '@/hooks/tourSteps'
import type { Tour } from 'shepherd.js'

interface TourContextValue {
  startTour: () => void
  /** True when a walkthrough script exists for the signed-in role. */
  hasTour: boolean
}

const TourContext = createContext<TourContextValue>({ startTour: () => {}, hasTour: false })

export function useTourContext() {
  return useContext(TourContext)
}

export function TourProvider({ children }: { children: ReactNode }) {
  const role = useSelector(selectRole)
  const navigate = useNavigate()
  const tourRef = useRef<Tour | null>(null)

  const hasTour = !!role && (TOUR_STEPS[role]?.length ?? 0) > 0

  function startTour() {
    if (!role || !hasTour) return
    // Destroy any existing tour first
    if (tourRef.current) {
      tourRef.current.complete()
      tourRef.current = null
    }
    const tour = createTour(role, navigate)
    tourRef.current = tour
    // Give the DOM a tick to settle (especially on first mount)
    requestAnimationFrame(() => {
      tour.start()
    })
  }

  // Auto-start on first login after signup
  useEffect(() => {
    if (!role || !hasTour) return
    if (isTourPending()) {
      consumeTourPending()
      // Small delay so the authenticated layout has fully rendered
      const timer = setTimeout(() => {
        startTour()
      }, 800)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, hasTour])

  // Tear the tour down if the provider unmounts (e.g. logout) so no orphaned
  // overlay is left covering the login screen.
  useEffect(() => {
    return () => {
      tourRef.current?.complete()
      tourRef.current = null
    }
  }, [])

  return <TourContext.Provider value={{ startTour, hasTour }}>{children}</TourContext.Provider>
}
