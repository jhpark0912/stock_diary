export interface StockQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number | null
  marketState: 'REGULAR' | 'PRE' | 'POST' | 'CLOSED' | string
  currency: string
  previousClose: number
  dayHigh: number | null
  dayLow: number | null
  updatedAt: string
}

export type QuoteMap = Record<string, StockQuote>
