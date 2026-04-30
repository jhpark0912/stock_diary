import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchHoldings, fetchRecentTrades, fetchRealizedReturns } from '@/lib/queries'
import type { HoldingRow, RecentTradeRow, RealizedReturnRow } from '@/lib/queries'

function formatUSD(val: number) {
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function formatKRW(val: number) {
  return `₩${val.toLocaleString('ko-KR')}`
}
function formatCurrency(val: number, currency: 'USD' | 'KRW') {
  return currency === 'USD' ? formatUSD(val) : formatKRW(val)
}

type MarketSummary = { cost: number; count: number }

function calcMarketSummary(holdings: HoldingRow[], currency: 'USD' | 'KRW'): MarketSummary {
  const filtered = holdings.filter(h => h.currency === currency)
  return {
    cost:  filtered.reduce((a, h) => a + h.netQty * h.avgBuyPrice, 0),
    count: filtered.length,
  }
}

/** 티커 문자열 → 결정적 HSL 색상 */
function tickerColor(ticker: string): string {
  let hash = 0
  for (const ch of ticker) hash = ch.charCodeAt(0) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 45%, 45%)`
}

function ReturnBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-muted-foreground">-</span>
  const positive = pct >= 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
        positive ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'
      )}
    >
      {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      실현 {positive ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}

function todayString() {
  const d = new Date()
  const week = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${week[d.getDay()]}요일`
}

export function HomePage() {
  const [dark, setDark] = useState(false)
  const [holdings, setHoldings]             = useState<HoldingRow[]>([])
  const [recentTrades, setRecentTrades]     = useState<RecentTradeRow[]>([])
  const [realizedReturns, setRealizedReturns] = useState<RealizedReturnRow[]>([])
  const [loading, setLoading]               = useState(true)

  useEffect(() => {
    Promise.all([fetchHoldings(), fetchRecentTrades(5), fetchRealizedReturns()])
      .then(([h, t, r]) => { setHoldings(h); setRecentTrades(t); setRealizedReturns(r) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function toggleDark() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
  }

  const krw = calcMarketSummary(holdings, 'KRW')
  const usd = calcMarketSummary(holdings, 'USD')
  const realizedReturnMap = new Map(realizedReturns.map(r => [r.stockId, r]))

  return (
    <div className="flex flex-col">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-5 py-3">
        <h1 className="text-lg font-semibold text-foreground">포트폴리오</h1>
        <button
          onClick={toggleDark}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
          aria-label="다크 모드 토글"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div className="flex flex-col gap-4 p-5">
        {/* 날짜 */}
        <p className="text-xs text-muted-foreground">{todayString()}</p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          </div>
        ) : (
          <>
            {/* 시장별 투자 원금 카드 */}
            {([
              { label: '🇰🇷 한국 주식', data: krw, fmt: formatKRW },
              { label: '🇺🇸 미국 주식', data: usd, fmt: formatUSD },
            ] as const).map(({ label, data, fmt }) => (
              <div key={label} className="card-shadow rounded-2xl bg-card p-5">
                <p className="mb-1 text-xs text-muted-foreground">{label}</p>
                {data.count === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">보유 종목 없음</p>
                ) : (
                  <>
                    <p className="tabular text-[28px] font-extrabold leading-tight tracking-tight text-foreground">
                      {fmt(Math.round(data.cost))}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {data.count}종목 보유
                      </span>
                      <span className="text-xs text-muted-foreground">평균 매수 기준</span>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* 미니 차트 (정적) */}
            <div className="card-shadow rounded-2xl bg-card p-4">
              <p className="mb-2 text-xs text-muted-foreground">1개월 수익률 추이</p>
              <svg viewBox="0 0 295 60" className="h-[60px] w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,50 C40,44 80,40 120,30 C160,20 200,26 240,16 C265,10 280,12 295,8"
                  fill="none" stroke="var(--primary)" strokeWidth="2"
                />
                <path
                  d="M0,50 C40,44 80,40 120,30 C160,20 200,26 240,16 C265,10 280,12 295,8 L295,60 L0,60Z"
                  fill="url(#chart-grad)"
                />
              </svg>
            </div>

            {/* 보유 종목 */}
            <section>
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">
                  보유 종목 {holdings.length}
                </h2>
              </div>
              {holdings.length === 0 ? (
                <div className="card-shadow flex items-center justify-center rounded-2xl bg-card py-10">
                  <p className="text-sm text-muted-foreground">기록하기 탭에서 첫 매매를 추가해 보세요</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {holdings.map((h) => {
                    const totalCost    = h.netQty * h.avgBuyPrice
                    const color        = tickerColor(h.ticker)
                    const badgeLabel   = h.ticker.length <= 6 ? h.ticker : h.stockName.slice(0, 2)
                    const realized     = realizedReturnMap.get(h.stockId)
                    return (
                      <div key={h.stockId} className="card-shadow flex items-center justify-between rounded-xl bg-card px-4 py-3">
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
                          <p className="tabular text-sm font-semibold text-foreground">
                            {formatCurrency(Math.round(totalCost), h.currency)}
                          </p>
                          <ReturnBadge pct={realized?.returnPct ?? null} />
                        </div>
                      </div>
                    )
                  })}
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
                        i < recentTrades.length - 1 && 'border-b border-border'
                      )}
                    >
                      <span
                        className={cn(
                          'w-9 rounded-full py-0.5 text-center text-xs font-bold',
                          t.tradeType === 'buy' ? 'bg-buy/10 text-buy' : 'bg-sell/10 text-sell'
                        )}
                      >
                        {t.tradeType === 'buy' ? '매수' : '매도'}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {t.stockName} <span className="text-xs text-muted-foreground">{t.ticker}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{t.categoryName ?? '—'}</p>
                      </div>
                      <div className="text-right">
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
