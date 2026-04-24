"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, FileText, Users, BarChart3, Download, MousePointerClick, MessageSquare, Filter, TrendingUp, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { ApiService } from "@/lib/api"

const chromeExtNav = [
  { title: "Overview",     href: "/",             icon: LayoutDashboard },
  { title: "Sessions",     href: "/sessions",     icon: FileText },
  { title: "Participants", href: "/participants", icon: Users },
  { title: "Analytics",    href: "/analytics",    icon: BarChart3 },
  { title: "Export Data",  href: "/export",       icon: Download },
]

const adsNav = [
  { title: "Overview",      href: "/ads",               icon: TrendingUp },
  { title: "Funnel & CTR",  href: "/ads/funnel",        icon: Filter },
  { title: "Dwell Time",    href: "/ads/dwell",         icon: MousePointerClick },
  { title: "Engagement",    href: "/ads/engagement",    icon: Eye },
  { title: "Events",        href: "/ads/events",        icon: FileText },
  { title: "Conversations", href: "/ads/conversations", icon: MessageSquare },
]

export function Sidebar() {
  const pathname = usePathname()
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const data = await ApiService.checkHealth()
        setServerStatus(data.status === 'healthy' ? 'online' : 'offline')
      } catch { setServerStatus('offline') }
    }
    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  if (pathname === '/login') return null

  const allHrefs = [...chromeExtNav, ...adsNav].map(i => i.href)
  const isSectionRoot = (href: string) =>
    href === '/' || allHrefs.some(h => h !== href && h.startsWith(href + '/'))

  const renderLink = (item: { title: string; href: string; icon: any }, iconAccent: string) => {
    const Icon = item.icon
    const isActive = isSectionRoot(item.href)
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + '/')
    return (
      <Link key={item.href} href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent",
          isActive
            ? "bg-gradient-to-r from-primary/10 to-purple-600/10 text-primary border-l-2 border-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className={cn("h-5 w-5", !isActive && iconAccent)} />
        <span>{item.title}</span>
      </Link>
    )
  }

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Research Dashboard
          </h1>
          <p className="text-xs text-muted-foreground">BITLab</p>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="rounded-lg border border-indigo-200/60 bg-indigo-50/40 p-2 dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-indigo-800 dark:text-indigo-400">Chrome Study</p>
          <div className="space-y-1">{chromeExtNav.map(item => renderLink(item, "text-indigo-700 dark:text-indigo-400"))}</div>
        </div>
        <div className="rounded-lg border border-fuchsia-200/60 bg-fuchsia-50/40 p-2 dark:border-fuchsia-900/40 dark:bg-fuchsia-950/20">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-fuchsia-600 dark:text-fuchsia-300">Chat Ads Study</p>
          <div className="space-y-1">{adsNav.map(item => renderLink(item, "text-fuchsia-500 dark:text-fuchsia-300"))}</div>
        </div>
      </nav>

      <div className="border-t p-4">
        <div className="flex items-center gap-2 text-sm">
          <div className={cn(
            "h-2 w-2 rounded-full",
            serverStatus === 'online'   && "bg-green-500 animate-pulse",
            serverStatus === 'offline'  && "bg-red-500",
            serverStatus === 'checking' && "bg-gray-400",
          )} />
          <span className="text-muted-foreground">
            {serverStatus === 'online'   && "Chrome-ext server online"}
            {serverStatus === 'offline'  && "Chrome-ext server offline"}
            {serverStatus === 'checking' && "Connecting…"}
          </span>
        </div>
      </div>
    </div>
  )
}
