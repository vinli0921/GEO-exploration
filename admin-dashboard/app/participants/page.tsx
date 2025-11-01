"use client"

import { useEffect, useState } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"
import { ApiService, Session } from "@/lib/api"
import { formatNumber } from "@/lib/utils"
import { Users, CheckCircle, Activity, TrendingUp } from "lucide-react"
import { toast } from "sonner"

interface Participant {
  id: string
  sessions: number
  events: number
  complete: number
  activeSessions: number
}

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    const loadParticipants = async () => {
      setLoading(true)
      try {
        const data = await ApiService.getSessions({ limit: 100 })

        // Group by participant
        const participantsMap: Record<string, Participant> = {}

        data.sessions.forEach((session: Session) => {
          if (!participantsMap[session.participant_id]) {
            participantsMap[session.participant_id] = {
              id: session.participant_id,
              sessions: 0,
              events: 0,
              complete: 0,
              activeSessions: 0,
            }
          }

          participantsMap[session.participant_id].sessions++
          participantsMap[session.participant_id].events += session.total_events
          if (session.is_complete) {
            participantsMap[session.participant_id].complete++
          } else {
            participantsMap[session.participant_id].activeSessions++
          }
        })

        setParticipants(Object.values(participantsMap))
      } catch (error) {
        console.error("Error loading participants:", error)
        toast.error("Failed to load participants")
      } finally {
        setLoading(false)
      }
    }

    loadParticipants()
  }, [])

  const filteredParticipants = participants.filter((p) => {
    const matchesSearch = p.id.toLowerCase().includes(searchQuery.toLowerCase())
    if (activeTab === "active") {
      return matchesSearch && p.activeSessions > 0
    } else if (activeTab === "complete") {
      return matchesSearch && p.complete > 0 && p.activeSessions === 0
    }
    return matchesSearch
  })

  const getCompletionRate = (participant: Participant) => {
    return participant.sessions > 0
      ? Math.round((participant.complete / participant.sessions) * 100)
      : 0
  }

  const getCompletionColor = (rate: number) => {
    if (rate >= 75) return "text-green-600"
    if (rate >= 50) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Participants"
        description="View aggregated participant data and statistics"
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-[60px]" />
            ) : (
              <div className="text-2xl font-bold">{participants.length}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Participants</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-[60px]" />
            ) : (
              <div className="text-2xl font-bold">
                {participants.filter((p) => p.activeSessions > 0).length}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Sessions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-[60px]" />
            ) : (
              <div className="text-2xl font-bold">
                {participants.reduce((sum, p) => sum + p.complete, 0)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-[60px]" />
            ) : (
              <div className="text-2xl font-bold">
                {participants.length > 0
                  ? Math.round(
                      participants.reduce((sum, p) => sum + getCompletionRate(p), 0) /
                        participants.length
                    )
                  : 0}
                %
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Input
        placeholder="Search participants..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-md"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Participants</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="complete">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-6">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between border-b pb-4">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-5 w-[140px]" />
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-2 w-full max-w-[300px]" />
                      </div>
                      <Skeleton className="h-8 w-[80px]" />
                    </div>
                  ))}
                </div>
              ) : filteredParticipants.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No participants found</p>
              ) : (
                <div className="space-y-6">
                  {filteredParticipants.map((participant) => {
                    const completionRate = getCompletionRate(participant)
                    return (
                      <HoverCard key={participant.id}>
                        <HoverCardTrigger asChild>
                          <div className="flex items-center justify-between border-b pb-4 last:border-0 hover:bg-accent/50 transition-colors rounded-lg p-3 cursor-pointer">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{participant.id}</p>
                                {participant.activeSessions > 0 && (
                                  <Badge variant="default" className="text-xs">
                                    Active
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {participant.sessions} sessions • {participant.complete} complete •{" "}
                                {formatNumber(participant.events)} events
                              </p>
                              <div className="flex items-center gap-3">
                                <Progress value={completionRate} className="flex-1 max-w-[300px]" />
                                <span className={`text-sm font-medium ${getCompletionColor(completionRate)}`}>
                                  {completionRate}%
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{participant.complete} completed</p>
                              <p className="text-xs text-muted-foreground">
                                {participant.activeSessions} active
                              </p>
                            </div>
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold">Participant Details</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">Total Sessions</p>
                                <p className="font-medium">{participant.sessions}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Completed</p>
                                <p className="font-medium">{participant.complete}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Active</p>
                                <p className="font-medium">{participant.activeSessions}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Total Events</p>
                                <p className="font-medium">{formatNumber(participant.events)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Completion Rate</p>
                                <p className={`font-medium ${getCompletionColor(completionRate)}`}>
                                  {completionRate}%
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Avg Events/Session</p>
                                <p className="font-medium">
                                  {Math.round(participant.events / participant.sessions)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
