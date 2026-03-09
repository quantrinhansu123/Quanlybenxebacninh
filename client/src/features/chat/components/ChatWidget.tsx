import { useEffect, useRef } from 'react'
import { MessageCircle, X, Trash2, Loader2, Bus, Headphones } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '../store/chatStore'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'

export function ChatWidget() {
  const {
    isOpen,
    messages,
    isLoading,
    toggleChat,
    sendMessage,
    clearChat
  } = useChatStore()

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        toggleChat()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, toggleChat])

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 w-[380px] h-[520px] bg-white rounded-2xl shadow-2xl shadow-stone-300/40 flex flex-col z-40 border border-stone-200/50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-stone-800 text-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-sm tracking-tight">Hỗ trợ trực tuyến</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-[10px] text-stone-400">Sẵn sàng hỗ trợ</span>
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => clearChat()}
                className="hover:bg-white/20 text-white h-8 w-8 rounded-lg"
                title="Xóa lịch sử chat"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleChat}
                className="hover:bg-white/20 text-white h-8 w-8 rounded-lg"
                title="Đóng (Esc)"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-stone-50">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-stone-500 text-sm p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-stone-800 flex items-center justify-center mb-4">
                  <Bus className="w-7 h-7 text-emerald-400" />
                </div>
                <p className="font-semibold text-stone-800 mb-1">Xin chào!</p>
                <p className="text-xs text-stone-500 mb-6">
                  Hỏi về xe, tài xế, tuyến đường, phù hiệu...
                </p>
                <div className="text-left text-xs bg-white p-4 rounded-xl border border-stone-200 w-full">
                  <p className="font-medium mb-3 text-stone-600 uppercase tracking-wide text-[10px]">
                    Gợi ý tìm kiếm
                  </p>
                  <ul className="space-y-2.5 text-stone-600">
                    <li className="flex items-center gap-2 hover:text-emerald-600 cursor-pointer transition-colors">
                      <span className="w-1 h-1 bg-stone-300 rounded-full" />
                      xe 98H07480
                    </li>
                    <li className="flex items-center gap-2 hover:text-emerald-600 cursor-pointer transition-colors">
                      <span className="w-1 h-1 bg-stone-300 rounded-full" />
                      đơn vị Phương Trang
                    </li>
                    <li className="flex items-center gap-2 hover:text-emerald-600 cursor-pointer transition-colors">
                      <span className="w-1 h-1 bg-stone-300 rounded-full" />
                      thống kê điều độ
                    </li>
                    <li className="flex items-center gap-2 hover:text-emerald-600 cursor-pointer transition-colors">
                      <span className="w-1 h-1 bg-stone-300 rounded-full" />
                      tuyến TP.HCM - Đà Lạt
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}
                {isLoading && (
                  <div className="flex gap-3 p-4">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                    </div>
                    <div className="bg-white rounded-2xl px-4 py-2.5 text-sm text-stone-500 border border-stone-100">
                      Đang xử lý...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <ChatInput onSend={sendMessage} disabled={isLoading} />
        </div>
      )}

      {/* Toggle Button */}
      <Button
        onClick={toggleChat}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-2xl shadow-xl z-40 transition-all duration-300 ${
          isOpen
            ? 'bg-stone-600 hover:bg-stone-500 shadow-stone-400/30'
            : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/40'
        }`}
        size="icon"
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <MessageCircle className="w-5 h-5" />
        )}
      </Button>
    </>
  )
}
