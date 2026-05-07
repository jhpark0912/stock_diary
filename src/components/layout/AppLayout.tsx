import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <main className="flex-1 overflow-y-auto pb-16">
        <div className="mx-auto max-w-lg">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
