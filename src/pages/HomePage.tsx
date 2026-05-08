import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchHoldings, fetchRecentTrades, fetchRealizedReturns } from '@/lib/queries'
import type { HoldingRow, RecentTradeRow, RealizedReturnRow } from '@/lib/queries'
import { useStockPrices } from '@/hooks/useStockPrices'
import type { StockQuote } from '@/types/stockPrice'

function formatUSD(val: number) {
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function formatKRW(val: number) {
  return `₩${Math.round(val).toLocaleString('ko-KR')}`
}
function formatCurrency(val: number, currency: 'USD' | 'KRW') {
  return currency === 'USD' ? formatUSD(val) : formatKRW(val)
}

/** 티커 문자열 → 결정적 HSL 색상 */
function tickerColor(ticker: string): string {
  let hash = 0
  for (const ch of ticker) hash = ch.charCodeAt(0) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 45%, 45%)`
}

function todayString() {
  const d = new Date()
  const week = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${week[d.getDay()]}요일`
}


function MarketSummaryCard({
  label,
  holdings,
  currency,
  market,
  quotes,
  realizedReturns,
}: {
  label: string
  holdings: HoldingRow[]
  currency: 'USD' | 'KRW'
  market: 'KR' | 'US'
  quotes: Record<string, StockQuote>
  realizedReturns: RealizedReturnRow[]
}) {
  const navigate = useNavigate()

  const filtered = holdings.filter(h => h.currency === currency)

  const realizedFiltered = realizedReturns.filter(r => r.currency === currency)
  const totalRealized = realizedFiltered.reduce((sum, r) => sum + r.realizedGain, 0)
  const hasRealized = realizedFiltered.length > 0

  if (filtered.length === 0 && !hasRealized) return null

  let costBasis    = 0
  let currentValue = 0
  let hasLiveData  = false

  for (const h of filtered) {
    const cost = h.netQty * h.avgBuyPrice
    costBasis += cost
    const yahooSym = h.market === 'KR' ? `${h.ticker}.KS` : h.ticker
    const q = quotes[yahooSym]
    if (q) {
      currentValue += h.netQty * q.price
      hasLiveData = true
    } else {
      currentValue += cost
    }
  }

  const pnl    = currentValue - costBasis
  const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0
  const up     = pnl >= 0

  // 장 상태
  const marketStates = filtered.map(h => {
    const sym = h.market === 'KR' ? `${h.ticker}.KS` : h.ticker
    return quotes[sym]?.marketState
  }).filter(Boolean)
  const isOpen = marketStates.some(s => s === 'REGULAR')

  return (
    <div className="card-shadow rounded-2xl bg-card p-5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1.5">
          <span className={cn('h-1.5 w-1.5 rounded-full', isOpen ? 'bg-profit' : 'bg-muted-foreground/40')} />
          <span className="text-[10px] text-muted-foreground">{isOpen ? '장중' : '장외'}</span>
        </div>
      </div>
      <p className="tabular text-[26px] font-extrabold leading-tight tracking-tight text-foreground">
        {formatCurrency(currentValue, currency)}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5 tabular">
        투자원금 {formatCurrency(costBasis, currency)}
      </p>
      {hasLiveData && (
        <span
          className={cn(
            'mt-2 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
            up ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss',
          )}
        >
          {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {up ? '+' : ''}{formatCurrency(pnl, currency)} ({up ? '+' : ''}{pnlPct.toFixed(1)}%)
        </span>
      )}
      <div className="mt-2 flex items-center gap-2">
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {filtered.length}종목 보유
        </span>
      </div>

      {hasRealized && (
        <>
          <div className="mt-3 border-t border-border" />
          <button
            onClick={() => navigate('/report', { state: { tab: market } })}
            className="mt-1 flex w-full items-center justify-between py-2"
          >
            <span className="text-xs text-muted-foreground">실현 손익</span>
            <div className="flex items-center gap-1">
              <span className={cn('tabular text-xs font-semibold', totalRealized >= 0 ? 'text-profit' : 'text-loss')}>
                {totalRealized >= 0 ? '+' : ''}{formatCurrency(totalRealized, currency)}
              </span>
              <ChevronRight size={13} className="text-muted-foreground" />
            </div>
          </button>
        </>
      )}
    </div>
  )
}

function HoldingGroup({
  title,
  holdings,
  quotes,
  realizedReturnMap,
  groupType,
}: {
  title: string
  holdings: HoldingRow[]
  quotes: Record<string, StockQuote>
  realizedReturnMap: Map<string, RealizedReturnRow>
  groupType: 'gain' | 'loss' | 'neutral'
}) {
  if (holdings.length === 0) return null

  // 그룹 소계 (미실현 손익)
  const groupPnl = holdings.reduce((sum, h) => {
    const sym = h.market === 'KR' ? `${h.ticker}.KS` : h.ticker
    const q   = quotes[sym]
    if (!q) return sum
    return sum + (q.price - h.avgBuyPrice) * h.netQty
  }, 0)

  const hasLiveGroup = holdings.some(h => {
    const sym = h.market === 'KR' ? `${h.ticker}.KS` : h.ticker
    return !!quotes[sym]
  })

  const color = groupType === 'gain' ? 'text-profit' : groupType === 'loss' ? 'text-loss' : 'text-muted-foreground'
  const dotColor = groupType === 'gain' ? 'bg-profit' : groupType === 'loss' ? 'bg-loss' : 'bg-muted-foreground/40'

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className={cn('h-2 w-2 rounded-full', dotColor)} />
        <span className={cn('text-xs font-bold', color)}>
          {title} ({holdings.length})
        </span>
        {hasLiveGroup && groupType !== 'neutral' && (
          <span className={cn('ml-auto text-xs font-semibold', color)}>
            소계 {groupPnl >= 0 ? '+' : ''}
            {/* 혼합 통화는 원화/달러 각각 */}
            {holdings[0].currency === 'KRW'
              ? formatKRW(groupPnl)
              : formatUSD(groupPnl)}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {holdings.map(h => <HoldingCard key={h.stockId} h={h} quotes={quotes} realizedReturnMap={realizedReturnMap} />)}
      </div>
    </div>
  )
}

function HoldingCard({
  h,
  quotes,
  realizedReturnMap,
}: {
  h: HoldingRow
  quotes: Record<string, StockQuote>
  realizedReturnMap: Map<string, RealizedReturnRow>
}) {
  const yahooSym  = h.market === 'KR' ? `${h.ticker}.KS` : h.ticker
  const q         = quotes[yahooSym]
  const color     = tickerColor(h.ticker)
  const badgeLabel = h.ticker.length <= 6 ? h.ticker : h.stockName.slice(0, 2)
  const realized  = realizedReturnMap.get(h.stockId)

  const unrealizedPnl = q ? (q.price - h.avgBuyPrice) * h.netQty : null
  const unrealizedPct = q && h.avgBuyPrice > 0 ? ((q.price - h.avgBuyPrice) / h.avgBuyPrice) * 100 : null
  const up = unrealizedPct !== null ? unrealizedPct >= 0 : null

  return (
    <div className="card-shadow flex items-center justify-between rounded-xl bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className="flex h-8 items-center justify-center rounded-md px-2 text-[11px] font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {badgeLabel}
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">{h.stockName}</p>
          <p className="text-xs text-muted-foreground">
            {h.netQty % 1 === 0 ? h.netQty : h.netQty.toFixed(4)}주 · 평단 {formatCurrency(h.avgBuyPrice, h.currency)}
          </p>
        </div>
      </div>
      <div className="text-right">
        {q ? (
          <>
            <p className="tabular text-sm font-semibold text-foreground">
              {formatCurrency(q.price, h.currency)}
            </p>
            {unrealizedPnl !== null && unrealizedPct !== null && (
              <p className={cn('tabular text-xs font-medium mt-0.5', up ? 'text-profit' : 'text-loss')}>
                {up ? '+' : ''}{formatCurrency(unrealizedPnl, h.currency)} ({up ? '+' : ''}{unrealizedPct.toFixed(1)}%)
              </p>
            )}
          </>
        ) : (
          <>
            <p className="tabular text-sm font-semibold text-foreground">
              {formatCurrency(Math.round(h.netQty * h.avgBuyPrice), h.currency)}
            </p>
            {realized && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
                  realized.returnPct >= 0 ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss',
                )}
              >
                {realized.returnPct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                실현 {realized.returnPct >= 0 ? '+' : ''}{realized.returnPct.toFixed(1)}%
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function HomePage() {
  const [holdings, setHoldings]             = useState<HoldingRow[]>([])
  const [recentTrades, setRecentTrades]     = useState<RecentTradeRow[]>([])
  const [realizedReturns, setRealizedReturns] = useState<RealizedReturnRow[]>([])
  const [loading, setLoading]               = useState(true)

  const { quotes, stale, lastUpdated } = useStockPrices(holdings)

  useEffect(() => {
    Promise.all([fetchHoldings(), fetchRecentTrades(5), fetchRealizedReturns()])
      .then(([h, t, r]) => { setHoldings(h); setRecentTrades(t); setRealizedReturns(r) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const realizedReturnMap = new Map(realizedReturns.map(r => [r.stockId, r]))

  // D 방향: 수익/손실 그룹핑
  const gainers  = holdings.filter(h => {
    const sym = h.market === 'KR' ? `${h.ticker}.KS` : h.ticker
    const q   = quotes[sym]
    return q ? q.price >= h.avgBuyPrice : false
  })
  const losers   = holdings.filter(h => {
    const sym = h.market === 'KR' ? `${h.ticker}.KS` : h.ticker
    const q   = quotes[sym]
    return q ? q.price < h.avgBuyPrice : false
  })
  const noQuote  = holdings.filter(h => {
    const sym = h.market === 'KR' ? `${h.ticker}.KS` : h.ticker
    return !quotes[sym]
  })
  const hasQuotes = Object.keys(quotes).length > 0

  return (
    <div className="flex flex-col">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 border-b border-border bg-background px-5 py-3">
        <h1 className="text-lg font-semibold text-foreground">포트폴리오</h1>
      </div>

      <div className="flex flex-col gap-4 p-5">
        <p className="text-xs text-muted-foreground">{todayString()}</p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          </div>
        ) : (
          <>
            {/* 시장별 요약 카드 */}
            <MarketSummaryCard label="🇰🇷 한국 주식" holdings={holdings} currency="KRW" market="KR" quotes={quotes} realizedReturns={realizedReturns} />
            <MarketSummaryCard label="🇺🇸 미국 주식" holdings={holdings} currency="USD" market="US" quotes={quotes} realizedReturns={realizedReturns} />

            {/* 보유 종목 — 수익/손실 그룹핑 */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">
                  보유 종목 {holdings.length}
                </h2>
                {lastUpdated && (
                  <span className={cn('text-[10px]', stale ? 'text-loss' : 'text-muted-foreground')}>
                    {stale ? '시세 오류 · ' : ''}
                    {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준
                  </span>
                )}
              </div>

              {holdings.length === 0 ? (
                <div className="card-shadow flex items-center justify-center rounded-2xl bg-card py-10">
                  <p className="text-sm text-muted-foreground">기록하기 탭에서 첫 매매를 추가해 보세요</p>
                </div>
              ) : hasQuotes ? (
                <div className="flex flex-col gap-4">
                  <HoldingGroup
                    title="수익"
                    holdings={gainers}
                    quotes={quotes}
                    realizedReturnMap={realizedReturnMap}
                    groupType="gain"
                  />
                  <HoldingGroup
                    title="손실"
                    holdings={losers}
                    quotes={quotes}
                    realizedReturnMap={realizedReturnMap}
                    groupType="loss"
                  />
                  <HoldingGroup
                    title="시세 없음"
                    holdings={noQuote}
                    quotes={quotes}
                    realizedReturnMap={realizedReturnMap}
                    groupType="neutral"
                  />
                </div>
              ) : (
                // 시세 로딩 전: 기존 레이아웃 그대로
                <div className="flex flex-col gap-3">
                  {holdings.map(h => (
                    <HoldingCard key={h.stockId} h={h} quotes={{}} realizedReturnMap={realizedReturnMap} />
                  ))}
                </div>
              )}
            </section>

            {/* 최근 매매 */}
            <section>
              <h2 className="mb-2.5 text-base font-semibold text-foreground">최근 매매</h2>
              {recentTrades.length === 0 ? (
                <div className="card-shadow flex items-center justify-center rounded-2xl bg-card py-10">
                  <p className="text-sm text-muted-foreground">매매 기록이 없습니다</p>
                </div>
              ) : (
                <div className="card-shadow rounded-2xl bg-card">
                  {recentTrades.map((t, i) => (
                    <div
                      key={t.id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3',
                        i < recentTrades.length - 1 && 'border-b border-border',
                      )}
                    >
                      <span
                        className={cn(
                          'w-9 rounded-full py-0.5 text-center text-xs font-bold',
                          t.tradeType === 'buy' ? 'bg-buy/10 text-buy' : 'bg-sell/10 text-sell',
                        )}
                      >
                        {t.tradeType === 'buy' ? '매수' : '매도'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {t.stockName} <span className="text-xs text-muted-foreground">{t.ticker}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{t.categoryName ?? '—'}</p>
                        {t.memo && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground/70 italic">{t.memo}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tabular text-sm font-medium text-foreground">
                          {formatCurrency(Math.round(t.qty * t.price), t.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">{t.tradeDate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
