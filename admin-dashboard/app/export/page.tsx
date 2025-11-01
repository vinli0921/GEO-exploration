"use client"

import { useState } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Download, FileJson, Database, Calendar as CalendarIcon, FileText, Table } from "lucide-react"
import { ApiService } from "@/lib/api"
import { toast } from "sonner"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export default function ExportPage() {
  const [exportFormat, setExportFormat] = useState("json")
  const [sessionId, setSessionId] = useState("")
  const [participantId, setParticipantId] = useState("")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [includeEvents, setIncludeEvents] = useState(true)
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [includeSummary, setIncludeSummary] = useState(true)

  const handleExport = async () => {
    if (!sessionId.trim() && !participantId.trim()) {
      toast.error("Please enter a session ID or participant ID")
      return
    }

    setIsExporting(true)
    setExportProgress(0)

    // Simulate export progress
    const progressInterval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 200)

    try {
      if (sessionId.trim()) {
        window.location.href = ApiService.getExportUrl(sessionId.trim())
        toast.success("Export started successfully!")
      } else {
        toast.info("Participant export feature coming soon!")
      }

      // Complete the progress
      setTimeout(() => {
        setExportProgress(100)
        setTimeout(() => {
          setIsExporting(false)
          setExportProgress(0)
        }, 1000)
      }, 1000)
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export data")
      clearInterval(progressInterval)
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  const handleExportAll = async () => {
    setIsExporting(true)
    setExportProgress(0)

    const progressInterval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 5
      })
    }, 300)

    setTimeout(() => {
      toast.info("Bulk export feature coming soon!")
      setExportProgress(100)
      setTimeout(() => {
        setIsExporting(false)
        setExportProgress(0)
      }, 1000)
    }, 2000)
  }

  const handleQuickExport = (type: string) => {
    toast.success(`Exporting ${type}...`)
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Export Data"
        description="Download session data for analysis"
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              Export Options
            </CardTitle>
            <CardDescription>
              Export individual sessions or filter by participant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="format">Export Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      <FileJson className="h-4 w-4" />
                      JSON
                    </div>
                  </SelectItem>
                  <SelectItem value="csv" disabled>
                    <div className="flex items-center gap-2">
                      <Table className="h-4 w-4" />
                      CSV (Coming Soon)
                    </div>
                  </SelectItem>
                  <SelectItem value="txt" disabled>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Text (Coming Soon)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="participant">Participant ID (optional)</Label>
              <Input
                id="participant"
                placeholder="Leave blank for all participants"
                value={participantId}
                onChange={(e) => setParticipantId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="session">Session ID (optional)</Label>
              <Input
                id="session"
                placeholder="Leave blank for all sessions"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Date Range (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
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

            <div className="space-y-3 pt-2">
              <Label>Include in Export</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="events"
                  checked={includeEvents}
                  onCheckedChange={(checked) => setIncludeEvents(checked as boolean)}
                />
                <label
                  htmlFor="events"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Event data
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="metadata"
                  checked={includeMetadata}
                  onCheckedChange={(checked) => setIncludeMetadata(checked as boolean)}
                />
                <label
                  htmlFor="metadata"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Session metadata
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="summary"
                  checked={includeSummary}
                  onCheckedChange={(checked) => setIncludeSummary(checked as boolean)}
                />
                <label
                  htmlFor="summary"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Event summary
                </label>
              </div>
            </div>

            {isExporting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Exporting...</span>
                  <span className="font-medium">{exportProgress}%</span>
                </div>
                <Progress value={exportProgress} />
              </div>
            )}

            <Button onClick={handleExport} className="w-full" disabled={isExporting}>
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Exporting..." : "Export Data"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Bulk Export
              </CardTitle>
              <CardDescription>
                Export all session data for all participants
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Download a complete export of all session data in the database. This may take a few moments depending on the amount of data.
              </p>

              {isExporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Processing...</span>
                    <span className="font-medium">{exportProgress}%</span>
                  </div>
                  <Progress value={exportProgress} />
                </div>
              )}

              <Button onClick={handleExportAll} variant="secondary" className="w-full" disabled={isExporting}>
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? "Exporting..." : "Export All Data"}
              </Button>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> Bulk exports include all sessions, events, and participant data. Make sure you have sufficient storage space before proceeding.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Export</CardTitle>
              <CardDescription>Common export presets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleQuickExport("recent sessions")}
              >
                <FileJson className="mr-2 h-4 w-4" />
                Recent Sessions (Last 7 days)
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleQuickExport("completed sessions")}
              >
                <FileJson className="mr-2 h-4 w-4" />
                Completed Sessions Only
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleQuickExport("active sessions")}
              >
                <FileJson className="mr-2 h-4 w-4" />
                Active Sessions Only
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
