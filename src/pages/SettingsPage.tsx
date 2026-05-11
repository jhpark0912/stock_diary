import { useState, useEffect } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useCalendarSettings, DEFAULT_THRESHOLDS } from '@/hooks/useCalendarSettings'
import type { CurrencyThresholds } from '@/hooks/useCalendarSettings'
import {
  fetchAllCategories,
  insertCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  countTradesByCategory,
  fetchAllStocks,
  updateStockMarket,
  deleteStock,
  countTradesByStock,
} from '@/lib/queries'
import type { CategoryRow, StockRow } from '@/lib/queries'
import type { Market } from '@/types/database'

type Tab = 'account' | 'trade' | 'display'

function parseNumber(s: string): number {
  return parseInt(s.replace(/[^\d]/g, ''), 10) || 0
}

function formatManwon(val: number) {
  if (val >= 10_000) return `${(val / 10_000).toLocaleString('ko-KR')}억원`
  return `${val.toLocaleString('ko-KR')}만원`
}

function formatUsdThreshold(val: number) {
  if (val >= 10_000) return `$${(val / 10_000).toFixed(0)}만`
  return `$${val.toLocaleString('en-US')}`
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('account')

  return (
    <div className="flex flex-col">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 border-b border-border bg-background px-5 py-3">
        <h1 className="text-lg font-semibold text-foreground">설정</h1>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex border-b border-border px-5">
        {([
          { key: 'account', label: '계정' },
          { key: 'trade', label: '거래' },
          { key: 'display', label: '화면' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex flex-col gap-4 p-5">
        {activeTab === 'account' && <AccountTab />}
        {activeTab === 'trade' && <TradeTab />}
        {activeTab === 'display' && <DisplayTab />}
      </div>
    </div>
  )
}

// ─── 계정 탭 ─────────────────────────────────────────────────────────────────

function AccountTab() {
  const { user, signOut } = useAuth()
  const { setTheme, isDark } = useTheme()

  return (
    <>
      {/* 프로필 */}
      <section className="card-shadow rounded-2xl bg-card p-5">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">프로필</h2>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-foreground">이메일</span>
          <span className="text-xs text-muted-foreground">{user?.email ?? '-'}</span>
        </div>
      </section>

      {/* 테마 */}
      <section className="card-shadow rounded-2xl bg-card p-5">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">테마</h2>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-foreground">다크 모드</span>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`relative h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors ${
              isDark ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                isDark ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* 로그아웃 */}
      <button
        onClick={signOut}
        className="rounded-xl border border-destructive py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
      >
        로그아웃
      </button>
    </>
  )
}

// ─── 거래 탭 ─────────────────────────────────────────────────────────────────

function TradeTab() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [addMode, setAddMode] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'buy' | 'sell' | 'both'>('buy')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState<'buy' | 'sell' | 'both'>('buy')

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      const data = await fetchAllCategories()
      setCategories(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    if (!newName.trim() || !user) return
    const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0
    await insertCategory(user.id, newName.trim(), newType, maxOrder + 1)
    setNewName('')
    setNewType('buy')
    setAddMode(false)
    await loadCategories()
  }

  async function handleDelete(id: string) {
    const count = await countTradesByCategory(id)
    if (count > 0) {
      alert(`이 카테고리를 사용 중인 거래가 ${count}건 있어 삭제할 수 없습니다.`)
      return
    }
    if (!confirm('이 카테고리를 삭제하시겠습니까?')) return
    await deleteCategory(id)
    await loadCategories()
  }

  async function handleEdit(id: string) {
    if (!editName.trim()) return
    await updateCategory(id, { name: editName.trim(), type: editType })
    setEditId(null)
    await loadCategories()
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return
    const newList = [...categories]
    ;[newList[index - 1], newList[index]] = [newList[index], newList[index - 1]]
    const reordered = newList.map((c, i) => ({ id: c.id, sort_order: i }))
    setCategories(newList.map((c, i) => ({ ...c, sort_order: i })))
    await reorderCategories(reordered)
  }

  async function handleMoveDown(index: number) {
    if (index === categories.length - 1) return
    const newList = [...categories]
    ;[newList[index], newList[index + 1]] = [newList[index + 1], newList[index]]
    const reordered = newList.map((c, i) => ({ id: c.id, sort_order: i }))
    setCategories(newList.map((c, i) => ({ ...c, sort_order: i })))
    await reorderCategories(reordered)
  }

  const typeBadge = (type: string) => {
    const styles = {
      buy: 'bg-primary/10 text-primary',
      sell: 'bg-destructive/10 text-destructive',
      both: 'bg-blue-500/10 text-blue-600',
    }
    const labels = { buy: '매수', sell: '매도', both: '매수/매도' }
    return (
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[type as keyof typeof styles]}`}>
        {labels[type as keyof typeof labels]}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }

  return (
    <>
    <section className="card-shadow rounded-2xl bg-card p-5">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">카테고리 관리</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        매매 기록 시 분류할 카테고리를 관리합니다. 순서 변경, 추가, 삭제가 가능합니다.
      </p>

      {/* 카테고리 목록 */}
      <div className="flex flex-col">
        {categories.map((cat, index) => (
          <div key={cat.id} className="flex items-center gap-2 border-b border-border/50 py-2.5 last:border-0">
            {/* 순서 변경 버튼 */}
            <div className="flex flex-col">
              <button
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                className="text-muted-foreground disabled:opacity-30 hover:text-foreground text-xs"
              >
                ▲
              </button>
              <button
                onClick={() => handleMoveDown(index)}
                disabled={index === categories.length - 1}
                className="text-muted-foreground disabled:opacity-30 hover:text-foreground text-xs"
              >
                ▼
              </button>
            </div>

            {editId === cat.id ? (
              /* 편집 모드 */
              <div className="flex flex-1 items-center gap-2">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-input px-2 py-1 text-sm outline-none focus:border-primary"
                  autoFocus
                />
                <select
                  value={editType}
                  onChange={e => setEditType(e.target.value as 'buy' | 'sell' | 'both')}
                  className="rounded-lg border border-border bg-input px-2 py-1 text-xs outline-none"
                >
                  <option value="buy">매수</option>
                  <option value="sell">매도</option>
                  <option value="both">매수/매도</option>
                </select>
                <button
                  onClick={() => handleEdit(cat.id)}
                  className="rounded-lg bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground"
                >
                  저장
                </button>
                <button
                  onClick={() => setEditId(null)}
                  className="text-xs text-muted-foreground"
                >
                  취소
                </button>
              </div>
            ) : (
              /* 일반 모드 */
              <>
                <span className="flex-1 text-sm text-foreground">{cat.name}</span>
                {typeBadge(cat.type)}
                <button
                  onClick={() => { setEditId(cat.id); setEditName(cat.name); setEditType(cat.type) }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  편집
                </button>
                {!cat.is_default && (
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* 추가 폼 */}
      {addMode ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-3">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="카테고리명"
            className="flex-1 rounded-lg border border-border bg-input px-2 py-1.5 text-sm outline-none focus:border-primary"
            autoFocus
          />
          <select
            value={newType}
            onChange={e => setNewType(e.target.value as 'buy' | 'sell' | 'both')}
            className="rounded-lg border border-border bg-input px-2 py-1 text-xs outline-none"
          >
            <option value="buy">매수</option>
            <option value="sell">매도</option>
            <option value="both">매수/매도</option>
          </select>
          <button
            onClick={handleAdd}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            추가
          </button>
          <button
            onClick={() => setAddMode(false)}
            className="text-xs text-muted-foreground"
          >
            취소
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAddMode(true)}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-primary hover:bg-primary/5"
        >
          <Plus size={14} />
          카테고리 추가
        </button>
      )}
    </section>
    <StockManagement />
    </>
  )
}

// ─── 종목 관리 ───────────────────────────────────────────────────────────────

type StockFilter = 'all' | 'us' | 'kospi' | 'kosdaq'

function StockManagement() {
  const [stocks, setStocks] = useState<StockRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StockFilter>('all')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmMarket, setConfirmMarket] = useState<{ id: string; name: string; from: Market; to: Market } | null>(null)

  useEffect(() => { loadStocks() }, [])

  async function loadStocks() {
    try {
      const all = await fetchAllStocks()
      setStocks(all)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = stocks.filter(s => {
    if (filter === 'us') return s.market === 'US'
    if (filter === 'kospi') return s.market === 'KR'
    if (filter === 'kosdaq') return s.market === 'KR_KQ'
    return true
  })

  const usCount = stocks.filter(s => s.market === 'US').length
  const kospiCount = stocks.filter(s => s.market === 'KR').length
  const kosdaqCount = stocks.filter(s => s.market === 'KR_KQ').length

  async function handleMarketChange(stock: StockRow, newMarket: Market) {
    if (stock.market === newMarket) return
    setConfirmMarket({ id: stock.stockId, name: stock.stockName, from: stock.market, to: newMarket })
  }

  async function executeMarketChange() {
    if (!confirmMarket) return
    try {
      await updateStockMarket(confirmMarket.id, confirmMarket.to)
      await loadStocks()
    } catch (e) {
      alert(e instanceof Error ? e.message : '시장 변경 실패')
    } finally {
      setConfirmMarket(null)
    }
  }

  async function handleDelete(stock: StockRow) {
    if (stock.isHolding && stock.netQty > 0) {
      alert(`보유 중인 종목(${stock.netQty}주)은 삭제할 수 없습니다.`)
      return
    }
    setConfirmDelete(stock.stockId)
  }

  async function executeDelete() {
    if (!confirmDelete) return
    try {
      const count = await countTradesByStock(confirmDelete)
      if (count > 0) {
        alert(`이 종목에 ${count}건의 매매 기록이 있어 삭제할 수 없습니다.`)
        return
      }
      await deleteStock(confirmDelete)
      await loadStocks()
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패')
    } finally {
      setConfirmDelete(null)
    }
  }

  if (loading) {
    return (
      <section className="card-shadow rounded-2xl bg-card p-5">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">종목 관리</h2>
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="card-shadow rounded-2xl bg-card p-5">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">종목 관리</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          등록된 종목을 관리합니다. 한국 종목은 시장(코스피/코스닥) 변경이 가능합니다.
        </p>

        {stocks.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">등록된 종목이 없습니다.</p>
        ) : (
          <>
            {/* 필터 */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {([
                { key: 'all' as const, label: `전체 (${stocks.length})` },
                { key: 'us' as const, label: `미국 (${usCount})` },
                { key: 'kospi' as const, label: `코스피 (${kospiCount})` },
                { key: 'kosdaq' as const, label: `코스닥 (${kosdaqCount})` },
              ]).map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-2xl px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                    filter === f.key
                      ? 'bg-foreground text-background'
                      : 'border border-border bg-transparent text-muted-foreground'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* 종목 목록 */}
            <div className="flex flex-col gap-2">
              {filtered.map(s => (
                <div key={s.stockId} className="flex items-center gap-2.5 rounded-xl bg-muted/30 px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{s.stockName}</p>
                    <p className="text-[11px] text-muted-foreground" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {s.ticker}
                      {s.isHolding && s.netQty > 0 && (
                        <span className="ml-1.5 text-primary">
                          {s.netQty % 1 === 0 ? s.netQty : s.netQty.toFixed(4)}주 보유
                        </span>
                      )}
                    </p>
                  </div>
                  {s.market === 'US' ? (
                    <span className="rounded-lg border border-muted-foreground/20 px-2 py-1 text-[11px] font-bold text-muted-foreground">
                      미국
                    </span>
                  ) : (
                    <select
                      value={s.market}
                      onChange={e => handleMarketChange(s, e.target.value as Market)}
                      className={`rounded-lg border px-2 py-1 text-[11px] font-bold outline-none appearance-none bg-card cursor-pointer ${
                        s.market === 'KR'
                          ? 'border-primary/30 text-primary'
                          : 'border-blue-400/30 text-blue-500'
                      }`}
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23999' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 6px center',
                        paddingRight: '22px',
                      }}
                    >
                      <option value="KR">코스피</option>
                      <option value="KR_KQ">코스닥</option>
                    </select>
                  )}
                  <button
                    onClick={() => handleDelete(s)}
                    className={`${
                      s.isHolding && s.netQty > 0
                        ? 'text-muted-foreground/30 cursor-not-allowed'
                        : 'text-muted-foreground hover:text-destructive'
                    }`}
                    disabled={s.isHolding && s.netQty > 0}
                    title={s.isHolding && s.netQty > 0 ? '보유 중인 종목은 삭제할 수 없습니다' : '종목 삭제'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* 시장 변경 확인 다이얼로그 */}
      {confirmMarket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmMarket(null)}>
          <div className="mx-4 w-full max-w-xs rounded-2xl bg-card p-6 text-center shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="mb-2 text-base font-bold text-foreground">시장 변경</h3>
            <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">{confirmMarket.name}</strong>의 시장을
              <br />
              <span className={confirmMarket.from === 'KR' ? 'font-semibold text-primary' : 'font-semibold text-blue-500'}>
                {confirmMarket.from === 'KR' ? '코스피' : '코스닥'}
              </span>
              {' → '}
              <span className={confirmMarket.to === 'KR' ? 'font-semibold text-primary' : 'font-semibold text-blue-500'}>
                {confirmMarket.to === 'KR' ? '코스피' : '코스닥'}
              </span>
              (으)로 변경합니다.
              <br /><br />
              시세 조회 기준이 변경됩니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmMarket(null)}
                className="flex-1 rounded-xl bg-muted py-2.5 text-sm font-semibold text-muted-foreground"
              >
                취소
              </button>
              <button
                onClick={executeMarketChange}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
              >
                변경
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmDelete(null)}>
          <div className="mx-4 w-full max-w-xs rounded-2xl bg-card p-6 text-center shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="mb-2 text-base font-bold text-foreground">종목 삭제</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              이 종목을 삭제하시겠습니까?<br />매매 기록이 있으면 삭제할 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-xl bg-muted py-2.5 text-sm font-semibold text-muted-foreground"
              >
                취소
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── 화면 탭 ─────────────────────────────────────────────────────────────────

function DisplayTab() {
  const { thresholds, setThresholds, syncing } = useCalendarSettings()

  const [draftKrw, setDraftKrw] = useState<[string, string]>([
    thresholds.krw[0].toLocaleString('ko-KR'),
    thresholds.krw[1].toLocaleString('ko-KR'),
  ])
  const [draftUsd, setDraftUsd] = useState<[string, string]>([
    thresholds.usd[0].toLocaleString('en-US'),
    thresholds.usd[1].toLocaleString('en-US'),
  ])
  const [saved, setSaved] = useState(false)

  async function handleApply() {
    const krw = (draftKrw.map(parseNumber) as [number, number]).sort((a, b) => a - b) as CurrencyThresholds
    const usd = (draftUsd.map(parseNumber) as [number, number]).sort((a, b) => a - b) as CurrencyThresholds
    if (krw[0] <= 0 || usd[0] <= 0) return
    await setThresholds({ krw, usd })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleReset() {
    await setThresholds(DEFAULT_THRESHOLDS)
    setDraftKrw([
      DEFAULT_THRESHOLDS.krw[0].toLocaleString('ko-KR'),
      DEFAULT_THRESHOLDS.krw[1].toLocaleString('ko-KR'),
    ])
    setDraftUsd([
      DEFAULT_THRESHOLDS.usd[0].toLocaleString('en-US'),
      DEFAULT_THRESHOLDS.usd[1].toLocaleString('en-US'),
    ])
  }

  return (
    <section className="card-shadow rounded-2xl bg-card p-5">
      <h2 className="mb-1 text-sm font-semibold text-foreground">캘린더 색상 채도 기준</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        매수/매도 금액에 따라 캘린더 날짜 배경 채도를 3단계로 구분합니다.
      </p>

      {/* 컬러 프리뷰 */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-4 w-6 rounded-sm" style={{ backgroundColor: 'rgba(26,107,60,0.08)' }} />
          <span className="text-[10px] text-muted-foreground">옅게</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-4 w-6 rounded-sm" style={{ backgroundColor: 'rgba(26,107,60,0.16)' }} />
          <span className="text-[10px] text-muted-foreground">중간</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-4 w-6 rounded-sm" style={{ backgroundColor: 'rgba(26,107,60,0.30)' }} />
          <span className="text-[10px] text-muted-foreground">진하게</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-4 w-6 rounded-sm" style={{ backgroundColor: 'rgba(217,79,61,0.16)' }} />
          <span className="text-[10px] text-muted-foreground">매도</span>
        </div>
      </div>

      {/* 입력 그리드 */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        <div />
        <p className="text-center text-[11px] font-semibold text-muted-foreground">2단계 이상</p>
        <p className="text-center text-[11px] font-semibold text-muted-foreground">3단계 이상</p>
      </div>

      <div className="mb-3 grid grid-cols-3 items-center gap-2">
        <p className="text-xs font-semibold text-foreground">🇰🇷 만원</p>
        {draftKrw.map((v, i) => (
          <input
            key={i} type="text" inputMode="numeric" value={v}
            onChange={e => {
              const next = [...draftKrw] as [string, string]
              next[i] = e.target.value; setDraftKrw(next)
            }}
            className="w-full rounded-lg border border-border bg-input px-2 py-1.5 text-center text-sm font-medium text-foreground outline-none focus:border-primary"
          />
        ))}
      </div>

      <div className="mb-4 grid grid-cols-3 items-center gap-2">
        <p className="text-xs font-semibold text-foreground">🇺🇸 달러</p>
        {draftUsd.map((v, i) => (
          <input
            key={i} type="text" inputMode="numeric" value={v}
            onChange={e => {
              const next = [...draftUsd] as [string, string]
              next[i] = e.target.value; setDraftUsd(next)
            }}
            className="w-full rounded-lg border border-border bg-input px-2 py-1.5 text-center text-sm font-medium text-foreground outline-none focus:border-primary"
          />
        ))}
      </div>

      {/* 현재 적용값 */}
      <p className="mb-4 text-[11px] text-muted-foreground">
        현재 적용: KRW {thresholds.krw.map(formatManwon).join(' / ')} &nbsp;·&nbsp;
        USD {thresholds.usd.map(formatUsdThreshold).join(' / ')}
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={handleReset}
          disabled={syncing}
          className="flex-1 rounded-xl border border-border py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          기본값
        </button>
        <button
          onClick={handleApply}
          disabled={syncing}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-70"
        >
          {syncing
            ? <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" /> 동기화 중</>
            : saved
            ? <><Check size={14} /> 저장됨</>
            : '적용'
          }
        </button>
      </div>
    </section>
  )
}
