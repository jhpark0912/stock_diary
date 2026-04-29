import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type CurrencyThresholds = [number, number]
export type CalendarThresholds = { krw: CurrencyThresholds; usd: CurrencyThresholds }

export const DEFAULT_THRESHOLDS: CalendarThresholds = {
  krw: [1_000, 2_000],
  usd: [10_000, 20_000],
}

const STORAGE_KEY = 'calendar-thresholds'
const META_KEY = 'calendarThresholds'

function isValid(v: unknown): v is CalendarThresholds {
  if (!v || typeof v !== 'object') return false
  const t = v as CalendarThresholds
  return (
    Array.isArray(t.krw) && t.krw.length === 2 &&
    Array.isArray(t.usd) && t.usd.length === 2
  )
}

function loadLocal(): CalendarThresholds {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_THRESHOLDS
    const parsed = JSON.parse(raw)
    return isValid(parsed) ? parsed : DEFAULT_THRESHOLDS
  } catch {
    return DEFAULT_THRESHOLDS
  }
}

function saveLocal(t: CalendarThresholds) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t))
}

export function useCalendarSettings() {
  const [thresholds, setThresholdsState] = useState<CalendarThresholds>(loadLocal)
  const [syncing, setSyncing] = useState(false)

  // 앱 시작 시 Supabase user_metadata에서 최신값 동기화
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const remote = user?.user_metadata?.[META_KEY]
      if (isValid(remote)) {
        setThresholdsState(remote)
        saveLocal(remote)
      }
    })
  }, [])

  const setThresholds = useCallback(async (next: CalendarThresholds) => {
    // 1. 즉시 상태 + 로컬 반영 (UI 지연 없음)
    setThresholdsState(next)
    saveLocal(next)

    // 2. 백그라운드로 Supabase 동기화
    setSyncing(true)
    try {
      await supabase.auth.updateUser({ data: { [META_KEY]: next } })
    } catch {
      // 동기화 실패해도 로컬에는 저장됨 — 다음 setThresholds 때 재시도
    } finally {
      setSyncing(false)
    }
  }, [])

  return { thresholds, setThresholds, syncing }
}
