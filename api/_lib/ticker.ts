// src/types/database.ts의 Market 타입과 동기화 필요
type Market = 'US' | 'KR' | 'KR_KQ'

/**
 * DB 저장 티커(bare) → Yahoo Finance 심볼 변환
 * KR:    005930 → 005930.KS (실패 시 .KQ 재시도는 호출부에서 처리)
 * KR_KQ: 247540 → 247540.KQ (코스닥 직접 조회)
 * US:    AAPL → AAPL (그대로)
 */
export function toYahooSymbol(ticker: string, market: Market): string {
  if (market === 'KR_KQ') return `${ticker}.KQ`
  if (market === 'KR') return `${ticker}.KS`
  return ticker
}

