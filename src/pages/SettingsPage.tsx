import { useState } from 'react'
import { Check } from 'lucide-react'
import { useCalendarSettings, DEFAULT_THRESHOLDS } from '@/hooks/useCalendarSettings'
import type { CurrencyThresholds } from '@/hooks/useCalendarSettings'

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
    <div className="flex flex-col">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 border-b border-border bg-background px-5 py-3">
        <h1 className="text-lg font-semibold text-foreground">설정</h1>
      </div>

      <div className="flex flex-col gap-4 p-5">
        {/* 캘린더 채도 기준 섹션 */}
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
      </div>
    </div>
  )
}
