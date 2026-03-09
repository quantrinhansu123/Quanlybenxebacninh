import { Router } from 'express'
import { processMessage, clearHistory } from './chat.controller.js'

const router = Router()

// POST /api/chat/message - Send a message
router.post('/message', processMessage)

// DELETE /api/chat/history/:sessionId - Clear chat history
router.delete('/history/:sessionId', clearHistory)

export default router
