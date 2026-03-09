export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  type: 'data' | 'ai' | 'error'
  metadata?: {
    queryType?: string
    processingTime?: number
    resultCount?: number
    hasContext?: boolean
  }
  createdAt: Date
}

export interface ChatState {
  isOpen: boolean
  messages: ChatMessage[]
  sessionId: string | null
  isLoading: boolean
}

export interface SendMessageResponse {
  response: string
  type: 'data' | 'ai' | 'error'
  sessionId: string
  metadata?: {
    queryType?: string
    processingTime?: number
    resultCount?: number
    hasContext?: boolean
  }
}
