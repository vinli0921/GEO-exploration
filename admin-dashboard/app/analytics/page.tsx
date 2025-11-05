"use client"

import { useEffect, useState } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart3, TrendingUp, PieChart as PieChartIcon, Calendar as CalendarIcon, Activity } from "lucide-react"
import { ApiService, Session, AnalyticsData } from "@/lib/api"
import { toast } from "sonner"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Bar, BarChart, Line, LineChart, Pie, PieChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Cell } from "recharts"

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"]

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [sessionsData, analyticsData] = await Promise.all([
          ApiService.getSessions({ limit: 100 }),
          ApiService.getAnalytics(),
        ])
        setSessions(sessionsData.sessions)
        setAnalytics(analyticsData)
      } catch (error) {
        console.error("Error loading analytics data:", error)
        toast.error("Failed to load analytics data")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Calculate event type distribution
  const eventDistribution = () => {
    if (!analytics?.event_distribution) return []
    return analytics.event_distribution.map((item) => ({
      name: item.event_type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      value: item.count,
    }))
  }

  // Calculate sessions over time
  const sessionsOverTime = () => {
    const dateCounts: Record<string, number> = {}
    sessions.forEach((session) => {
      const date = new Date(session.started_at).toLocaleDateString()
      dateCounts[date] = (dateCounts[date] || 0) + 1
    })
    return Object.entries(dateCounts)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, count]) => ({ date, sessions: count }))
  }

  // Calculate completion status
  const completionStatus = () => {
    const complete = sessions.filter((s) => s.is_complete).length
    const active = sessions.length - complete
    return [
      { name: "Complete", value: complete },
      { name: "Active", value: active },
    ]
  }

  // Calculate events per session
  const eventsPerSession = () => {
    return sessions
      .slice(0, 20)
      .map((session, index) => ({
        session: `Session ${index + 1}`,
        events: session.total_events,
        pages: session.total_pages,
      }))
  }

  const chartConfig = {
    events: {
      label: "Events",
      color: "hsl(var(--chart-1))",
    },
    pages: {
      label: "Pages",
      color: "hsl(var(--chart-2))",
    },
    sessions: {
      label: "Sessions",
      color: "hsl(var(--chart-3))",
    },
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Analytics"
          description="Event distribution and behavior patterns"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Filter by date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={dateRange.from}
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Event Analysis</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Session Status
                </CardTitle>
                <CardDescription>Distribution of complete vs active sessions</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Skeleton className="h-[250px] w-[250px] rounded-full" />
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={completionStatus()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {completionStatus().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Event Type Distribution
                </CardTitle>
                <CardDescription>Total events by type across all sessions</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Skeleton className="h-full w-full" />
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={eventDistribution()}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Events and Pages per Session
              </CardTitle>
              <CardDescription>Comparing events and pages across recent sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={eventsPerSession()}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="session" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="events" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="pages" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Sessions Over Time
              </CardTitle>
              <CardDescription>Number of sessions started per day</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sessionsOverTime()}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="sessions"
                        stroke="hsl(var(--chart-3))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--chart-3))", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6 mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Key performance indicators for your study</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Avg Events/Session</p>
                    <p className="text-2xl font-bold">
                      {sessions.length > 0
                        ? Math.round(
                            sessions.reduce((sum, s) => sum + s.total_events, 0) / sessions.length
                          )
                        : 0}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Avg Pages/Session</p>
                    <p className="text-2xl font-bold">
                      {sessions.length > 0
                        ? Math.round(
                            sessions.reduce((sum, s) => sum + s.total_pages, 0) / sessions.length
                          )
                        : 0}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                    <p className="text-2xl font-bold">
                      {sessions.length > 0
                        ? Math.round(
                            (sessions.filter((s) => s.is_complete).length / sessions.length) * 100
                          )
                        : 0}
                      %
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
