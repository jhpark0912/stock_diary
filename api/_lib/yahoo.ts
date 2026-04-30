import YahooFinanceClass from 'yahoo-finance2'
const yahooFinance = new (YahooFinanceClass as any)({ suppressNotices: ['yahooSurvey'] })

export interface QuoteResult {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number | null
  marketState: string
  currency: string
  previousClose: number
  dayHigh: number | null
  dayLow: number | null
  updatedAt: string
}

/**
 * 여러 심볼의 시세를 배치로 조회.
 * 개별 심볼 오류는 부분 실패로 처리 — 전체를 실패시키지 않음.
 */
export async function fetchQuotes(
  symbols: string[],
): Promise<Record<string, QuoteResult>> {
  const results: Record<string, QuoteResult> = {}

  await Promise.allSettled(
    symbols.map(async (symbol) => {
      try {
        // validateResult: false — 한국 주식 등 스키마 불일치 심볼 허용
        const q = await yahooFinance.quote(symbol, {}, { validateResult: false })
        if (!q || q.regularMarketPrice == null) return

        results[symbol] = {
          symbol,
          price:         q.regularMarketPrice,
          change:        q.regularMarketChange ?? 0,
          changePercent: q.regularMarketChangePercent ?? 0,
          volume:        q.regularMarketVolume ?? null,
          marketState:   q.marketState ?? 'CLOSED',
          currency:      q.currency ?? 'USD',
          previousClose: q.regularMarketPreviousClose ?? q.regularMarketPrice,
          dayHigh:       q.regularMarketDayHigh ?? null,
          dayLow:        q.regularMarketDayLow ?? null,
          updatedAt:     new Date().toISOString(),
        }
      } catch (e) {
        console.error(`[yahoo] ${symbol} 조회 실패:`, e instanceof Error ? e.message : e)
      }
    }),
  )

  return results
}
