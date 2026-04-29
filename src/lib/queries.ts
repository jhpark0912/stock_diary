// supabase-js 2.105+ (postgrest v12) 호환: 제네릭 타입 단언 사용
import { supabase } from './supabase'
import type { Market, TradeType, Currency } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * ticker가 이미 있으면 기존 id 반환, 없으면 삽입 후 id 반환.
 * RLS WITH CHECK (auth.uid() = user_id) 때문에 user_id 포함 필수.
 */
export async function upsertStock(
  userId: string,
  ticker: string,
  stockName: string,
  market: Market,
): Promise<string> {
  const { data: existing } = await db
    .from('stocks')
    .select('id')
    .eq('ticker', ticker)
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data, error } = await db
    .from('stocks')
    .insert({ user_id: userId, ticker, stock_name: stockName, market })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id as string
}

/** name + type으로 카테고리 ID 조회 */
export async function findCategoryId(
  name: string,
  tradeType: TradeType,
): Promise<string | null> {
  const { data } = await db
    .from('categories')
    .select('id')
    .eq('name', name)
    .in('type', [tradeType, 'both'])
    .limit(1)
    .maybeSingle()

  return (data?.id as string) ?? null
}

export interface InsertTradeParams {
  userId: string
  stockId: string
  tradeDate: string   // YYYY-MM-DD
  tradeType: TradeType
  quantity: number
  price: number
  currency: Currency
  categoryId: string | null
  memo: string | null
}

export async function insertTrade(params: InsertTradeParams): Promise<void> {
  const { error } = await db.from('trades').insert({
    user_id:     params.userId,
    stock_id:    params.stockId,
    trade_date:  params.tradeDate,
    trade_type:  params.tradeType,
    quantity:    params.quantity,
    price:       params.price,
    currency:    params.currency,
    category_id: params.categoryId,
    memo:        params.memo || null,
  })
  if (error) throw new Error(error.message)
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export interface HoldingRow {
  stockId: string
  ticker: string
  stockName: string
  market: Market
  currency: Currency
  netQty: number
  avgBuyPrice: number
}

/** 보유 종목: 전체 매매 기록에서 net qty > 0인 종목만 반환 */
export async function fetchHoldings(): Promise<HoldingRow[]> {
  const { data, error } = await db
    .from('trades')
    .select('stock_id, trade_type, quantity, price, currency, stocks!inner(id, ticker, stock_name, market)')
    .order('trade_date', { ascending: true })

  if (error) throw new Error(error.message)
  if (!data?.length) return []

  type Acc = {
    stockId: string; ticker: string; stockName: string
    market: Market; currency: Currency
    buyQty: number; buyAmt: number; sellQty: number
  }
  const map = new Map<string, Acc>()

  for (const row of data as any[]) {
    const s = row.stocks
    if (!map.has(row.stock_id)) {
      map.set(row.stock_id, {
        stockId: s.id, ticker: s.ticker, stockName: s.stock_name,
        market: s.market, currency: row.currency,
        buyQty: 0, buyAmt: 0, sellQty: 0,
      })
    }
    const e = map.get(row.stock_id)!
    const qty = Number(row.quantity)
    if (row.trade_type === 'buy') {
      e.buyQty += qty
      e.buyAmt += qty * Number(row.price)
    } else {
      e.sellQty += qty
    }
  }

  return [...map.values()]
    .filter(e => e.buyQty - e.sellQty > 0.000001)
    .map(e => ({
      stockId:     e.stockId,
      ticker:      e.ticker,
      stockName:   e.stockName,
      market:      e.market,
      currency:    e.currency,
      netQty:      e.buyQty - e.sellQty,
      avgBuyPrice: e.buyQty > 0 ? e.buyAmt / e.buyQty : 0,
    }))
}

export interface RecentTradeRow {
  id: string
  tradeDate: string
  tradeType: TradeType
  ticker: string
  stockName: string
  qty: number
  price: number
  currency: Currency
  categoryName: string | null
}

/** 최근 매매 목록 (홈 페이지용) */
export async function fetchRecentTrades(limit = 5): Promise<RecentTradeRow[]> {
  const { data, error } = await db
    .from('trades')
    .select('id, trade_date, trade_type, quantity, price, currency, stocks!inner(ticker, stock_name), categories(name)')
    .order('trade_date', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  if (!data?.length) return []

  return (data as any[]).map(row => ({
    id:           row.id,
    tradeDate:    row.trade_date,
    tradeType:    row.trade_type as TradeType,
    ticker:       row.stocks.ticker,
    stockName:    row.stocks.stock_name,
    qty:          Number(row.quantity),
    price:        Number(row.price),
    currency:     row.currency as Currency,
    categoryName: row.categories?.name ?? null,
  }))
}

export interface MonthTradeRow {
  id: string
  tradeDate: string
  tradeType: TradeType
  ticker: string
  stockName: string
  qty: number
  price: number
  currency: Currency
  categoryName: string | null
}

/** 특정 월 매매 기록 (캘린더 페이지용) */
export async function fetchMonthTrades(year: number, month: number): Promise<MonthTradeRow[]> {
  const m = String(month + 1).padStart(2, '0')
  const lastDay = new Date(year, month + 1, 0).getDate()
  const start = `${year}-${m}-01`
  const end   = `${year}-${m}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await db
    .from('trades')
    .select('id, trade_date, trade_type, quantity, price, currency, stocks!inner(ticker, stock_name), categories(name)')
    .gte('trade_date', start)
    .lte('trade_date', end)
    .order('trade_date', { ascending: false })

  if (error) throw new Error(error.message)
  if (!data?.length) return []

  return (data as any[]).map(row => ({
    id:           row.id,
    tradeDate:    row.trade_date,
    tradeType:    row.trade_type as TradeType,
    ticker:       row.stocks.ticker,
    stockName:    row.stocks.stock_name,
    qty:          Number(row.quantity),
    price:        Number(row.price),
    currency:     row.currency as Currency,
    categoryName: row.categories?.name ?? null,
  }))
}
