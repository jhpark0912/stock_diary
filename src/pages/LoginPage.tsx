import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Step = 'input' | 'sent'

export function LoginPage() {
  const navigate       = useNavigate()
  const codeInputRef   = useRef<HTMLInputElement>(null)

  const [email, setEmail]     = useState('')
  const [otp, setOtp]         = useState('')
  const [step, setStep]       = useState<Step>('input')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [otpError, setOtpError]   = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  // 코드로 직접 로그인
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !otp.trim()) return

    setVerifying(true)
    setOtpError(null)

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: 'email',
    })

    setVerifying(false)

    if (error) {
      setOtpError('코드가 유효하지 않거나 만료되었습니다. 새 코드를 받아보세요.')
    } else {
      navigate('/', { replace: true })
    }
  }

  // 코드가 없을 때 이메일 전송
  async function handleSend() {
    if (!email.trim()) return

    setSending(true)
    setSendError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setSending(false)

    if (error) {
      setSendError(error.message)
    } else {
      setStep('sent')
      setTimeout(() => codeInputRef.current?.focus(), 100)
    }
  }

  function handleResend() {
    setOtp('')
    setOtpError(null)
    handleSend()
  }

  const canVerify = email.trim().length > 0 && otp.trim().length > 0

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
        <h2 className="mb-1 text-lg font-bold text-foreground">로그인</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          비밀번호 없이 인증 코드로 로그인합니다.
        </p>

        {/* 이메일 전송 완료 배너 */}
        {step === 'sent' && (
          <div className="mb-4 rounded-xl bg-primary/10 px-4 py-3 text-xs text-foreground">
            <span className="font-semibold">{email}</span>로 인증 코드를 보냈습니다.
            <br />이메일을 확인하고 아래에 코드를 입력하세요.
          </div>
        )}

        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
          <Input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setStep('input') }}
            placeholder="your@email.com"
            required
            autoFocus={step === 'input'}
            disabled={sending}
            className="bg-input text-base"
          />

          <Input
            ref={codeInputRef}
            type="text"
            inputMode="numeric"
            maxLength={8}
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.replace(/\D/g, ''))
              setOtpError(null)
            }}
            placeholder="인증 코드 입력"
            disabled={sending}
            className="bg-input text-center text-xl font-bold tracking-widest"
          />

          {otpError && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {otpError}
              <button
                type="button"
                onClick={handleResend}
                disabled={sending}
                className="ml-2 underline underline-offset-2"
              >
                {sending ? '전송 중...' : '새 코드 받기'}
              </button>
            </div>
          )}

          {sendError && (
            <p className="text-xs text-destructive">{sendError}</p>
          )}

          {/* 코드 있을 때: 로그인 버튼 */}
          {canVerify && (
            <Button
              type="submit"
              disabled={verifying}
              className={cn('w-full py-5 text-base font-bold', 'bg-primary hover:bg-primary/90')}
            >
              {verifying ? '확인 중...' : '코드로 로그인'}
            </Button>
          )}
        </form>

        {/* 코드 없을 때: 이메일 전송 버튼 */}
        <Button
          type="button"
          onClick={handleSend}
          disabled={sending || !email.trim()}
          variant={canVerify ? 'outline' : 'default'}
          className={cn(
            'mt-3 w-full py-5 text-base font-bold',
            !canVerify && 'bg-primary hover:bg-primary/90'
          )}
        >
          {sending ? '전송 중...' : step === 'sent' ? '✉️ 코드 다시 받기' : '✉️ 인증 코드 이메일로 받기'}
        </Button>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          처음 이용 시 계정이 자동으로 만들어집니다.
        </p>
      </div>
    </div>
  )
}
