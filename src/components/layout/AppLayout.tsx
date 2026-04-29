import { Outlet } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { BottomNav } from './BottomNav'
import { useAuth } from '@/hooks/useAuth'

export function AppLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* 상단 유저 바 */}
      <div className="flex items-center justify-between border-b border-border bg-background px-4 py-1.5">
        <span className="truncate text-xs text-muted-foreground max-w-[240px]">
          {user?.email ?? ''}
        </span>
        <button
          onClick={signOut}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut size={12} />
          로그아웃
        </button>
      </div>

      <main className="flex-1 overflow-y-auto pb-16">
        <div className="mx-auto max-w-lg">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
