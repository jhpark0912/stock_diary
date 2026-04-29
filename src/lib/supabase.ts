import { createClient } from '@supabase/supabase-js'
import { get, set, del } from 'idb-keyval'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.')
}

// iOS PWA에서 localStorage가 초기화되는 문제를 방지하기 위해 IndexedDB 사용
const idbStorage = {
  getItem: (key: string) => get<string>(key).then((v) => v ?? null),
  setItem: (key: string, value: string) => set(key, value),
  removeItem: (key: string) => del(key),
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: idbStorage,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
