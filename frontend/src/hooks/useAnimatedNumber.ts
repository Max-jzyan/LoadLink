import { useEffect, useRef, useState } from 'react'

interface UseAnimatedNumberOptions {
  duration?: number
  easing?: (t: number) => number
}

export function useAnimatedNumber(targetValue: number, options: UseAnimatedNumberOptions = {}) {
  const { duration = 800, easing = easeOutCubic } = options
  const [displayValue, setDisplayValue] = useState(targetValue)
  const previousValueRef = useRef(targetValue)
  const animationRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const startValue = previousValueRef.current
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easing(progress)

      const currentValue = startValue + (targetValue - startValue) * easedProgress
      setDisplayValue(currentValue)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        previousValueRef.current = targetValue
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [targetValue, duration, easing])

  return displayValue
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function useAnimatedCurrency(value: number | null | undefined, currency = 'CAD'): string {
  const animatedValue = useAnimatedNumber(value ?? 0)

  if (value === null || value === undefined) {
    return '—'
  }

  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(animatedValue)
}

export function useAnimatedPercentage(value: number | null | undefined, decimals = 1): string {
  const animatedValue = useAnimatedNumber(value ?? 0)

  if (value === null || value === undefined) {
    return '—'
  }

  return `${animatedValue.toFixed(decimals)}%`
}
