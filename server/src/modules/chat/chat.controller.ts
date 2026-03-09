import { Request, Response } from 'express'
import { aiService } from './services/ai.service.js'
import { chatCacheService } from './services/chat-cache.service.js'
import type { ChatRequest, ChatResponse } from './types/chat.types.js'

const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const processMessage = async (req: Request, res: Response): Promise<void> => {
  const { message, sessionId: inputSessionId } = req.body as ChatRequest
  const startTime = Date.now()
  const sessionId = inputSessionId || generateSessionId()

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    res.status(400).json({
      response: 'Vui lòng nhập tin nhắn',
      type: 'error',
      sessionId
    } as ChatResponse)
    return
  }

  if (message.length > 1000) {
    res.status(400).json({
      response: 'Tin nhắn quá dài (tối đa 1000 ký tự)',
      type: 'error',
      sessionId
    } as ChatResponse)
    return
  }

  try {
    // Ensure cache is ready (non-blocking if already warm)
    if (!chatCacheService.isReady()) {
      chatCacheService.preWarm().catch(err => console.error('[Chat] Cache pre-warm error:', err))
    }

    // Use AI with function calling - handles everything
    const response = await aiService.generateResponse(message.trim(), sessionId)
    const processingTime = Date.now() - startTime

    console.log(`[Chat] Processed in ${processingTime}ms: "${message.substring(0, 50)}..."`)

    res.json({
      response,
      type: 'ai',
      sessionId,
      metadata: {
        queryType: 'AI_FUNCTION_CALLING',
        processingTime
      }
    } as ChatResponse)
  } catch (error: any) {
    console.error('Chat error:', error)

    // Never return "busy" - always provide helpful response
    const stats = chatCacheService.isReady() ? chatCacheService.getSystemStats() : null
    const fallbackResponse = `Xin lỗi, tôi gặp sự cố khi xử lý yêu cầu của bạn.

**Bạn có thể thử:**
• Tìm xe: "xe 98H07480"
• Tìm tài xế: "tài xế Nguyễn Văn A"
• Tìm đơn vị: "đơn vị Phương Trang"
• Tìm tuyến: "tuyến TP.HCM - Đà Lạt"
• Thống kê: "thống kê điều độ"${stats ? `\n\nHệ thống có ${stats.vehicles} xe, ${stats.drivers} tài xế.` : ''}`

    res.json({
      response: fallbackResponse,
      type: 'ai',
      sessionId,
      metadata: {
        processingTime: Date.now() - startTime,
        error: true
      }
    } as ChatResponse)
  }
}

export const clearHistory = async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.params

  if (!sessionId) {
    res.status(400).json({ success: false, error: 'Session ID is required' })
    return
  }

  // Clear AI conversation history
  aiService.clearHistory(sessionId)
  res.json({ success: true })
}
