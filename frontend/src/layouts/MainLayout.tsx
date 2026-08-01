import { Outlet } from 'react-router-dom'

import { AppNav } from '../components/AppNav'

export function MainLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-left dark:bg-slate-950">
      <AppNav />
      <Outlet />
    </div>
  )
}
