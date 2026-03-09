/**
 * Chat Controller E2E Tests
 * Tests for HTTP endpoints and request handling
 * 
 * Uses jest.unstable_mockModule() for ESM compatibility
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Request, Response } from 'express';

// Import mock data first
import {
  mockVehicles,
  mockDrivers,
  mockOperators,
  mockRoutes,
  mockBadges,
  mockDispatchRecords,
  mockSchedules,
  mockServices,
  mockShifts,
  mockInvoices,
  mockViolations,
  mockServiceCharges,
  createMockSnapshot,
} from './mocks/chat-mock-data.js';

// Define typed mock functions at module scope
const mockGenerateResponse = jest.fn<(message: string, sessionId: string) => Promise<string>>();
const mockClearHistory = jest.fn<(sessionId: string) => void>();

// Table to mock data mapping
const tableDataMap: Record<string, any[]> = {
  vehicles: mockVehicles,
  vehicle_badges: mockBadges,
  operators: mockOperators,
  routes: mockRoutes,
  drivers: mockDrivers,
  dispatch_records: mockDispatchRecords,
  schedules: mockSchedules,
  services: mockServices,
  shifts: mockShifts,
  invoices: mockInvoices,
  violations: mockViolations,
  service_charges: mockServiceCharges,
};

// Register Supabase mock
jest.unstable_mockModule('../../../config/database.js', () => ({
  firebase: {
    from: (table: string) => ({
      select: () => Promise.resolve({ data: tableDataMap[table] || [], error: null }),
    }),
  },
}));

// Register AI service mock
jest.unstable_mockModule('../services/ai.service.js', () => ({
  aiService: {
    generateResponse: mockGenerateResponse,
    clearHistory: mockClearHistory,
    hasApiKey: () => true,
  },
}));

// Dynamic import AFTER mock registration
const { processMessage, clearHistory } = await import('../chat.controller.js');
const { chatCacheService } = await import('../services/chat-cache.service.js');

// Helper to create mock request/response
const createMockRequest = (body: any = {}, params: any = {}): Partial<Request> => ({
  body,
  params,
});

interface MockResponse extends Partial<Response> {
  jsonData?: any;
  statusCode?: number;
}

const createMockResponse = (): MockResponse => {
  const res: MockResponse = {
    jsonData: null,
    statusCode: 200,
  };

  res.status = jest.fn((code: number) => {
    res.statusCode = code;
    return res as Response;
  }) as any;

  res.json = jest.fn((data: any) => {
    res.jsonData = data;
    return res as Response;
  }) as any;

  return res;
};

describe('Chat Controller', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await chatCacheService.preWarm();
    mockGenerateResponse.mockResolvedValue('Test AI response');
  });

  describe('processMessage', () => {
    describe('Input Validation', () => {
      it('should return 400 for missing message', async () => {
        const req = createMockRequest({});
        const res = createMockResponse();

        await processMessage(req as Request, res as Response);

        expect(res.statusCode).toBe(400);
        expect(res.jsonData.type).toBe('error');
      });

      it('should return 400 for empty message', async () => {
        const req = createMockRequest({ message: '' });
        const res = createMockResponse();

        await processMessage(req as Request, res as Response);

        expect(res.statusCode).toBe(400);
        expect(res.jsonData.type).toBe('error');
      });

      it('should return 400 for whitespace-only message', async () => {
        const req = createMockRequest({ message: '   ' });
        const res = createMockResponse();

        await processMessage(req as Request, res as Response);

        expect(res.statusCode).toBe(400);
      });

      it('should return 400 for message exceeding 1000 characters', async () => {
        const longMessage = 'a'.repeat(1001);
        const req = createMockRequest({ message: longMessage });
        const res = createMockResponse();

        await processMessage(req as Request, res as Response);

        expect(res.statusCode).toBe(400);
        expect(res.jsonData.response).toContain('1000');
      });

      it('should accept message with exactly 1000 characters', async () => {
        const message = 'a'.repeat(1000);
        const req = createMockRequest({ message });
        const res = createMockResponse();

        await processMessage(req as Request, res as Response);

        expect(res.statusCode).toBe(200);
      });

      it('should return 400 for non-string message', async () => {
        const req = createMockRequest({ message: 123 });
        const res = createMockResponse();

        await processMessage(req as Request, res as Response);

        expect(res.statusCode).toBe(400);
      });

      it('should return 400 for null message', async () => {
        const req = createMockRequest({ message: null });
        const res = createMockResponse();

        await processMessage(req as Request, res as Response);

        expect(res.statusCode).toBe(400);
      });
    });

    describe('Session Management', () => {
      it('should generate sessionId if not provided', async () => {
        const req = createMockRequest({ message: 'test' });
        const res = createMockResponse();

        await processMessage(req as Request, res as Response);

        expect(res.jsonData.sessionId).toBeDefined();
        expect(res.jsonData.sessionId).toContain('session_');
      });

      it('should use provided sessionId', async () => {
        const req = createMockRequest({
          message: 'test',
          sessionId: 'custom-session-123',
        });
        const res = createMockResponse();

        await processMessage(req as Request, res as Response);

        expect(res.jsonData.sessionId).toBe('custom-session-123');
      });

      it('should pass sessionId to AI service', async () => {
        const req = createMockRequest({
          message: 'test',
          sessionId: 'test-session',
        });
        const res = createMockResponse();

        await processMessage(req as Request, res as Response);

        expect(mockGenerateResponse).toHaveBeenCalledWith('test', 'test-session');
      });
    });

    describe('Successful Response', () => {
      it('should return AI response with correct structure', async () => {
        const req = createMockRequest({ message: 'Hello' });
        const res = createMockResponse();

        await processMessage(req as Request, res as Response);

        expect(res.statusCode).toBe(200);
        expect(res.jsonData).toHaveProperty('response');
        expect(res.jsonData).toHaveProperty('type', 'ai');
        expect(res.jsonData).toHaveProperty('sessionId');
        expect(res.jsonData).toHaveProperty('metadata');
      });

      it('should include processing time in metadata', async () => {
        const req = createMockRequest({ message: 'test' });
        const res = createMockResponse();

        await processMessage(req as Request, res as Response);

        expect(res.jsonData.metadata).toHaveProperty('processingTime');
        expect(typeof res.jsonData.metadata.processingTime).toBe('number');
      });

      it('should include queryType in metadata', async () => {
        const req = createMockRequest({ message: 'test' });
        const res = createMockResponse();

        await processMessage(req as Request, res as Response);

        expect(res.jsonData.metadata).toHaveProperty('queryType', 'AI_FUNCTION_CALLING');
      });

      it('should trim message whitespace', async () => {
        const req = createMockRequest({ message: '  test message  ' });
        const res = createMockResponse();

        await processMessage(req as Request, res as Response);

        expect(mockGenerateResponse).toHaveBeenCalledWith('test message', expect.any(String));
      });
    });

    describe('Error Handling', () => {
      it('should return fallback response on AI service error', async () => {
        mockGenerateResponse.mockRejectedValue(new Error('AI Service Error'));

        const req = createMockRequest({ message: 'test' });
        const res = createMockResponse();

        await processMessage(req as Request, res as Response);

        expect(res.statusCode).toBe(200); // Should still return 200 with fallback
        expect(res.jsonData.type).toBe('ai');
        expect(res.jsonData.metadata.error).toBe(true);
      });

      it('should provide helpful suggestions in error response', async () => {
        mockGenerateResponse.mockRejectedValue(new Error('Error'));

        const req = createMockRequest({ message: 'test' });
        const res = createMockResponse();

        await processMessage(req as Request, res as Response);

        expect(res.jsonData.response).toContain('xe');
      });

      it('should never return "busy" message', async () => {
        mockGenerateResponse.mockRejectedValue(new Error('Rate limited'));

        const req = createMockRequest({ message: 'test' });
        const res = createMockResponse();

        await processMessage(req as Request, res as Response);

        expect(res.jsonData.response).not.toContain('busy');
        expect(res.jsonData.response).not.toContain('ban');
      });
    });

    describe('Vietnamese Language Support', () => {
      it('should handle Vietnamese message', async () => {
        const req = createMockRequest({ message: 'tim xe bien so 98H07480' });
        const res = createMockResponse();

        await processMessage(req as Request, res as Response);

        expect(res.statusCode).toBe(200);
        expect(mockGenerateResponse).toHaveBeenCalled();
      });

      it('should handle message with diacritics', async () => {
        const req = createMockRequest({ message: 'tìm xe biển số' });
        const res = createMockResponse();

        await processMessage(req as Request, res as Response);

        expect(res.statusCode).toBe(200);
      });

      it('should handle mixed Vietnamese and English', async () => {
        const req = createMockRequest({ message: 'search xe 98H07480' });
        const res = createMockResponse();

        await processMessage(req as Request, res as Response);

        expect(res.statusCode).toBe(200);
      });
    });

    describe('Special Characters', () => {
      it('should handle message with special characters', async () => {
        const req = createMockRequest({ message: 'test @#$%' });
        const res = createMockResponse();

        await processMessage(req as Request, res as Response);

        expect(res.statusCode).toBe(200);
      });

      it('should handle message with emojis', async () => {
        const req = createMockRequest({ message: 'test 🚌 🚗' });
        const res = createMockResponse();

        await processMessage(req as Request, res as Response);

        expect(res.statusCode).toBe(200);
      });

      it('should handle message with newlines', async () => {
        const req = createMockRequest({ message: 'line1\nline2' });
        const res = createMockResponse();

        await processMessage(req as Request, res as Response);

        expect(res.statusCode).toBe(200);
      });
    });
  });

  describe('clearHistory', () => {
    it('should clear history successfully', async () => {
      const req = createMockRequest({}, { sessionId: 'test-session' });
      const res = createMockResponse();

      await clearHistory(req as Request, res as Response);

      expect(mockClearHistory).toHaveBeenCalledWith('test-session');
      expect(res.jsonData).toEqual({ success: true });
    });

    it('should return 400 for missing sessionId', async () => {
      const req = createMockRequest({}, {});
      const res = createMockResponse();

      await clearHistory(req as Request, res as Response);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData).toHaveProperty('error');
    });

    it('should return 400 for empty sessionId', async () => {
      const req = createMockRequest({}, { sessionId: '' });
      const res = createMockResponse();

      await clearHistory(req as Request, res as Response);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Response Format Validation', () => {
    it('should return ChatResponse type structure', async () => {
      const req = createMockRequest({ message: 'test' });
      const res = createMockResponse();

      await processMessage(req as Request, res as Response);

      const { jsonData } = res;
      expect(jsonData).toMatchObject({
        response: expect.any(String),
        type: expect.stringMatching(/^(data|ai|error)$/),
        sessionId: expect.any(String),
      });
    });

    it('should include metadata object', async () => {
      const req = createMockRequest({ message: 'test' });
      const res = createMockResponse();

      await processMessage(req as Request, res as Response);

      expect(res.jsonData.metadata).toBeDefined();
      expect(typeof res.jsonData.metadata).toBe('object');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid consecutive requests', async () => {
      const responses = [];

      for (let i = 0; i < 5; i++) {
        const req = createMockRequest({ message: `test ${i}` });
        const res = createMockResponse();
        await processMessage(req as Request, res as Response);
        responses.push(res);
      }

      responses.forEach((res) => {
        expect(res.statusCode).toBe(200);
      });
    });

    it('should handle concurrent requests', async () => {
      const promises = [];

      for (let i = 0; i < 3; i++) {
        const req = createMockRequest({ message: `concurrent ${i}` });
        const res = createMockResponse();
        promises.push(processMessage(req as Request, res as Response).then(() => res));
      }

      const responses = await Promise.all(promises);
      responses.forEach((res) => {
        expect(res.statusCode).toBe(200);
      });
    });

    it('should handle message with only numbers', async () => {
      const req = createMockRequest({ message: '12345' });
      const res = createMockResponse();

      await processMessage(req as Request, res as Response);

      expect(res.statusCode).toBe(200);
    });

    it('should handle message with only special chars', async () => {
      const req = createMockRequest({ message: '!@#$%' });
      const res = createMockResponse();

      await processMessage(req as Request, res as Response);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('Performance', () => {
    it('should respond within reasonable time', async () => {
      const req = createMockRequest({ message: 'test' });
      const res = createMockResponse();

      const startTime = Date.now();
      await processMessage(req as Request, res as Response);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
    });
  });
});
