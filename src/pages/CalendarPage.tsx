import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchMonthTrades, deleteTrade } from '@/lib/queries'
import type { MonthTradeRow } from '@/lib/queries'
import { useCalendarSettings } from '@/hooks/useCalendarSettings'
import type { CurrencyThresholds, CalendarThresholds } from '@/hooks/useCalendarSettings'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const WEEKDAY_LABELS: Record<number, string> = { 0: '일', 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토' }

function heatLevel(amount: number, thresholds: CurrencyThresholds, currency: 'KRW' | 'USD'): 0 | 1 | 2 | 3 {
  if (amount <= 0) return 0
  const [mid, high] = thresholds
  const unit = currency === 'KRW' ? 10_000 : 1
  if (amount >= high * unit) return 3
  if (amount >= mid * unit) return 2
  return 1
}

const OPACITY = [0, 0.08, 0.16, 0.30] as const

function heatStyle(
  buyKRW: number, buyUSD: number, sellKRW: number, sellUSD: number,
  thresholds: CalendarThresholds
): React.CSSProperties {
  const buyLv = Math.max(
    heatLevel(buyKRW, thresholds.krw, 'KRW'),
    heatLevel(buyUSD, thresholds.usd, 'USD')
  ) as 0 | 1 | 2 | 3
  const sellLv = Math.max(
    heatLevel(sellKRW, thresholds.krw, 'KRW'),
    heatLevel(sellUSD, thresholds.usd, 'USD')
  ) as 0 | 1 | 2 | 3

  const hasBuy = buyLv > 0
  const hasSell = sellLv > 0

  if (hasBuy && hasSell) {
    const avg = OPACITY[Math.round((buyLv + sellLv) / 2) as 1 | 2 | 3]
    return { backgroundColor: `rgba(180,100,40,${avg})` }
  }
  if (hasBuy)  return { backgroundColor: `rgba(26,107,60,${OPACITY[buyLv]})` }
  if (hasSell) return { backgroundColor: `rgba(217,79,61,${OPACITY[sellLv]})` }
  return {}
}

function formatAmount(t: MonthTradeRow) {
  const total = t.qty * t.price
  return t.currency === 'USD'
    ? `$${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `${total.toLocaleString('ko-KR')}원`
}

function formatPrice(price: number, currency: 'KRW' | 'USD') {
  return currency === 'USD'
    ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `${price.toLocaleString('ko-KR')}원`
}

export function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().slice(0, 10))
  const [trades, setTrades] = useState<MonthTradeRow[]>([])
  const [loading, setLoading] = useState(true)

  const { thresholds } = useCalendarSettings()
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [expandedMemoId, setExpandedMemoId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      await deleteTrade(id)
      setTrades(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
      setConfirmDeleteId(null)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchMonthTrades(year, month)
      .then(setTrades)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [year, month])

  useEffect(() => {
    setSelectedDate(`${year}-${String(month + 1).padStart(2, '0')}-01`)
  }, [year, month])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  function handleDayClick(dateStr: string) {
    setSelectedDate(dateStr)
    setTimeout(() => {
      groupRefs.current[dateStr]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  // 캘린더 그리드
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  // 날짜별 매수/매도 금액 맵
  const amountMap: Record<string, { buyKRW: number; buyUSD: number; sellKRW: number; sellUSD: number }> = {}
  trades.forEach(t => {
    if (!amountMap[t.tradeDate]) amountMap[t.tradeDate] = { buyKRW: 0, buyUSD: 0, sellKRW: 0, sellUSD: 0 }
    const amount = t.qty * t.price
    if (t.tradeType === 'buy') {
      if (t.currency === 'KRW') amountMap[t.tradeDate].buyKRW += amount
      else amountMap[t.tradeDate].buyUSD += amount
    } else {
      if (t.currency === 'KRW') amountMap[t.tradeDate].sellKRW += amount
      else amountMap[t.tradeDate].sellUSD += amount
    }
  })

  const buyCount  = trades.filter(t => t.tradeType === 'buy').length
  const sellCount = trades.filter(t => t.tradeType === 'sell').length

  // 타임라인 그룹
  const seen = new Set<string>()
  const groupedTrades: { date: string; items: MonthTradeRow[] }[] = []
  for (const t of [...trades].sort((a, b) => b.tradeDate.localeCompare(a.tradeDate))) {
    if (!seen.has(t.tradeDate)) {
      seen.add(t.tradeDate)
      groupedTrades.push({ date: t.tradeDate, items: trades.filter(m => m.tradeDate === t.tradeDate) })
    }
  }

  function dateLabel(dateStr: string) {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAY_LABELS[d.getDay()]}요일`
  }

  return (
    <div className="flex flex-col">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 border-b border-border bg-background px-5 py-3">
        <h1 className="text-lg font-semibold text-foreground">캘린더</h1>
      </div>

      <div className="flex flex-col gap-4 p-5">
        {/* 캘린더 카드 */}
        <div className="card-shadow rounded-2xl bg-card px-4 py-4">
          {/* 월 네비게이션 */}
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-base font-semibold text-foreground">
              {year}년 {month + 1}월
            </span>
            <button
              onClick={nextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* 월 통계 칩 */}
          <div className="mb-3 flex gap-2">
            <span className="rounded-full bg-buy/10 px-3 py-0.5 text-xs font-medium text-buy">
              매수 {buyCount}건
            </span>
            <span className="rounded-full bg-sell/10 px-3 py-0.5 text-xs font-medium text-sell">
              매도 {sellCount}건
            </span>
          </div>

          {/* 요일 헤더 */}
          <div className="mb-1 grid grid-cols-7">
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className={cn(
                  'py-1 text-center text-xs font-medium',
                  i === 0 ? 'text-loss' : i === 6 ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {w}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 — 금액 기반 히트맵 */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} />
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const amounts = amountMap[dateStr]
              const isSelected = dateStr === selectedDate
              const isToday = dateStr === today.toISOString().slice(0, 10)
              const dayOfWeek = (firstDay + day - 1) % 7

              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(dateStr)}
                  className={cn(
                    'flex flex-col items-center rounded-xl py-1.5 transition-colors',
                    isSelected ? 'bg-primary text-primary-foreground' : ''
                  )}
                  style={
                    !isSelected && amounts
                      ? heatStyle(amounts.buyKRW, amounts.buyUSD, amounts.sellKRW, amounts.sellUSD, thresholds)
                      : undefined
                  }
                >
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isSelected      ? 'text-primary-foreground'
                      : isToday       ? 'font-bold text-primary'
                      : dayOfWeek === 0 ? 'text-loss'
                      : dayOfWeek === 6 ? 'text-primary'
                      : 'text-foreground'
                    )}
                  >
                    {day}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 타임라인 */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            {year}년 {month + 1}월 매매 내역
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-muted border-t-primary" />
            </div>
          ) : groupedTrades.length === 0 ? (
            <div className="card-shadow flex items-center justify-center rounded-2xl bg-card py-10">
              <p className="text-sm text-muted-foreground">이 달 매매 기록이 없습니다</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {groupedTrades.map(({ date, items }) => {
                const isActive = date === selectedDate
                return (
                  <div key={date} ref={el => { groupRefs.current[date] = el }}>
                    <div className="mb-2 flex items-center gap-3">
                      <span className={cn(
                        'whitespace-nowrap text-xs font-semibold',
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      )}>
                        {dateLabel(date)}
                      </span>
                      <div className={cn('h-px flex-1', isActive ? 'bg-primary/30' : 'bg-border')} />
                    </div>
                    <div className={cn(
                      'card-shadow overflow-hidden rounded-2xl bg-card',
                      isActive && 'ring-1 ring-primary/30'
                    )}>
                      {items.map((t, i) => (
                        <div key={t.id}>
                          <div
                            className={cn(
                              'flex flex-col',
                              i < items.length - 1 && confirmDeleteId !== t.id && 'border-b border-border'
                            )}
                          >
                            <div
                              className={cn(
                                'flex items-center gap-3 px-4 py-3',
                                t.memo && 'cursor-pointer active:bg-muted/50'
                              )}
                              onClick={() => {
                                if (!t.memo) return
                                setExpandedMemoId(expandedMemoId === t.id ? null : t.id)
                              }}
                            >
                              <span className={cn(
                                'w-9 shrink-0 rounded-full py-0.5 text-center text-xs font-bold',
                                t.tradeType === 'buy' ? 'bg-buy/10 text-buy' : 'bg-sell/10 text-sell'
                              )}>
                                {t.tradeType === 'buy' ? '매수' : '매도'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  {t.stockName}{' '}
                                  <span className="text-xs text-muted-foreground">{t.ticker}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {t.qty % 1 === 0 ? t.qty : t.qty.toFixed(4)}주 · {formatPrice(t.price, t.currency)} · {t.categoryName ?? '—'}
                                  {t.memo && (
                                    <span className="ml-1.5 text-muted-foreground/50">
                                      {expandedMemoId === t.id ? '▲' : '▼'}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <p className="tabular text-sm font-semibold text-foreground shrink-0">
                                {formatAmount(t)}
                              </p>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setConfirmDeleteId(confirmDeleteId === t.id ? null : t.id)
                                }}
                                className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            {expandedMemoId === t.id && t.memo && (
                              <div className="px-4 pb-3">
                                <p className="rounded-lg bg-muted px-3 py-2 text-xs text-foreground/80 whitespace-pre-wrap">
                                  {t.memo}
                                </p>
                              </div>
                            )}
                          </div>
                          {confirmDeleteId === t.id && (
                            <div className={cn(
                              'flex items-center justify-between bg-destructive/5 px-4 py-2',
                              i < items.length - 1 && 'border-b border-border'
                            )}>
                              <span className="text-xs text-destructive">이 거래를 삭제할까요?</span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="rounded-lg px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
                                >
                                  취소
                                </button>
                                <button
                                  type="button"
                                  disabled={deleting}
                                  onClick={() => handleDelete(t.id)}
                                  className="rounded-lg bg-destructive px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                                >
                                  {deleting ? '삭제 중...' : '삭제'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
