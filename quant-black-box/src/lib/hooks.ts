import { useEffect, useState } from 'react'

export function useDebounced<T>(value: T, delay = 120): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  )
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches)
    handler(mq)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])
  return isMobile
}
