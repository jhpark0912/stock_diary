import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchQuotes } from '@/lib/stockPrice'
import type { HoldingRow } from '@/lib/queries'
import type { QuoteMap } from '@/types/stockPrice'

const INTERVAL_MARKET_OPEN  = 5  * 60 * 1000  // 5분 (장중)
const INTERVAL_MARKET_CLOSED = 30 * 60 * 1000  // 30분 (장외)

function isKRMarketOpen(): boolean {
  const now = new Date()
  // KST = UTC+9
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const day  = kst.getUTCDay()  // 0=일, 6=토
  const hour = kst.getUTCHours()
  const min  = kst.getUTCMinutes()
  const time = hour * 60 + min
  if (day === 0 || day === 6) return false
  return time >= 9 * 60 && time < 15 * 60 + 30  // 09:00~15:30
}

export interface UseStockPricesResult {
  quotes: QuoteMap
  loading: boolean
  error: string | null
  stale: boolean
  lastUpdated: Date | null
}

export function useStockPrices(holdings: HoldingRow[]): UseStockPricesResult {
  const [quotes, setQuotes]           = useState<QuoteMap>({})
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [stale, setStale]             = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    if (holdings.length === 0) return
    try {
      const data = await fetchQuotes(holdings.map(h => ({ ticker: h.ticker, market: h.market })))
      setQuotes(data)
      setError(null)
      setStale(false)
      setLastUpdated(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'quote fetch failed')
      setStale(true)
    }
  }, [holdings])

  useEffect(() => {
    if (holdings.length === 0) return

    setLoading(true)
    load().finally(() => setLoading(false))

    function schedule() {
      const interval = isKRMarketOpen() ? INTERVAL_MARKET_OPEN : INTERVAL_MARKET_CLOSED
      timerRef.current = setTimeout(() => { load(); schedule() }, interval)
    }
    schedule()

    function onVisibility() {
      if (document.hidden) {
        if (timerRef.current) clearTimeout(timerRef.current)
      } else {
        load()
        schedule()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [holdings, load])

  return { quotes, loading, error, stale, lastUpdated }
}
