"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, FileText, Users, BarChart3, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { useEffect, useState } from "react"
import { ApiService } from "@/lib/api"

const navItems = [
  {
    title: "Overview",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Sessions",
    href: "/sessions",
    icon: FileText,
  },
  {
    title: "Participants",
    href: "/participants",
    icon: Users,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Export Data",
    href: "/export",
    icon: Download,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const data = await ApiService.checkHealth()
        setServerStatus(data.status === 'healthy' ? 'online' : 'offline')
      } catch (error) {
        setServerStatus('offline')
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-xs text-muted-foreground">LLM Search Behavior Study</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent",
                isActive
                  ? "bg-gradient-to-r from-primary/10 to-purple-600/10 text-primary border-l-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-4">
        <div className="flex items-center gap-2 text-sm">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              serverStatus === 'online' && "bg-green-500 animate-pulse",
              serverStatus === 'offline' && "bg-red-500",
              serverStatus === 'checking' && "bg-gray-400"
            )}
          />
          <span className="text-muted-foreground">
            {serverStatus === 'online' && "Server Online"}
            {serverStatus === 'offline' && "Server Offline"}
            {serverStatus === 'checking' && "Connecting..."}
          </span>
        </div>
      </div>
    </div>
  )
}
