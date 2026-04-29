import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Step = 'input' | 'sent'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [step, setStep]   = useState<Step>('input')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

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

  async function handleResend() {
    setStep('input')
    setError(null)
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
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-3xl">
              ✉️
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">이메일을 확인하세요</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{email}</span>
                <br />로 로그인 링크를 보냈습니다.
              </p>
            </div>
            <div className="mt-2 w-full rounded-xl bg-muted px-4 py-3 text-left text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">링크가 안 왔나요?</p>
              <ul className="mt-1 list-disc pl-4 leading-relaxed">
                <li>스팸 폴더를 확인해 주세요</li>
                <li>링크는 1시간 후 만료됩니다</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={handleResend}
              className="text-sm text-muted-foreground underline underline-offset-2"
            >
              이메일 다시 입력하기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
