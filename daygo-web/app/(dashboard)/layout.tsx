'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuthStore } from '@/lib/auth-store'
import { supabase } from '@/lib/supabase'
import { Calendar, BarChart3, Target, User, FileText, BookOpen, Dumbbell, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { FeedbackButton } from '@/components/FeedbackButton'

const navItems = [
  { href: '/today', label: 'Today', icon: Calendar },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/workouts', label: 'Workouts', icon: Dumbbell },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/profile', label: 'Profile', icon: User },
]

const sidebarItems = [
  ...navItems.slice(0, 4),
  { href: '/books', label: 'Books Read', icon: BookOpen },
  navItems[4], // Profile last
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, initialized } = useAuthStore()
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true'
    }
    return false
  })

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }

  useEffect(() => {
    if (initialized && !user) {
      router.replace('/login')
    }
  }, [user, initialized, router])

  // Check onboarding status
  useEffect(() => {
    async function checkOnboarding() {
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single() as { data: { onboarding_completed: boolean } | null }

      if (profile && !profile.onboarding_completed) {
        router.replace('/onboarding')
      } else {
        setOnboardingChecked(true)
      }
    }

    if (initialized && user) {
      checkOnboarding()
    }
  }, [user, initialized, router])

  if (!initialized || !user || !onboardingChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-accent"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex fixed top-0 left-0 h-screen flex-col bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50 z-40 transition-all duration-300 ${sidebarCollapsed ? 'w-[4.5rem]' : 'w-56'}`}>
        {/* Logo */}
        <div className={`flex items-center gap-2.5 py-5 ${sidebarCollapsed ? 'justify-center px-2' : 'px-5'}`}>
          <Image
            src="/logo.png"
            alt="DayGo"
            width={32}
            height={32}
            className="rounded-lg flex-shrink-0"
          />
          {!sidebarCollapsed && (
            <span className="font-heading font-bold text-lg text-bevel-text dark:text-white whitespace-nowrap">DayGo</span>
          )}
        </div>

        {/* Nav Items */}
        <nav className={`flex-1 py-2 space-y-1 ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                title={sidebarCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all ${sidebarCollapsed ? 'justify-center px-2' : 'px-3'} ${
                  isActive
                    ? 'bg-accent/10 text-accent dark:bg-accent/20'
                    : 'text-bevel-text-secondary dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-bevel-text dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Feedback at bottom of sidebar */}
        {!sidebarCollapsed && (
          <div className="px-3 pb-2">
            <FeedbackButton />
          </div>
        )}

        {/* Collapse Toggle */}
        <div className={`pb-4 ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center w-full py-2 rounded-xl text-bevel-text-secondary dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-bevel-text dark:hover:text-slate-200 transition-all"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronsRight className="w-5 h-5" /> : <ChevronsLeft className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* Mobile Logo */}
      <div className="fixed top-4 left-4 z-40 md:hidden">
        <Image
          src="/logo.png"
          alt="DayGo"
          width={36}
          height={36}
          className="rounded-lg"
        />
      </div>

      {/* Mobile Feedback Button */}
      <div className="md:hidden">
        <FeedbackButton />
      </div>

      {/* Main Content */}
      <main className={`flex-1 pb-20 md:pb-0 overflow-x-hidden transition-all duration-300 ${sidebarCollapsed ? 'md:ml-[4.5rem]' : 'md:ml-56'}`}>
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 pb-4 px-4 z-40">
        <div className="max-w-lg mx-auto bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/20 dark:border-slate-700/50">
          <div className="flex justify-around">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center py-3 px-4 transition-all ${
                    isActive ? 'text-accent' : 'text-bevel-text-secondary dark:text-slate-400 hover:text-bevel-text dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs mt-1.5 font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}
