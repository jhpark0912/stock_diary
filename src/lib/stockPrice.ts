import type { Market } from '@/types/database'
import type { QuoteMap } from '@/types/stockPrice'

export function toYahooSymbol(ticker: string, market: Market): string {
  if (market === 'KR_KQ') return `${ticker}.KQ`
  if (market === 'KR') return `${ticker}.KS`
  return ticker
}

/** 환율 심볼 (USD → KRW) */
export const EXCHANGE_RATE_SYMBOL = 'KRW=X'

/**
 * 보유 종목 티커 목록 → /api/quote 호출 → QuoteMap 반환
 * 미국 주식이 있으면 KRW=X 환율도 함께 조회
 */
export async function fetchQuotes(
  holdings: { ticker: string; market: Market }[],
): Promise<QuoteMap> {
  if (holdings.length === 0) return {}

  const symbols = holdings.map(h => toYahooSymbol(h.ticker, h.market))

  const hasUSD = holdings.some(h => h.market === 'US')
  if (hasUSD && !symbols.includes(EXCHANGE_RATE_SYMBOL)) {
    symbols.push(EXCHANGE_RATE_SYMBOL)
  }

  const params  = new URLSearchParams({ symbols: symbols.join(',') })
  const res     = await fetch(`/api/quote?${params}`)

  if (!res.ok) throw new Error(`quote API error: ${res.status}`)
  return res.json() as Promise<QuoteMap>
}
