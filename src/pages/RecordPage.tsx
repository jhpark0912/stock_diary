import { useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { upsertStock, findCategoryId, insertTrade } from '@/lib/queries'

type TradeType = 'buy' | 'sell'
type Market = 'US' | 'KR'

const BUY_CATEGORIES = [
  { label: '실적 기대',    emoji: '📈' },
  { label: '기술적 분석',  emoji: '📊' },
  { label: '산업/섹터 성장', emoji: '🌱' },
  { label: '저평가 판단',  emoji: '💰' },
  { label: '뉴스/이벤트', emoji: '📰' },
  { label: '배당 목적',   emoji: '💵' },
  { label: 'FOMO',       emoji: '😰' },
]

const SELL_CATEGORIES = [
  { label: '목표가 도달',  emoji: '🎯' },
  { label: '손절',        emoji: '✂️' },
  { label: '리스크 회피', emoji: '🛡️' },
  { label: '자금 필요',   emoji: '💸' },
  { label: '실적 실망',   emoji: '😞' },
  { label: '뉴스/이벤트', emoji: '📰' },
  { label: '공포 매도',   emoji: '😱' },
  { label: '리밸런싱',    emoji: '⚖️' },
]

export function RecordPage() {
  const { user } = useAuth()
  const [tradeType, setTradeType]           = useState<TradeType>('buy')
  const [market, setMarket]                 = useState<Market>('US')
  const [date, setDate]                     = useState<Date>(new Date())
  const [calendarOpen, setCalendarOpen]     = useState(false)
  const [ticker, setTicker]                 = useState('')
  const [stockName, setStockName]           = useState('')
  const [quantity, setQuantity]             = useState('')
  const [price, setPrice]                   = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [memo, setMemo]                     = useState('')
  const [saving, setSaving]                 = useState(false)
  const [saveError, setSaveError]           = useState<string | null>(null)
  const [saved, setSaved]                   = useState(false)

  const isBuy      = tradeType === 'buy'
  const categories = isBuy ? BUY_CATEGORIES : SELL_CATEGORIES

  const totalAmount =
    quantity && price
      ? (parseFloat(quantity) * parseFloat(price)).toLocaleString(
          market === 'KR' ? 'ko-KR' : 'en-US',
          { maximumFractionDigits: 2 }
        )
      : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setSaveError(null)
    try {
      const stockId = await upsertStock(user.id, ticker, stockName, market as Market)
      const categoryId = selectedCategory
        ? await findCategoryId(selectedCategory, tradeType)
        : null
      await insertTrade({
        userId:    user.id,
        stockId,
        tradeDate: format(date, 'yyyy-MM-dd'),
        tradeType,
        quantity:  parseFloat(quantity),
        price:     parseFloat(price),
        currency:  market === 'US' ? 'USD' : 'KRW',
        categoryId,
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

        {/* ── A: 매수/매도 토글 (gradient) ── */}
        <div className="flex gap-1 rounded-2xl bg-muted p-1">
          {(['buy', 'sell'] as TradeType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTradeType(t); setSelectedCategory(null) }}
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
              onClick={() => setMarket(m)}
              className={cn(
                'flex shrink-0 flex-col items-center justify-center rounded-xl border px-3 py-1.5 transition-all',
                market === m
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card'
              )}
            >
              <span className="text-lg leading-tight">{m === 'US' ? '🇺🇸' : '🇰🇷'}</span>
              <span className={cn('text-[10px] font-semibold leading-tight', market === m ? 'text-primary' : 'text-muted-foreground')}>
                {m === 'US' ? '미국' : '한국'}
              </span>
            </button>
          ))}
        </div>

        {/* ── A: 종목 입력 (티커 + 종목명) ── */}
        <div className="flex gap-3">
          <div
            className={cn(
              'flex items-center gap-2 rounded-xl border-2 bg-card px-3 py-2.5 shadow-sm transition-colors',
              ticker ? 'border-primary' : 'border-border'
            )}
          >
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

        {/* ── A: 인라인 계산기 ── */}
        <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          {[
            { label: '수량', value: quantity, setter: setQuantity, unit: '주',    placeholder: '0' },
            { label: '가격', value: price,    setter: setPrice,    unit: market === 'US' ? '$' : '원', placeholder: market === 'US' ? '0.00' : '0' },
          ].map(({ label, value, setter, unit, placeholder }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-8 text-xs font-semibold text-muted-foreground">{label}</span>
              <div className="flex flex-1 items-center gap-2 rounded-lg bg-muted px-3 py-2">
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={placeholder}
                  min="0"
                  step="any"
                  required
                  className="flex-1 border-none bg-transparent p-0 text-base font-bold tabular shadow-none focus-visible:ring-0"
                />
                <span className="text-xs text-muted-foreground">{unit}</span>
              </div>
            </div>
          ))}

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

        {/* ── B: 왜 거래했나요? — emoji 2열 카드 ── */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isBuy ? '왜 매수했나요?' : '왜 매도했나요?'}
            </span>
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="text-xs text-muted-foreground underline"
              >
                초기화
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {categories.map(({ label, emoji }) => (
              <button
                key={label}
                type="button"
                onClick={() => setSelectedCategory(label === selectedCategory ? null : label)}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all',
                  selectedCategory === label && isBuy  && 'border-buy bg-buy/10 text-buy',
                  selectedCategory === label && !isBuy && 'border-sell bg-sell/10 text-sell',
                  selectedCategory !== label && 'border-border bg-card text-foreground'
                )}
              >
                <span className="text-base">{emoji}</span>
                <span className={cn('text-xs', selectedCategory === label ? 'font-semibold' : 'font-medium')}>
                  {label}
                </span>
              </button>
            ))}
          </div>
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
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {saveError}
          </p>
        )}

      </form>

      {/* ── 고정 하단 저장 바 ── */}
      <div className="fixed bottom-16 left-0 right-0 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        {saved && (
          <p className="mb-2 text-center text-xs font-semibold text-buy">
            ✓ 저장되었습니다
          </p>
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
