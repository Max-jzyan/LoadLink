import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { selectRole } from '@/services/authSlice'
import { createTour, isTourPending, consumeTourPending } from '@/hooks/useTour'
import type { Tour } from 'shepherd.js'

interface TourContextValue {
  startTour: () => void
}

const TourContext = createContext<TourContextValue>({ startTour: () => {} })

export function useTourContext() {
  return useContext(TourContext)
}

export function TourProvider({ children }: { children: ReactNode }) {
  const role = useSelector(selectRole)
  const navigate = useNavigate()
  const tourRef = useRef<Tour | null>(null)

  function startTour() {
    if (!role) return
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
    if (!role) return
    if (isTourPending()) {
      consumeTourPending()
      // Small delay so the authenticated layout has fully rendered
      const timer = setTimeout(() => {
        startTour()
      }, 800)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

  return <TourContext.Provider value={{ startTour }}>{children}</TourContext.Provider>
}
