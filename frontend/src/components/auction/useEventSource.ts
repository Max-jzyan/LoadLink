import { useEffect, useState } from 'react'

export function useEventSource<T>(url: string | null): T | null {
  const [data, setData] = useState<T | null>(null)

  useEffect(() => {
    if (!url) return
    const source = new EventSource(url)
    source.onmessage = (e) => {
      try {
        setData(JSON.parse(e.data) as T)
      } catch {
        // in case of invalide json interrupting tunnel
      }
    }
    return () => source.close()
  }, [url])

  return data
}
