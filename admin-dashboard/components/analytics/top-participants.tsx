"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, User, Target } from "lucide-react"

interface TopParticipantsProps {
  data: Array<{
    participant_id: string
    session_count: number
    total_events: number
  }>
}

export function TopParticipants({ data }: TopParticipantsProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Participants</CardTitle>
          <CardDescription>Most active participants by session count</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No participant data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Participants</CardTitle>
        <CardDescription>Most active participants by session count</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((participant, index) => (
            <div
              key={participant.participant_id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                  {index === 0 && <Trophy className="w-4 h-4" />}
                  {index === 1 && <Trophy className="w-4 h-4 text-muted-foreground" />}
                  {index === 2 && <Trophy className="w-4 h-4 text-muted-foreground/70" />}
                  {index > 2 && <User className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{participant.participant_id}</p>
                  <p className="text-xs text-muted-foreground">
                    {participant.session_count} session{participant.session_count !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Target className="w-3 h-3" />
                  {participant.total_events} events
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
