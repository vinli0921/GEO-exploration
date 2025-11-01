"use client"

import { useEffect, useState } from "react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Download, MoreHorizontal, Calendar as CalendarIcon, Eye } from "lucide-react"
import { ApiService, Session } from "@/lib/api"
import { formatDate, formatDuration, cn } from "@/lib/utils"
import { toast } from "sonner"
import { format } from "date-fns"

const ITEMS_PER_PAGE = 20

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set())
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})

  const loadSessions = async () => {
    setLoading(true)
    try {
      const params: any = {
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
      }

      if (statusFilter === "active") {
        params.is_active = true
      } else if (statusFilter === "complete") {
        params.is_complete = true
      }

      const data = await ApiService.getSessions(params)
      setSessions(data.sessions)
      setTotal(data.total)
    } catch (error) {
      console.error("Error loading sessions:", error)
      toast.error("Failed to load sessions")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSessions()
  }, [currentPage, statusFilter])

  const handleViewSession = async (sessionId: string) => {
    try {
      const session = await ApiService.getSession(sessionId)
      setSelectedSession(session)
      setDialogOpen(true)
    } catch (error) {
      console.error("Error loading session details:", error)
      toast.error("Failed to load session details")
    }
  }

  const handleDownloadSession = (sessionId: string) => {
    window.location.href = ApiService.getExportUrl(sessionId)
    toast.success("Download started")
  }

  const handleBulkDownload = () => {
    if (selectedSessions.size === 0) {
      toast.error("No sessions selected")
      return
    }
    toast.success(`Downloading ${selectedSessions.size} sessions...`)
    // Implement bulk download logic here
  }

  const toggleSessionSelection = (sessionId: string) => {
    const newSelection = new Set(selectedSessions)
    if (newSelection.has(sessionId)) {
      newSelection.delete(sessionId)
    } else {
      newSelection.add(sessionId)
    }
    setSelectedSessions(newSelection)
  }

  const toggleAllSessions = () => {
    if (selectedSessions.size === sessions.length) {
      setSelectedSessions(new Set())
    } else {
      setSelectedSessions(new Set(sessions.map((s) => s.session_id)))
    }
  }

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  return (
    <div className="p-8 space-y-6">
      <PageHeader title="All Sessions" description="Browse and manage all recorded sessions" />

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-4">
          <Input
            placeholder="Search by participant ID or session ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:max-w-md"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="complete">Complete Only</SelectItem>
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
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
        {selectedSessions.size > 0 && (
          <Button onClick={handleBulkDownload} variant="secondary">
            <Download className="mr-2 h-4 w-4" />
            Download {selectedSessions.size} sessions
          </Button>
        )}
      </div>

      {/* Sessions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedSessions.size === sessions.length && sessions.length > 0}
                    onCheckedChange={toggleAllSessions}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Session ID</TableHead>
                <TableHead>Participant</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[120px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[100px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[140px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[60px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[40px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[40px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-[60px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-[40px] ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    No sessions found
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((session) => (
                  <TableRow key={session.session_id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedSessions.has(session.session_id)}
                        onCheckedChange={() => toggleSessionSelection(session.session_id)}
                        aria-label={`Select session ${session.session_id}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">
                              {session.session_id.substring(0, 16)}...
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-mono text-xs">{session.session_id}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>{session.participant_id}</TableCell>
                    <TableCell className="text-xs">
                      {formatDate(session.started_at)}
                    </TableCell>
                    <TableCell>{formatDuration(session.duration_seconds)}</TableCell>
                    <TableCell>{session.total_events}</TableCell>
                    <TableCell>{session.total_pages}</TableCell>
                    <TableCell>
                      <Badge variant={session.is_complete ? "success" : "warning"}>
                        {session.is_complete ? "Complete" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleViewSession(session.session_id)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDownloadSession(session.session_id)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download JSON
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              navigator.clipboard.writeText(session.session_id)
                              toast.success("Session ID copied to clipboard")
                            }}
                          >
                            Copy Session ID
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="border-t p-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  })}
                  {totalPages > 5 && <PaginationEllipsis />}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Session Details</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Session ID</p>
                  <p className="text-sm font-mono mt-1">{selectedSession.session_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Participant</p>
                  <p className="text-sm mt-1">{selectedSession.participant_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Started</p>
                  <p className="text-sm mt-1">{formatDate(selectedSession.started_at)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ended</p>
                  <p className="text-sm mt-1">
                    {selectedSession.ended_at ? formatDate(selectedSession.ended_at) : "Still active"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Duration</p>
                  <p className="text-sm mt-1">{formatDuration(selectedSession.duration_seconds)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                  <p className="text-sm mt-1">{selectedSession.total_events}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Pages</p>
                  <p className="text-sm mt-1">{selectedSession.total_pages}</p>
                </div>
              </div>

              {selectedSession.event_summary && Object.keys(selectedSession.event_summary).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Event Summary</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedSession.event_summary).map(([type, count]) => (
                      <div key={type} className="flex justify-between border rounded-lg p-2">
                        <span className="text-sm">{type}</span>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
