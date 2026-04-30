import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

type ErrorKind = 'cross-browser' | 'expired' | 'unknown'

function classifyError(message: string): ErrorKind {
  const msg = message.toLowerCase()
  if (msg.includes('code verifier') || msg.includes('pkce') || msg.includes('invalid') ) {
    return 'cross-browser'
  }
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
      return () => subscription.unsubscribe()
    }
  }, [navigate])

  if (errorKind) {
    const isCrossBrowser = errorKind === 'cross-browser'

    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-5 bg-background px-6 text-center">
        <div className="text-4xl">{isCrossBrowser ? '🔗' : '⚠️'}</div>

        <div className="max-w-xs">
          {isCrossBrowser ? (
            <>
              <p className="font-semibold text-foreground">다른 브라우저에서 링크를 여셨나요?</p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                보안 정책상 로그인을 요청한 브라우저에서만 링크가 동작합니다.
                <br /><br />
                대신 <strong>이메일에 있는 6자리 코드</strong>를 로그인 화면에 직접 입력하면
                어떤 브라우저에서도 로그인할 수 있습니다.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-foreground">링크가 만료되었거나 유효하지 않습니다</p>
              <p className="mt-2 text-sm text-muted-foreground">
                링크는 발송 후 1시간 동안만 유효합니다. 새로 요청해 주세요.
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

        {process.env.NODE_ENV === 'development' && errorDetail && (
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
