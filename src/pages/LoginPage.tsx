import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Step = 'input' | 'sent'

export function LoginPage() {
  const navigate    = useNavigate()
  const [email, setEmail]   = useState('')
  const [otp, setOtp]       = useState('')
  const [step, setStep]     = useState<Step>('input')
  const [loading, setLoading]   = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [otpError, setOtpError] = useState<string | null>(null)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setStep('sent')
    }
  }

  // 이메일에 포함된 6자리 코드를 이 브라우저에서 직접 입력해 인증
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()

    setVerifying(true)
    setOtpError(null)

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: 'email',
    })

    setVerifying(false)

    if (error) {
      setOtpError('코드가 올바르지 않거나 만료되었습니다.')
    } else {
      navigate('/', { replace: true })
    }
  }

  function handleResend() {
    setStep('input')
    setOtp('')
    setError(null)
    setOtpError(null)
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6">
      {/* 앱 아이디 영역 */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-3xl shadow-lg">
          📖
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            주식 매매 일지
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            내 투자를 기록하는 따뜻한 공간
          </p>
        </div>
      </div>

      {/* 로그인 카드 */}
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        {step === 'input' ? (
          <>
            <h2 className="mb-1 text-lg font-bold text-foreground">로그인</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              이메일로 로그인 링크를 보내드립니다.
              <br />비밀번호가 필요 없어요.
            </p>

            <form onSubmit={handleSend} className="flex flex-col gap-3">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoFocus
                className="bg-input text-base"
              />

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full py-5 text-base font-bold',
                  'bg-primary hover:bg-primary/90'
                )}
              >
                {loading ? '전송 중...' : '✉️ 로그인 링크 받기'}
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              처음 이용 시 계정이 자동으로 만들어집니다.
            </p>
          </>
        ) : (
          /* 전송 완료 상태 */
          <div className="flex flex-col gap-5 py-2">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-3xl">
                ✉️
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">이메일을 확인하세요</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{email}</span>
                  <br />로 로그인 링크와 인증 코드를 보냈습니다.
                </p>
              </div>
            </div>

            {/* 방법 1: 링크 클릭 안내 */}
            <div className="rounded-xl bg-muted px-4 py-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">방법 1 — 링크 클릭</p>
              <p className="mt-1 leading-relaxed">
                이메일의 <strong>로그인 링크</strong>를 이 브라우저에서 열면 자동으로 로그인됩니다.
                <br />
                <span className="text-amber-500 dark:text-amber-400">
                  다른 브라우저(앱)에서 열면 로그인이 유지되지 않을 수 있습니다.
                </span>
              </p>
            </div>

            {/* 방법 2: 코드 직접 입력 */}
            <div>
              <p className="mb-2 text-xs font-semibold text-foreground">
                방법 2 — 인증 코드 직접 입력
              </p>
              <p className="mb-3 text-xs text-muted-foreground leading-relaxed">
                이메일에 있는 <strong>6자리 숫자 코드</strong>를 아래에 입력하세요.
                어떤 브라우저에서 이메일을 열어도 이 창에서 바로 로그인할 수 있습니다.
              </p>
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="bg-input text-center text-xl font-bold tracking-widest"
                />
                {otpError && (
                  <p className="text-xs text-destructive">{otpError}</p>
                )}
                <Button
                  type="submit"
                  disabled={verifying || otp.length !== 6}
                  variant="outline"
                  className="w-full"
                >
                  {verifying ? '확인 중...' : '코드로 로그인'}
                </Button>
              </form>
            </div>

            <div className="border-t border-border pt-1 text-center">
              <p className="mb-2 text-xs text-muted-foreground">
                링크·코드는 1시간 후 만료됩니다. 스팸 폴더도 확인해 주세요.
              </p>
              <button
                type="button"
                onClick={handleResend}
                className="text-sm text-muted-foreground underline underline-offset-2"
              >
                이메일 다시 입력하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
