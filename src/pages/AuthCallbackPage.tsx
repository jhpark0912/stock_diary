import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

type ErrorKind = 'expired' | 'unknown'

function classifyError(message: string): ErrorKind {
  const msg = message.toLowerCase()
  if (msg.includes('expired') || msg.includes('만료')) {
    return 'expired'
  }
  return 'unknown'
}

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')

    if (code) {
      // PKCE 플로우: code → session 교환
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setErrorKind(classifyError(error.message))
          setErrorDetail(error.message)
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

      // code도 hash도 없이 직접 접근한 경우 무한 스피너 방지
      const fallback = setTimeout(() => navigate('/login', { replace: true }), 5000)

      return () => {
        subscription.unsubscribe()
        clearTimeout(fallback)
      }
    }
  }, [navigate])

  if (errorKind) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-5 bg-background px-6 text-center">
        <div className="text-4xl">⚠️</div>

        <div className="max-w-xs">
          {errorKind === 'expired' ? (
            <>
              <p className="font-semibold text-foreground">인증이 만료되었습니다</p>
              <p className="mt-2 text-sm text-muted-foreground">
                다시 로그인해 주세요.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-foreground">로그인 중 오류가 발생했습니다</p>
              <p className="mt-2 text-sm text-muted-foreground">
                다시 시도해 주세요.
              </p>
            </>
          )}
        </div>

        <button
          onClick={() => navigate('/login', { replace: true })}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          로그인 페이지로 돌아가기
        </button>

        {import.meta.env.DEV && errorDetail && (
          <p className="text-xs text-muted-foreground opacity-50">{errorDetail}</p>
        )}
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
