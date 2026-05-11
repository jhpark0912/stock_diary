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
    .eq('market', market)
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

/** 종목 시장 변경 (KR ↔ KR_KQ) */
export async function updateStockMarket(id: string, market: Market): Promise<void> {
  const { error } = await db.from('stocks').update({ market }).eq('id', id)
  if (error) throw new Error(error.message)
}

/** 종목 삭제 (매매 기록이 있으면 DB에서 RESTRICT로 실패) */
export async function deleteStock(id: string): Promise<void> {
  const { error } = await db.from('stocks').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** 종목을 참조하는 거래 건수 조회 */
export async function countTradesByStock(stockId: string): Promise<number> {
  const { count, error } = await db
    .from('trades')
    .select('id', { count: 'exact', head: true })
    .eq('stock_id', stockId)

  if (error) throw new Error(error.message)
  return count ?? 0
}

export interface CategoryOption {
  id: string
  name: string
}

/** 현재 유저의 카테고리 목록 조회 (tradeType 필터 적용) */
export async function fetchCategories(tradeType: TradeType): Promise<CategoryOption[]> {
  const { data, error } = await db
    .from('categories')
    .select('id, name')
    .in('type', [tradeType, 'both'])
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as CategoryOption[]
}

// ─── Category CRUD ───────────────────────────────────────────────────────────

export interface CategoryRow {
  id: string
  name: string
  type: 'buy' | 'sell' | 'both'
  is_default: boolean
  sort_order: number
}

/** 현재 유저의 전체 카테고리 목록 (설정 페이지용) */
export async function fetchAllCategories(): Promise<CategoryRow[]> {
  const { data, error } = await db
    .from('categories')
    .select('id, name, type, is_default, sort_order')
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as CategoryRow[]
}

/** 카테고리 추가 */
export async function insertCategory(
  userId: string,
  name: string,
  type: 'buy' | 'sell' | 'both',
  sortOrder: number,
): Promise<string> {
  const { data, error } = await db
    .from('categories')
    .insert({ user_id: userId, name, type, is_default: false, sort_order: sortOrder })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id as string
}

/** 카테고리 수정 */
export async function updateCategory(
  id: string,
  updates: { name?: string; type?: 'buy' | 'sell' | 'both'; sort_order?: number },
): Promise<void> {
  const { error } = await db.from('categories').update(updates).eq('id', id)
  if (error) throw new Error(error.message)
}

/** 카테고리 삭제 */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await db.from('categories').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** 카테고리 순서 일괄 업데이트 */
export async function reorderCategories(
  items: { id: string; sort_order: number }[],
): Promise<void> {
  await Promise.all(
    items.map(item =>
      db.from('categories').update({ sort_order: item.sort_order }).eq('id', item.id)
    )
  )
}

/** 카테고리를 참조하는 거래 건수 조회 */
export async function countTradesByCategory(categoryId: string): Promise<number> {
  const { count, error } = await db
    .from('trades')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoryId)

  if (error) throw new Error(error.message)
  return count ?? 0
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

export async function deleteTrade(id: string): Promise<void> {
  const { error } = await db.from('trades').delete().eq('id', id)
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
  memo: string | null
}

/** 최근 매매 목록 (홈 페이지용) */
export async function fetchRecentTrades(limit = 5): Promise<RecentTradeRow[]> {
  const { data, error } = await db
    .from('trades')
    .select('id, trade_date, trade_type, quantity, price, currency, memo, stocks!inner(ticker, stock_name), categories(name)')
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
    memo:         row.memo as string | null,
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
  memo: string | null
}

export interface StockRow {
  stockId: string
  ticker: string
  stockName: string
  market: Market
  currency: Currency
  isHolding: boolean
  netQty: number
}

/** stocks 테이블 전체 조회 + 보유 여부 표시 (매매 기록 종목 선택용) */
export async function fetchAllStocks(): Promise<StockRow[]> {
  const [{ data: stocks, error }, holdings] = await Promise.all([
    db.from('stocks').select('id, ticker, stock_name, market').order('created_at', { ascending: false }),
    fetchHoldings(),
  ])

  if (error) throw new Error(error.message)
  if (!stocks?.length) return []

  const holdingMap = new Map(holdings.map(h => [h.stockId, h]))

  return (stocks as any[])
    .map(s => {
      const holding = holdingMap.get(s.id)
      return {
        stockId:   s.id,
        ticker:    s.ticker,
        stockName: s.stock_name,
        market:    s.market as Market,
        currency:  (s.market.startsWith('KR') ? 'KRW' : 'USD') as Currency,
        isHolding: !!holding,
        netQty:    holding?.netQty ?? 0,
      }
    })
    .sort((a, b) => Number(b.isHolding) - Number(a.isHolding))
}

export interface RealizedReturnRow {
  stockId: string
  ticker: string
  stockName: string
  market: Market
  currency: Currency
  realizedGain: number
  returnPct: number
  firstBuyDate: string   // YYYY-MM-DD
  lastSellDate: string   // YYYY-MM-DD
  holdingDays: number
}

/** 종목별 실현 수익률: 매도 기록이 있는 종목만 반환 */
export async function fetchRealizedReturns(): Promise<RealizedReturnRow[]> {
  const { data, error } = await db
    .from('trades')
    .select('stock_id, trade_type, quantity, price, currency, trade_date, stocks!inner(id, ticker, stock_name, market)')
    .order('trade_date', { ascending: true })

  if (error) throw new Error(error.message)
  if (!data?.length) return []

  type Acc = {
    stockId: string; ticker: string; stockName: string; market: Market; currency: Currency
    buyQty: number; buyAmt: number; sellQty: number; sellAmt: number
    firstBuyDate: string; lastSellDate: string
  }
  const map = new Map<string, Acc>()

  for (const row of data as any[]) {
    const s = row.stocks
    if (!map.has(row.stock_id)) {
      map.set(row.stock_id, {
        stockId: s.id, ticker: s.ticker, stockName: s.stock_name,
        market: s.market as Market, currency: row.currency as Currency,
        buyQty: 0, buyAmt: 0, sellQty: 0, sellAmt: 0,
        firstBuyDate: '', lastSellDate: '',
      })
    }
    const e = map.get(row.stock_id)!
    const qty = Number(row.quantity)
    const price = Number(row.price)
    if (row.trade_type === 'buy') {
      e.buyQty += qty
      e.buyAmt += qty * price
      if (!e.firstBuyDate || row.trade_date < e.firstBuyDate) e.firstBuyDate = row.trade_date
    } else {
      e.sellQty += qty
      e.sellAmt += qty * price
      if (!e.lastSellDate || row.trade_date > e.lastSellDate) e.lastSellDate = row.trade_date
    }
  }

  return [...map.values()]
    .filter(e => e.sellQty > 0 && e.buyQty > 0)
    .map(e => {
      const avgBuyPrice  = e.buyAmt / e.buyQty
      const costBasis    = avgBuyPrice * e.sellQty
      const realizedGain = e.sellAmt - costBasis
      const returnPct    = costBasis > 0 ? (realizedGain / costBasis) * 100 : 0
      const holdingDays  = e.firstBuyDate && e.lastSellDate
        ? Math.round((new Date(e.lastSellDate).getTime() - new Date(e.firstBuyDate).getTime()) / 86_400_000)
        : 0
      return {
        stockId: e.stockId, ticker: e.ticker, stockName: e.stockName,
        market: e.market, currency: e.currency,
        realizedGain, returnPct,
        firstBuyDate: e.firstBuyDate, lastSellDate: e.lastSellDate, holdingDays,
      }
    })
}

/** 특정 월 매매 기록 (캘린더 페이지용) */
export async function fetchMonthTrades(year: number, month: number): Promise<MonthTradeRow[]> {
  const m = String(month + 1).padStart(2, '0')
  const lastDay = new Date(year, month + 1, 0).getDate()
  const start = `${year}-${m}-01`
  const end   = `${year}-${m}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await db
    .from('trades')
    .select('id, trade_date, trade_type, quantity, price, currency, memo, stocks!inner(ticker, stock_name), categories(name)')
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
    memo:         row.memo as string | null,
  }))
}
