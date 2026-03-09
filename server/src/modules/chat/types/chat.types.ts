export type QueryType =
  | 'VEHICLE_LOOKUP'
  | 'DRIVER_SEARCH'
  | 'ROUTE_INFO'
  | 'SCHEDULE_QUERY'
  | 'DISPATCH_STATS'
  | 'BADGE_LOOKUP'
  | 'OPERATOR_INFO'
  | 'GENERAL_QUESTION'
  | 'AI_FUNCTION_CALLING'

export interface ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  type: 'data_query' | 'ai_response' | 'error'
  metadata?: {
    queryType?: QueryType
    dataSource?: string
    processingTime?: number
    resultCount?: number
  }
  createdAt: string
}

export interface IntentResult {
  type: QueryType
  confidence: number
  extractedParams: Record<string, string>
}

export interface QueryResult {
  success: boolean
  data?: any
  error?: string
  source: string
}

export interface ChatRequest {
  message: string
  sessionId?: string
}

export interface ChatResponse {
  response: string
  type: 'data' | 'ai' | 'error'
  sessionId: string
  metadata?: {
    queryType?: QueryType
    processingTime?: number
    resultCount?: number
    hasContext?: boolean
  }
}
