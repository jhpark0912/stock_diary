import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchQuotes, EXCHANGE_RATE_SYMBOL } from '@/lib/stockPrice'
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

const EXCHANGE_RATE_CACHE_KEY = 'stock-diary:exchange-rate'

interface CachedExchangeRate {
  rate: number
  updatedAt: string
}

function getCachedExchangeRate(): CachedExchangeRate | null {
  try {
    const raw = localStorage.getItem(EXCHANGE_RATE_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CachedExchangeRate
  } catch { return null }
}

function setCachedExchangeRate(rate: number) {
  try {
    const data: CachedExchangeRate = { rate, updatedAt: new Date().toISOString() }
    localStorage.setItem(EXCHANGE_RATE_CACHE_KEY, JSON.stringify(data))
  } catch { /* localStorage 사용 불가 시 무시 */ }
}

export interface UseStockPricesResult {
  quotes: QuoteMap
  /** USD → KRW 환율. 실시간 또는 캐시 값 */
  exchangeRate: number | null
  /** 환율이 캐시된 값인 경우 true */
  exchangeRateStale: boolean
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

  const liveRate = quotes[EXCHANGE_RATE_SYMBOL]?.price ?? null
  let exchangeRate: number | null = liveRate
  let exchangeRateStale = false

  if (liveRate) {
    setCachedExchangeRate(liveRate)
  } else {
    const cached = getCachedExchangeRate()
    if (cached) {
      exchangeRate = cached.rate
      exchangeRateStale = true
    }
  }

  return { quotes, exchangeRate, exchangeRateStale, loading, error, stale, lastUpdated }
}
