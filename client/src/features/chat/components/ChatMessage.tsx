import { cn } from '@/lib/utils'
import type { ChatMessage as ChatMessageType } from '../types'
import { Bus, User } from 'lucide-react'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn(
      'flex gap-3 p-4',
      isUser ? 'flex-row-reverse' : ''
    )}>
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
        isUser
          ? 'bg-stone-800'
          : 'bg-gradient-to-br from-emerald-100 to-teal-100'
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bus className="w-4 h-4 text-emerald-600" />
        )}
      </div>

      {/* Message Bubble */}
      <div className={cn(
        'max-w-[80%] rounded-2xl px-4 py-3',
        isUser
          ? 'bg-stone-800 text-white'
          : 'bg-white text-stone-800 border border-stone-100 shadow-sm',
        message.type === 'error' && 'bg-red-50 text-red-700 border-red-100'
      )}>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </div>
        {message.metadata?.processingTime && (
          <div className={cn(
            'text-[11px] mt-2 font-medium',
            isUser ? 'text-stone-400' : 'text-stone-400'
          )}>
            {message.metadata.processingTime}ms
            {message.metadata.queryType && message.metadata.queryType !== 'GENERAL_QUESTION' && (
              <span className="ml-2 text-emerald-500">• {message.metadata.queryType}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
