import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarIcon, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { upsertStock, insertTrade, fetchAllStocks, fetchCategories } from '@/lib/queries'
import type { StockRow, CategoryOption } from '@/lib/queries'

type TradeType = 'buy' | 'sell'
type Market = 'US' | 'KR'

export function RecordPage() {
  const { user } = useAuth()
  const [tradeType, setTradeType]               = useState<TradeType>('buy')
  const [market, setMarket]                     = useState<Market>('US')
  const [date, setDate]                         = useState<Date>(new Date())
  const [calendarOpen, setCalendarOpen]         = useState(false)
  const [ticker, setTicker]                     = useState('')
  const [stockName, setStockName]               = useState('')
  const [quantity, setQuantity]                 = useState('')
  const [price, setPrice]                       = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption | null>(null)
  const [dbCategories, setDbCategories]         = useState<CategoryOption[]>([])
  const [memo, setMemo]                         = useState('')
  const [saving, setSaving]                     = useState(false)
  const [saveError, setSaveError]               = useState<string | null>(null)
  const [saved, setSaved]                       = useState(false)
  const [stockSheetOpen, setStockSheetOpen]     = useState(false)
  const [allStocks, setAllStocks]               = useState<StockRow[]>([])
  const [stocksLoading, setStocksLoading]       = useState(false)
  const [inputMode, setInputMode]               = useState<'select' | 'manual'>('select')

  useEffect(() => {
    fetchCategories(tradeType)
      .then(setDbCategories)
      .catch(console.error)
  }, [tradeType])

  const isBuy = tradeType === 'buy'

  const totalAmount =
    quantity && price
      ? (parseFloat(quantity) * parseFloat(price)).toLocaleString(
          market === 'KR' ? 'ko-KR' : 'en-US',
          { maximumFractionDigits: 2 }
        )
      : null

  const selectedStockData = allStocks.find(s => s.ticker === ticker)
  const maxSellQty = !isBuy && selectedStockData?.isHolding ? selectedStockData.netQty : undefined

  async function openStockSheet() {
    setStockSheetOpen(true)
    if (allStocks.length === 0) setStocksLoading(true)
    const stocks = await fetchAllStocks().catch(() => allStocks)
    setAllStocks(stocks)
    setStocksLoading(false)
  }

  function selectStock(stock: StockRow) {
    setTicker(stock.ticker)
    setStockName(stock.stockName)
    setQuantity('')
    setStockSheetOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!ticker.trim() || !stockName.trim()) {
      setSaveError('종목을 선택하거나 입력해 주세요')
      return
    }
    if (!isBuy && maxSellQty !== undefined && parseFloat(quantity) > maxSellQty) {
      setSaveError(`보유 수량(${maxSellQty}주)을 초과할 수 없습니다`)
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const stockId = await upsertStock(user.id, ticker, stockName, market as Market)
      await insertTrade({
        userId:    user.id,
        stockId,
        tradeDate: format(date, 'yyyy-MM-dd'),
        tradeType,
        quantity:  parseFloat(quantity),
        price:     parseFloat(price),
        currency:  market === 'US' ? 'USD' : 'KRW',
        categoryId: selectedCategory?.id ?? null,
        memo:      memo || null,
      })
      setSaved(true)
      handleReset()
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setTicker(''); setStockName(''); setQuantity(''); setPrice('')
    setSelectedCategory(null); setMemo(''); setDate(new Date())
    setInputMode('select')
    setAllStocks([])
  }

  return (
    <div className="flex flex-col pb-28">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-3">
        <h1 className="text-lg font-semibold">매매 기록</h1>
        <span className="text-xs text-muted-foreground">
          {format(date, 'yyyy.MM.dd (eee)', { locale: ko })}
        </span>
      </div>

      <form id="record-form" onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">

        {/* ── 매수/매도 토글 ── */}
        <div className="flex gap-1 rounded-2xl bg-muted p-1">
          {(['buy', 'sell'] as TradeType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTradeType(t)
                setSelectedCategory(null)
                setInputMode('select')
                setTicker('')
                setStockName('')
                setQuantity('')
              }}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-base font-bold whitespace-nowrap transition-all',
                tradeType === t && t === 'buy'  && 'bg-gradient-to-br from-buy to-buy/80 text-white shadow-md',
                tradeType === t && t === 'sell' && 'bg-gradient-to-br from-sell to-sell/80 text-white shadow-md',
                tradeType !== t && 'text-muted-foreground'
              )}
            >
              <span>{t === 'buy' ? '📈' : '📉'}</span>
              {t === 'buy' ? '매수' : '매도'}
            </button>
          ))}
        </div>

        {/* ── 날짜 + 시장 ── */}
        <div className="flex gap-2">
          <Sheet open={calendarOpen} onOpenChange={setCalendarOpen}>
            <SheetTrigger className="flex min-w-0 flex-1 items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5 text-sm">
              <span className="font-medium text-foreground">
                {format(date, 'M월 d일 (eee)', { locale: ko })}
              </span>
              <CalendarIcon size={14} className="text-muted-foreground" />
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl border-border bg-card pb-8">
              <SheetHeader>
                <SheetTitle className="text-foreground">날짜 선택</SheetTitle>
              </SheetHeader>
              <div className="flex justify-center pt-4">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => { if (d) { setDate(d); setCalendarOpen(false) } }}
                  disabled={(d) => d > new Date()}
                />
              </div>
            </SheetContent>
          </Sheet>

          {(['US', 'KR'] as Market[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMarket(m); setAllStocks([]) }}
              className={cn(
                'flex shrink-0 flex-col items-center justify-center rounded-xl border px-3 py-1.5 transition-all',
                market === m ? 'border-primary bg-primary/10' : 'border-border bg-card'
              )}
            >
              <span className="text-lg leading-tight">{m === 'US' ? '🇺🇸' : '🇰🇷'}</span>
              <span className={cn('text-[10px] font-semibold leading-tight', market === m ? 'text-primary' : 'text-muted-foreground')}>
                {m === 'US' ? '미국' : '한국'}
              </span>
            </button>
          ))}
        </div>

        {/* ── 종목 입력 ── */}
        {inputMode === 'select' ? (
          <button
            type="button"
            onClick={openStockSheet}
            className={cn(
              'flex w-full items-center gap-2 rounded-xl border-2 bg-card px-3 py-3 shadow-sm transition-colors text-left',
              ticker ? 'border-primary' : 'border-border'
            )}
          >
            {ticker ? (
              <>
                <span className="text-xs font-semibold text-muted-foreground shrink-0">티커</span>
                <span className="text-base font-bold tracking-widest text-foreground">{ticker}</span>
                <span className="flex-1 truncate text-sm text-muted-foreground">{stockName}</span>
                <X
                  size={14}
                  className="shrink-0 text-muted-foreground"
                  onClick={(e) => { e.stopPropagation(); setTicker(''); setStockName(''); setQuantity('') }}
                />
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-muted-foreground">
                  {isBuy ? '종목 선택 또는 신규 입력' : '보유 종목 선택'}
                </span>
                <ChevronDown size={14} className="text-muted-foreground" />
              </>
            )}
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setInputMode('select')}
              className="self-start text-xs text-primary underline"
            >
              ← 종목 목록에서 선택
            </button>
            <div className="flex gap-3">
              <div className={cn('flex items-center gap-2 rounded-xl border-2 bg-card px-3 py-2.5 shadow-sm', ticker ? 'border-primary' : 'border-border')}>
                <span className="text-xs font-semibold text-muted-foreground">티커</span>
                <Input
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  placeholder={market === 'US' ? 'AAPL' : '005930'}
                  required
                  className="w-24 border-none bg-transparent p-0 text-base font-bold tracking-widest shadow-none focus-visible:ring-0"
                />
              </div>
              <Input
                value={stockName}
                onChange={(e) => setStockName(e.target.value)}
                placeholder={market === 'US' ? 'Apple Inc.' : '삼성전자'}
                required
                className="flex-1 bg-card text-sm"
              />
            </div>
          </div>
        )}

        {/* ── 수량 / 가격 ── */}
        <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          {/* 수량 */}
          <div className="flex items-center gap-3">
            <span className="w-8 text-xs font-semibold text-muted-foreground">수량</span>
            <div className="flex flex-1 items-center gap-2 rounded-lg bg-muted px-3 py-2">
              <Input
                type="number"
                value={quantity}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  if (!isBuy && maxSellQty !== undefined && val > maxSellQty) {
                    setQuantity(String(maxSellQty))
                  } else {
                    setQuantity(e.target.value)
                  }
                }}
                placeholder="0"
                min="0"
                max={maxSellQty}
                step="any"
                required
                className="flex-1 border-none bg-transparent p-0 text-base font-bold tabular shadow-none focus-visible:ring-0"
              />
              <span className="text-xs text-muted-foreground">주</span>
            </div>
            {!isBuy && maxSellQty !== undefined && (
              <button
                type="button"
                onClick={() => setQuantity(String(maxSellQty))}
                className="shrink-0 rounded-lg bg-sell/10 px-2.5 py-1.5 text-xs font-semibold text-sell"
              >
                전량
              </button>
            )}
          </div>

          {/* 가격 */}
          <div className="flex items-center gap-3">
            <span className="w-8 text-xs font-semibold text-muted-foreground">가격</span>
            <div className="flex flex-1 items-center gap-2 rounded-lg bg-muted px-3 py-2">
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={market === 'US' ? '0.00' : '0'}
                min="0"
                step="any"
                required
                className="flex-1 border-none bg-transparent p-0 text-base font-bold tabular shadow-none focus-visible:ring-0"
              />
              <span className="text-xs text-muted-foreground">{market === 'US' ? '$' : '원'}</span>
            </div>
          </div>

          {totalAmount && (
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">
                총 {isBuy ? '매수' : '매도'}금액
              </span>
              <span className={cn('text-xl font-extrabold tabular', isBuy ? 'text-buy' : 'text-sell')}>
                {market === 'US' ? '$' : ''}{totalAmount}{market === 'KR' ? ' 원' : ''}
              </span>
            </div>
          )}
        </div>

        {/* ── 왜 거래했나요? ── */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isBuy ? '왜 매수했나요?' : '왜 매도했나요?'}
            </span>
            {selectedCategory && (
              <button type="button" onClick={() => setSelectedCategory(null)} className="text-xs text-muted-foreground underline">
                초기화
              </button>
            )}
          </div>
          {dbCategories.length === 0 ? (
            <p className="text-xs text-muted-foreground">카테고리가 없습니다</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {dbCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(selectedCategory?.id === cat.id ? null : cat)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all',
                    selectedCategory?.id === cat.id && isBuy  && 'border-buy bg-buy/10 text-buy',
                    selectedCategory?.id === cat.id && !isBuy && 'border-sell bg-sell/10 text-sell',
                    selectedCategory?.id !== cat.id && 'border-border bg-card text-foreground'
                  )}
                >
                  <span className={cn('text-xs', selectedCategory?.id === cat.id ? 'font-semibold' : 'font-medium')}>
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── 메모 ── */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">메모</span>
            <span className="text-xs text-muted-foreground">{memo.length}/300</span>
          </div>
          <Textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="매매 이유, 시장 상황, 느낀 점 등을 자유롭게 기록하세요"
            maxLength={300}
            rows={3}
            className="resize-none bg-card text-sm"
          />
        </div>

        {saveError && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{saveError}</p>
        )}

      </form>

      {/* ── 종목 선택 시트 ── */}
      <Sheet open={stockSheetOpen} onOpenChange={setStockSheetOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl border-border bg-card pb-8 overflow-y-auto"
          style={{ maxHeight: '70vh' }}
        >
          <SheetHeader>
            <SheetTitle className="text-foreground">
              {isBuy ? '종목 선택' : '보유 종목 선택'}
            </SheetTitle>
          </SheetHeader>

          {stocksLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-muted border-t-primary" />
            </div>
          ) : (
            <div className="mt-2 flex flex-col divide-y divide-border px-4">
              {(() => {
                const filtered = allStocks.filter(s => s.market === market)
                const list = isBuy ? filtered : filtered.filter(s => s.isHolding)
                if (list.length === 0) {
                  return (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      {isBuy
                        ? `${market === 'KR' ? '한국' : '미국'} 시장에 등록된 종목이 없습니다`
                        : `${market === 'KR' ? '한국' : '미국'} 시장에 보유 종목이 없습니다`}
                    </p>
                  )
                }
                return list.map(s => (
                  <button
                    key={s.stockId}
                    type="button"
                    onClick={() => selectStock(s)}
                    className="flex items-center gap-3 py-3 text-left"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{s.stockName}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.ticker} · {s.market === 'KR' ? '🇰🇷' : '🇺🇸'} ·{' '}
                        {s.isHolding
                          ? `🟢 보유 ${s.netQty % 1 === 0 ? s.netQty : s.netQty.toFixed(4)}주`
                          : '⚪ 과거 거래'}
                      </p>
                    </div>
                  </button>
                ))
              })()}

              {isBuy && (
                <button
                  type="button"
                  onClick={() => { setInputMode('manual'); setStockSheetOpen(false); setTicker(''); setStockName('') }}
                  className="flex items-center gap-3 py-3 text-left"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                    +
                  </div>
                  <span className="text-sm font-semibold text-primary">새 종목 직접 입력</span>
                </button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── 고정 하단 저장 바 ── */}
      <div className="fixed bottom-16 left-0 right-0 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        {saved && (
          <p className="mb-2 text-center text-xs font-semibold text-buy">✓ 저장되었습니다</p>
        )}
        <div className="flex items-center gap-3">
          {totalAmount ? (
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                총 {isBuy ? '매수' : '매도'}금액
              </div>
              <div className={cn('text-base font-extrabold tabular', isBuy ? 'text-buy' : 'text-sell')}>
                {market === 'US' ? '$' : ''}{totalAmount}{market === 'KR' ? ' 원' : ''}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 text-left text-xs text-muted-foreground underline"
            >
              초기화
            </button>
          )}
          <Button
            type="submit"
            form="record-form"
            disabled={saving}
            className={cn(
              'px-6 py-5 text-base font-bold',
              isBuy ? 'bg-buy hover:bg-buy/90' : 'bg-sell hover:bg-sell/90'
            )}
          >
            {saving ? '저장 중...' : `${isBuy ? '📈' : '📉'} ${isBuy ? '매수' : '매도'} 저장`}
          </Button>
        </div>
      </div>
    </div>
  )
}
