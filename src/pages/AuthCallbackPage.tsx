import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')

    if (code) {
      // PKCE 플로우: code → session 교환
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setError(error.message)
        } else {
          navigate('/', { replace: true })
        }
      })
    } else {
      // Implicit 플로우: onAuthStateChange가 hash 자동 처리
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          navigate('/', { replace: true })
        } else if (event === 'SIGNED_OUT') {
          navigate('/login', { replace: true })
        }
      })
      return () => subscription.unsubscribe()
    }
  }, [navigate])

  if (error) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="text-3xl">⚠️</div>
        <div>
          <p className="font-semibold text-foreground">링크가 만료되었습니다</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
        <button
          onClick={() => navigate('/login', { replace: true })}
          className="text-sm text-primary underline underline-offset-2"
        >
          다시 로그인하기
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">로그인 중...</p>
      </div>
    </div>
  )
}
