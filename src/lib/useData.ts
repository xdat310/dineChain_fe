import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/client'

// Loads data, optionally refreshing on an interval (kitchen screen, floor plan)
export function useData<T>(load: () => Promise<T>, deps: unknown[], refreshMs?: number) {
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  // deps are plain values (ids, tokens, dates): one string key stands for all of them
  const key = JSON.stringify(deps)
  // Loading until a response for the current deps has come back
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const loadRef = useRef(load)
  const keyRef = useRef(key)
  useEffect(() => {
    loadRef.current = load
    keyRef.current = key
  })

  const reload = useCallback(async () => {
    const requested = keyRef.current
    try {
      const value = await loadRef.current()
      setData(value)
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không tải được dữ liệu')
    } finally {
      setLoadedKey(requested)
    }
  }, [])

  useEffect(() => {
    reload()
    if (!refreshMs) return
    const id = setInterval(reload, refreshMs)
    return () => clearInterval(id)
  }, [key, refreshMs, reload])

  return { data, error, loading: loadedKey !== key, reload, setData }
}
