const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'

export interface Session {
  session_id: string
  participant_id: string
  started_at: string
  ended_at?: string
  duration_seconds: number
  total_events: number
  total_pages: number
  is_complete: boolean
  event_summary?: Record<string, number>
}

export interface Stats {
  total_sessions: number
  complete_sessions: number
  active_sessions: number
  total_participants: number
  total_events: number
}

export interface SessionsResponse {
  sessions: Session[]
  total: number
}

export class ApiService {
  static async checkHealth(): Promise<{ status: string }> {
    const response = await fetch(`${API_BASE_URL}/health`)
    return response.json()
  }

  static async getStats(): Promise<Stats> {
    const response = await fetch(`${API_BASE_URL}/sessions/stats`)
    return response.json()
  }

  static async getSessions(params: {
    limit?: number
    offset?: number
    is_active?: boolean
    is_complete?: boolean
  } = {}): Promise<SessionsResponse> {
    const queryParams = new URLSearchParams()
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.offset) queryParams.append('offset', params.offset.toString())
    if (params.is_active !== undefined) queryParams.append('is_active', params.is_active.toString())
    if (params.is_complete !== undefined) queryParams.append('is_complete', params.is_complete.toString())

    const response = await fetch(`${API_BASE_URL}/sessions/list?${queryParams}`)
    return response.json()
  }

  static async getSession(sessionId: string): Promise<Session> {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`)
    return response.json()
  }

  static getExportUrl(sessionId: string): string {
    return `${API_BASE_URL}/sessions/${sessionId}/export`
  }
}
