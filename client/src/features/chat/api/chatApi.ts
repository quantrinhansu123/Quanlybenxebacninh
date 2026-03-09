import api from '@/lib/api'
import type { SendMessageResponse } from '../types'

export const chatApi = {
  sendMessage: async (
    message: string,
    sessionId?: string
  ): Promise<SendMessageResponse> => {
    const response = await api.post<SendMessageResponse>('/chat/message', {
      message,
      sessionId
    })
    return response.data
  },

  clearHistory: async (sessionId: string): Promise<void> => {
    await api.delete(`/chat/history/${sessionId}`)
  }
}
