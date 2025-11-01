"use client"

import { useEffect, useState } from "react"
import { BarChart3, CheckCircle2, Zap, Users, Target, Clock, RefreshCw } from "lucide-react"
import { StatCard } from "@/components/stat-card"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ApiService, Session, Stats } from "@/lib/api"
import { formatDate, formatNumber } from "@/lib/utils"
import { toast } from "sonner"

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentSessions, setRecentSessions] = useState<Session[]>([])
  const [activeSessions, setActiveSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsData, recentData, activeData] = await Promise.all([
        ApiService.getStats(),
        ApiService.getSessions({ limit: 5 }),
        ApiService.getSessions({ is_active: true, limit: 5 }),
      ])

      setStats(statsData)
      setRecentSessions(recentData.sessions)
      setActiveSessions(activeData.sessions)
      toast.success("Data refreshed successfully")
    } catch (error) {
      console.error("Error loading overview data:", error)
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Study Overview"
        description="Real-time statistics and session monitoring"
      >
        <Button onClick={loadData} size="sm" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-4 w-4 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-7 w-[60px]" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Total Sessions"
              value={stats?.total_sessions ?? "-"}
              icon={BarChart3}
            />
            <StatCard
              title="Complete Sessions"
              value={stats?.complete_sessions ?? "-"}
              icon={CheckCircle2}
            />
            <StatCard
              title="Active Sessions"
              value={stats?.active_sessions ?? "-"}
              icon={Zap}
            />
            <StatCard
              title="Total Participants"
              value={stats?.total_participants ?? "-"}
              icon={Users}
            />
            <StatCard
              title="Total Events"
              value={stats ? formatNumber(stats.total_events) : "-"}
              icon={Target}
            />
            <StatCard
              title="Avg Session Duration"
              value="45 min"
              icon={Clock}
            />
          </>
        )}
      </div>

      {/* Recent and Active Sessions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between border-b pb-3">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[180px]" />
                        <Skeleton className="h-3 w-[250px]" />
                      </div>
                      <Skeleton className="h-8 w-[60px]" />
                    </div>
                  ))}
                </div>
              ) : recentSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent sessions</p>
              ) : (
                <TooltipProvider>
                  <div className="space-y-4">
                    {recentSessions.map((session) => (
                      <div
                        key={session.session_id}
                        className="flex items-center justify-between border-b pb-3 last:border-0"
                      >
                        <div className="space-y-1 flex-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-sm font-medium leading-none cursor-help">
                                {session.session_id.substring(0, 20)}...
                              </p>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-mono text-xs">{session.session_id}</p>
                            </TooltipContent>
                          </Tooltip>
                          <p className="text-xs text-muted-foreground">
                            {session.participant_id} • {formatDate(session.started_at)} • {session.total_events} events
                          </p>
                        </div>
                        <Button variant="secondary" size="sm">
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </TooltipProvider>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between border-b pb-3">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[140px]" />
                        <Skeleton className="h-3 w-[200px]" />
                      </div>
                      <Skeleton className="h-5 w-[50px] rounded-full" />
                    </div>
                  ))}
                </div>
              ) : activeSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active sessions</p>
              ) : (
                <div className="space-y-4">
                  {activeSessions.map((session) => (
                    <div
                      key={session.session_id}
                      className="flex items-center justify-between border-b pb-3 last:border-0"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {session.participant_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Started {formatDate(session.started_at)} • {session.total_events} events
                        </p>
                      </div>
                      <Badge variant="success">Active</Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
