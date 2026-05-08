import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchRealizedReturns } from '@/lib/queries'
import type { RealizedReturnRow } from '@/lib/queries'

type TabType = 'all' | 'KR' | 'US'
type SortType = 'returnPct' | 'gain' | 'holdingDays' | 'recent'

function formatUSD(val: number) {
  return `$${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function formatKRW(val: number) {
  return `₩${Math.round(Math.abs(val)).toLocaleString('ko-KR')}`
}
function formatGain(val: number, currency: 'USD' | 'KRW') {
  const sign = val >= 0 ? '+' : '-'
  return sign + (currency === 'USD' ? formatUSD(val) : formatKRW(val))
}
function formatDate(dateStr: string) {
  return dateStr.slice(5).replace('-', '.')
}

// ─── 포디엄 바 (국가별 탭용 3단) ─────────────────────────────────────────────

function SinglePodium({ items, currency, label }: { items: RealizedReturnRow[]; currency: 'USD' | 'KRW'; label: string }) {
  const top3 = items.slice(0, 3)
  if (top3.length === 0) return null

  const order = [top3[1], top3[0], top3[2]].filter(Boolean)
  const heights = [110, 140, 90]
  const ranks = [2, 1, 3]

  return (
    <div className="px-3 pb-5">
      <p className="mb-2.5 text-[11px] font-semibold text-muted-foreground">{label}</p>
      <div className="flex items-end justify-center gap-2">
      {order.map((item, idx) => {
        const rank = ranks[idx]
        const height = heights[idx]
        const up = item.realizedGain >= 0
        return (
          <div key={item.stockId} className="flex flex-1 flex-col items-center">
            <div
              className="relative flex w-full flex-col items-center justify-end rounded-t-[10px] px-2 pb-3 pt-2"
              style={{
                height,
                background: up
                  ? `linear-gradient(180deg, ${rank === 1 ? '#1A6B3C, #2d9d5c' : rank === 2 ? '#3ba566, #5dbd83' : '#6cc98e, #8ed9a8'})`
                  : `linear-gradient(180deg, ${rank === 1 ? '#D94F3D, #e86b5b' : rank === 2 ? '#e06052, #e87a6d' : '#eb8f85, #f0a89f'})`,
              }}
            >
              {rank === 1 && <span className="absolute -top-3 text-sm">👑</span>}
              <span className="text-xl font-black text-white/90">{rank}</span>
              <span className="mt-1 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-[11px] font-bold text-white">
                {item.ticker}
              </span>
              <span className="mt-0.5 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-[9px] text-white/75">
                {item.stockName}
              </span>
              <span className="mt-1 text-[11px] font-bold tabular-nums text-white/95">
                {formatGain(item.realizedGain, currency)}
              </span>
              <span className="mt-0.5 text-[9px] text-white/65">
                📅 {item.holdingDays}일 보유
              </span>
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )
}

// ─── 듀얼 포디엄 (전체 탭용) ─────────────────────────────────────────────────

function DualPodium({
  krItems,
  usItems,
}: {
  krItems: RealizedReturnRow[]
  usItems: RealizedReturnRow[]
}) {
  if (krItems.length === 0 && usItems.length === 0) return null

  return (
    <div className="flex gap-2 px-3 pb-5">
      {[
        { flag: '🇰🇷', label: '한국 TOP', items: krItems, currency: 'KRW' as const },
        { flag: '🇺🇸', label: '미국 TOP', items: usItems, currency: 'USD' as const },
      ].map(({ flag, label, items, currency }) => {
        if (items.length === 0) return null
        const champion = items[0]
        const runnerUps = items.slice(1, 3)
        return (
          <div
            key={label}
            className="flex flex-1 flex-col rounded-2xl bg-card card-shadow px-2.5 py-2.5"
          >
            <div className="flex items-center justify-center gap-1">
              <span className="text-base">{flag}</span>
              <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
            </div>
            <div className="mt-1.5 text-center">
              <div className="text-sm">👑</div>
              <div className={cn('text-[13px] font-extrabold', champion.realizedGain >= 0 ? 'text-profit' : 'text-loss')}>
                {champion.ticker}
              </div>
              <div className="text-[10px] text-muted-foreground">{champion.stockName}</div>
              <div className={cn('mt-1 text-[14px] font-extrabold tabular-nums', champion.realizedGain >= 0 ? 'text-profit' : 'text-loss')}>
                {formatGain(champion.realizedGain, currency)}
              </div>
              <div className={cn('text-[11px] font-semibold tabular-nums', champion.realizedGain >= 0 ? 'text-profit' : 'text-loss')}>
                {champion.realizedGain >= 0 ? '+' : ''}{champion.returnPct.toFixed(1)}%
              </div>
              <div className="mt-1 text-[9px] text-muted-foreground">📅 {champion.holdingDays}일 보유</div>
            </div>
            {runnerUps.length > 0 && (
              <div className="mt-2 border-t border-border pt-2 flex flex-col gap-1.5">
                {runnerUps.map((item, i) => (
                  <div key={item.stockId} className="flex items-center justify-between gap-1">
                    <div className="flex min-w-0 flex-1 items-center gap-1">
                      <span className="w-3 shrink-0 text-[10px] font-bold text-muted-foreground">{i + 2}</span>
                      <span className="min-w-0 truncate text-[11px] font-semibold text-foreground">
                        {item.stockName}
                      </span>
                    </div>
                    <span className={cn('shrink-0 text-[10px] font-bold tabular-nums', item.realizedGain >= 0 ? 'text-profit' : 'text-loss')}>
                      {formatGain(item.realizedGain, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── 리스트 아이템 ────────────────────────────────────────────────────────────

function RealizedListItem({
  item,
  rank,
  showFlag,
  maxAbsGain,
}: {
  item: RealizedReturnRow
  rank: number
  showFlag: boolean
  maxAbsGain: number
}) {
  const up = item.realizedGain >= 0
  const barWidth = maxAbsGain > 0 ? (Math.abs(item.realizedGain) / maxAbsGain) * 100 : 0

  return (
    <div className="flex items-center gap-3 border-b border-border px-5 py-3">
      <div
        className={cn(
          'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md text-[11px] font-bold',
          rank <= 3 ? 'bg-profit/10 text-profit' : 'bg-muted text-muted-foreground',
        )}
      >
        {rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {showFlag && (
            <span className="text-[11px]">{item.market === 'KR' ? '🇰🇷' : '🇺🇸'}</span>
          )}
          <span className="truncate text-[13px] font-semibold text-foreground">{item.stockName}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground">{item.ticker}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock size={10} />
            {item.holdingDays}일
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatDate(item.firstBuyDate)} 매수 → {formatDate(item.lastSellDate)} 매도
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className={cn('text-[13px] font-bold tabular-nums', up ? 'text-profit' : 'text-loss')}>
          {formatGain(item.realizedGain, item.currency)}
        </div>
        <div className={cn('flex items-center justify-end gap-0.5 text-[10px] font-semibold tabular-nums', up ? 'text-profit' : 'text-loss')}>
          {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {up ? '+' : ''}{item.returnPct.toFixed(1)}%
        </div>
        <div className="mt-1 ml-auto h-1 w-[50px] overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full', up ? 'bg-profit' : 'bg-loss')}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export function ReportPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [items, setItems]       = useState<RealizedReturnRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<TabType>(
    (location.state?.tab as TabType) ?? 'all'
  )
  const [sort, setSort]         = useState<SortType>('returnPct')
  const [showAll, setShowAll]   = useState(false)

  // 홈에서 전달받은 탭 state를 읽은 후 히스토리에서 제거 (새로고침 시 전체 탭으로 복귀)
  useEffect(() => {
    if (location.state?.tab) {
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [])

  useEffect(() => {
    fetchRealizedReturns()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // 탭 전환 시 더보기 상태 초기화
  useEffect(() => { setShowAll(false) }, [tab])

  const krItems = items.filter(r => r.market === 'KR')
  const usItems = items.filter(r => r.market === 'US')

  const filtered = tab === 'all' ? items : tab === 'KR' ? krItems : usItems

  const sortFn = (a: RealizedReturnRow, b: RealizedReturnRow): number => {
    if (sort === 'returnPct')   return b.returnPct - a.returnPct
    if (sort === 'gain')        return b.realizedGain - a.realizedGain
    if (sort === 'holdingDays') return b.holdingDays - a.holdingDays
    if (sort === 'recent')      return b.lastSellDate.localeCompare(a.lastSellDate)
    return 0
  }

  // 포디엄용: 금액순 (국가별 탭), 수익률순 (전체 탭)
  const podiumSort = (a: RealizedReturnRow, b: RealizedReturnRow) =>
    b.realizedGain - a.realizedGain

  const sortedForPodium = {
    kr: [...krItems].sort(podiumSort),
    us: [...usItems].sort(podiumSort),
  }

  const sortedList = [...filtered].sort(sortFn)
  const visibleList = showAll ? sortedList : sortedList.slice(0, 5)
  const maxAbsGain = Math.max(...sortedList.map(r => Math.abs(r.realizedGain)), 1)

  // 요약 통계
  const winCount  = filtered.filter(r => r.realizedGain >= 0).length
  const lossCount = filtered.filter(r => r.realizedGain < 0).length

  const krTotal  = krItems.reduce((s, r) => s + r.realizedGain, 0)
  const usTotal  = usItems.reduce((s, r) => s + r.realizedGain, 0)

  const SORT_OPTIONS: { value: SortType; label: string }[] = tab === 'all'
    ? [
        { value: 'returnPct',   label: '수익률순' },
        { value: 'holdingDays', label: '보유기간순' },
        { value: 'recent',      label: '최근순' },
      ]
    : [
        { value: 'gain',        label: '금액순' },
        { value: 'returnPct',   label: '수익률순' },
        { value: 'holdingDays', label: '보유기간순' },
        { value: 'recent',      label: '최근순' },
      ]

  return (
    <div className="flex flex-col">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 border-b border-border bg-background px-5 py-3">
        <h1 className="text-lg font-semibold text-foreground">리포트</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">실현된 매매 기록이 없습니다</p>
        </div>
      ) : (
        <>
          {/* 탭 */}
          <div className="flex gap-2 px-5 pt-4 pb-3">
            {[
              { value: 'all' as TabType, label: `전체 ${items.length}` },
              { value: 'KR'  as TabType, label: `🇰🇷 한국 ${krItems.length}` },
              { value: 'US'  as TabType, label: `🇺🇸 미국 ${usItems.length}` },
            ].map(t => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
                  tab === t.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 요약 칩 */}
          <div className="flex flex-wrap gap-2 px-5 pb-4">
            {tab === 'all' ? (
              <>
                {krItems.length > 0 && (
                  <div className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5', krTotal >= 0 ? 'bg-profit/10' : 'bg-loss/10')}>
                    <span className="text-[10px]">🇰🇷</span>
                    <span className={cn('text-[11px] font-semibold tabular-nums', krTotal >= 0 ? 'text-profit' : 'text-loss')}>
                      {formatGain(krTotal, 'KRW')}
                    </span>
                  </div>
                )}
                {usItems.length > 0 && (
                  <div className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5', usTotal >= 0 ? 'bg-profit/10' : 'bg-loss/10')}>
                    <span className="text-[10px]">🇺🇸</span>
                    <span className={cn('text-[11px] font-semibold tabular-nums', usTotal >= 0 ? 'text-profit' : 'text-loss')}>
                      {formatGain(usTotal, 'USD')}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5">
                  <span className="text-[11px] font-semibold text-foreground">
                    승률 {winCount}/{filtered.length}
                  </span>
                </div>
              </>
            ) : (
              <>
                {winCount > 0 && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-profit/10 px-2.5 py-1.5">
                    <TrendingUp size={12} className="text-profit" />
                    <span className="text-[11px] font-semibold tabular-nums text-profit">
                      {formatGain(
                        filtered.filter(r => r.realizedGain >= 0).reduce((s, r) => s + r.realizedGain, 0),
                        tab === 'KR' ? 'KRW' : 'USD',
                      )}
                    </span>
                  </div>
                )}
                {lossCount > 0 && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-loss/10 px-2.5 py-1.5">
                    <TrendingDown size={12} className="text-loss" />
                    <span className="text-[11px] font-semibold tabular-nums text-loss">
                      {formatGain(
                        filtered.filter(r => r.realizedGain < 0).reduce((s, r) => s + r.realizedGain, 0),
                        tab === 'KR' ? 'KRW' : 'USD',
                      )}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5">
                  <span className="text-[11px] font-semibold text-foreground">
                    승률 {winCount}/{filtered.length}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* 포디엄 */}
          {tab === 'all' ? (
            <DualPodium
              krItems={sortedForPodium.kr}
              usItems={sortedForPodium.us}
            />
          ) : (
            <SinglePodium
              items={tab === 'KR' ? sortedForPodium.kr : sortedForPodium.us}
              currency={tab === 'KR' ? 'KRW' : 'USD'}
              label={tab === 'KR' ? '🏆 한국 주식 수익 TOP 3' : '🏆 미국 주식 수익 TOP 3'}
            />
          )}

          {/* 구분선 */}
          <div className="h-1.5 bg-border" />

          {/* 리스트 헤더 */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <span className="text-[13px] font-bold text-foreground">
              {tab === 'all' ? '전체 실현 내역' : tab === 'KR' ? '한국 주식 실현 내역' : '미국 주식 실현 내역'}
            </span>
            <div className="flex gap-1">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSort(opt.value)}
                  className={cn(
                    'rounded-md px-2 py-1 text-[10px] font-semibold transition-colors',
                    sort === opt.value
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 리스트 */}
          <div className="flex flex-col">
            {visibleList.map((item, idx) => (
              <RealizedListItem
                key={item.stockId}
                item={item}
                rank={idx + 1}
                showFlag={tab === 'all'}
                maxAbsGain={maxAbsGain}
              />
            ))}
          </div>

          {/* 더보기 */}
          {sortedList.length > 5 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="py-4 text-center text-[12px] font-semibold text-primary"
            >
              나머지 {sortedList.length - 5}건 더보기 ↓
            </button>
          )}

          <div className="h-6" />
        </>
      )}
    </div>
  )
}
