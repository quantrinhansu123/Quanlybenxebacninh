import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { chatApi } from '../api/chatApi'
import type { ChatMessage, ChatState } from '../types'

interface ChatStore extends ChatState {
  toggleChat: () => void
  openChat: () => void
  closeChat: () => void
  sendMessage: (content: string) => Promise<void>
  clearChat: () => Promise<void>
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      isOpen: false,
      messages: [],
      sessionId: null,
      isLoading: false,

      toggleChat: () => set(state => ({ isOpen: !state.isOpen })),
      openChat: () => set({ isOpen: true }),
      closeChat: () => set({ isOpen: false }),

      sendMessage: async (content: string) => {
        const { sessionId, messages } = get()

        // Add user message immediately
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          content,
          type: 'data',
          createdAt: new Date()
        }
        set({ messages: [...messages, userMessage], isLoading: true })

        try {
          const response = await chatApi.sendMessage(content, sessionId || undefined)

          // Add assistant message
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.response,
            type: response.type,
            metadata: response.metadata,
            createdAt: new Date()
          }

          set(state => ({
            messages: [...state.messages, assistantMessage],
            sessionId: response.sessionId,
            isLoading: false
          }))
        } catch (error) {
          console.error('Chat error:', error)
          
          // Add error message
          const errorMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.',
            type: 'error',
            createdAt: new Date()
          }
          set(state => ({
            messages: [...state.messages, errorMessage],
            isLoading: false
          }))
        }
      },

      clearChat: async () => {
        const { sessionId } = get()
        if (sessionId) {
          try {
            await chatApi.clearHistory(sessionId)
          } catch (error) {
            console.error('Failed to clear chat history:', error)
          }
        }
        set({ messages: [], sessionId: null })
      }
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        sessionId: state.sessionId,
        messages: state.messages.slice(-50) // Keep last 50 messages
      })
    }
  )
)
