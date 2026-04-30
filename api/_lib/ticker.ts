import type { Market } from '../../src/types/database'

/**
 * DB 저장 티커(bare) → Yahoo Finance 심볼 변환
 * KR: 005930 → 005930.KS (실패 시 .KQ 재시도는 호출부에서 처리)
 * US: AAPL → AAPL (그대로)
 */
export function toYahooSymbol(ticker: string, market: Market): string {
  if (market === 'KR') return `${ticker}.KS`
  return ticker
}

export function toKQSymbol(ticker: string): string {
  return `${ticker}.KQ`
}
