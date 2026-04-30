import type { Market } from '@/types/database'
import type { QuoteMap } from '@/types/stockPrice'

function toYahooSymbol(ticker: string, market: Market): string {
  if (market === 'KR') return `${ticker}.KS`
  return ticker
}

/**
 * 보유 종목 티커 목록 → /api/quote 호출 → QuoteMap 반환
 */
export async function fetchQuotes(
  holdings: { ticker: string; market: Market }[],
): Promise<QuoteMap> {
  if (holdings.length === 0) return {}

  const symbols = holdings.map(h => toYahooSymbol(h.ticker, h.market))
  const params  = new URLSearchParams({ symbols: symbols.join(',') })
  const res     = await fetch(`/api/quote?${params}`)

  if (!res.ok) throw new Error(`quote API error: ${res.status}`)
  return res.json() as Promise<QuoteMap>
}
