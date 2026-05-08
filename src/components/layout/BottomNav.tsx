import { NavLink } from 'react-router-dom'
import { Home, Calendar, PlusCircle, BarChart2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: Home, label: '홈' },
  { to: '/calendar', icon: Calendar, label: '캘린더' },
  { to: '/record', icon: PlusCircle, label: '기록하기' },
  { to: '/report', icon: BarChart2, label: '리포트' },
  { to: '/settings', icon: Settings, label: '설정' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={22}
                  className={cn(isActive && 'drop-shadow-[0_0_8px_var(--highlight)]')}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
