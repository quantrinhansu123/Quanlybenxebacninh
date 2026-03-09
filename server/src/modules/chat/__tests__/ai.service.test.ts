/**
 * AI Service Integration Tests
 * Tests for Gemini AI integration with function calling
 * 
 * Uses jest.unstable_mockModule() for ESM compatibility
 */

import { describe, it, expect, beforeEach, afterEach, jest, beforeAll } from '@jest/globals';

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

// Store original env
const originalEnv = { ...process.env };

// Define typed mock functions at module scope
const mockSendMessage = jest.fn<() => Promise<{
  response: {
    text: () => string;
    functionCalls: () => any[] | null;
  };
}>>();
const mockStartChat = jest.fn(() => ({
  sendMessage: mockSendMessage,
}));
const mockGetGenerativeModel = jest.fn(() => ({
  startChat: mockStartChat,
}));

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

// Setup environment before mocking
process.env.GEMINI_API_KEY = 'test-api-key';

// Register Supabase mock
jest.unstable_mockModule('../../../config/database.js', () => ({
  firebase: {
    from: (table: string) => ({
      select: () => Promise.resolve({ data: tableDataMap[table] || [], error: null }),
    }),
  },
}));

// Register Gemini API mock
jest.unstable_mockModule('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
  FunctionCallingMode: {
    AUTO: 'AUTO',
  },
  SchemaType: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
  },
}));

// Dynamic import AFTER mock registration
const { aiService } = await import('../services/ai.service.js');
const { chatCacheService } = await import('../services/chat-cache.service.js');

describe('AIService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-api-key';
    await chatCacheService.preWarm();

    // Default mock response (no function calls)
    mockSendMessage.mockResolvedValue({
      response: {
        text: () => 'This is a test response',
        functionCalls: () => null,
      },
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('generateResponse', () => {
    it('should generate response for simple message', async () => {
      const response = await aiService.generateResponse('Hello', 'session-1');
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    it('should call AI model with message', async () => {
      await aiService.generateResponse('Test message', 'session-test');
      expect(mockStartChat).toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalled();
    });

    it('should handle function calling response', async () => {
      // Mock function call response followed by text response
      mockSendMessage
        .mockResolvedValueOnce({
          response: {
            text: () => '',
            functionCalls: () => [
              {
                name: 'search_vehicle',
                args: { plate_number: '98H07480' },
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          response: {
            text: () => 'Found vehicle 98H07480',
            functionCalls: () => null,
          },
        });

      const response = await aiService.generateResponse('xe 98H07480', 'session-fc-1');
      expect(typeof response).toBe('string');
      expect(mockSendMessage).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple function calls', async () => {
      mockSendMessage
        .mockResolvedValueOnce({
          response: {
            text: () => '',
            functionCalls: () => [
              { name: 'search_vehicle', args: { plate_number: '98H07480' } },
              { name: 'get_system_stats', args: {} },
            ],
          },
        })
        .mockResolvedValueOnce({
          response: {
            text: () => 'Results found',
            functionCalls: () => null,
          },
        });

      const response = await aiService.generateResponse('xe va thong ke', 'session-mfc-1');
      expect(typeof response).toBe('string');
    });

    it('should limit function call iterations to 3', async () => {
      // Mock infinite loop scenario
      mockSendMessage.mockResolvedValue({
        response: {
          text: () => '',
          functionCalls: () => [{ name: 'get_system_stats', args: {} }],
        },
      });

      await aiService.generateResponse('test infinite', 'session-limit');
      // Should be called max 4 times (1 initial + 3 iterations)
      expect(mockSendMessage.mock.calls.length).toBeLessThanOrEqual(4);
    });
  });

  describe('Error Handling', () => {
    it('should return fallback response on API error', async () => {
      mockSendMessage.mockRejectedValue(new Error('API Error'));

      const response = await aiService.generateResponse('test error', 'session-error');
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    it('should use cached data for fallback when available', async () => {
      mockSendMessage.mockRejectedValue(new Error('API Error'));

      const response = await aiService.generateResponse('xe 98H07480', 'session-fallback');
      expect(typeof response).toBe('string');
    });
  });

  describe('clearHistory', () => {
    it('should clear conversation history for session', async () => {
      await aiService.generateResponse('Message 1', 'session-clear');
      aiService.clearHistory('session-clear');

      // Next call should start fresh
      await aiService.generateResponse('Message 2', 'session-clear');
      expect(mockStartChat).toHaveBeenCalled();
    });

    it('should not throw when clearing non-existent session', () => {
      expect(() => aiService.clearHistory('non-existent-session')).not.toThrow();
    });
  });

  describe('hasApiKey', () => {
    it('should return true when API key is set', () => {
      expect(aiService.hasApiKey()).toBe(true);
    });
  });

  describe('Fallback Response Generation', () => {
    beforeEach(() => {
      mockSendMessage.mockRejectedValue(new Error('API Error'));
    });

    it('should search cached data for plate patterns', async () => {
      const response = await aiService.generateResponse('xe 98H07480', 'session-fb-1');
      expect(typeof response).toBe('string');
    });

    it('should provide helpful suggestions in fallback', async () => {
      const response = await aiService.generateResponse('random query', 'session-fb-2');
      expect(response).toContain('xe');
    });
  });

  describe('Session Management', () => {
    it('should create separate history for each session', async () => {
      await aiService.generateResponse('Session 1 message', 'session-a');
      await aiService.generateResponse('Session 2 message', 'session-b');
      await aiService.generateResponse('Session 3 message', 'session-c');

      expect(mockStartChat.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle rapid messages in same session', async () => {
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(aiService.generateResponse(`Message ${i}`, 'rapid-session'));
      }

      const responses = await Promise.all(promises);
      responses.forEach((r) => expect(typeof r).toBe('string'));
    });
  });

  describe('Vietnamese Language Processing', () => {
    it('should handle Vietnamese queries', async () => {
      const response = await aiService.generateResponse('tim xe bien so 98H07480', 'session-vn-1');
      expect(typeof response).toBe('string');
    });

    it('should handle queries without diacritics', async () => {
      const response = await aiService.generateResponse('don vi van tai Phuong Trang', 'session-vn-2');
      expect(typeof response).toBe('string');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', async () => {
      const response = await aiService.generateResponse('', 'session-empty');
      expect(typeof response).toBe('string');
    });

    it('should handle very long message', async () => {
      const longMessage = 'test '.repeat(200);
      const response = await aiService.generateResponse(longMessage, 'session-long');
      expect(typeof response).toBe('string');
    });

    it('should handle special characters in message', async () => {
      const response = await aiService.generateResponse('!@#$%^&*()', 'session-special');
      expect(typeof response).toBe('string');
    });

    it('should handle unicode characters', async () => {
      const response = await aiService.generateResponse('emoji test 🚌🚗', 'session-unicode');
      expect(typeof response).toBe('string');
    });

    it('should handle newlines in message', async () => {
      const response = await aiService.generateResponse('line1\nline2\nline3', 'session-newline');
      expect(typeof response).toBe('string');
    });
  });

  describe('Function Call Result Formatting', () => {
    it('should format vehicle search results', async () => {
      mockSendMessage
        .mockResolvedValueOnce({
          response: {
            text: () => '',
            functionCalls: () => [{ name: 'search_vehicle', args: { plate_number: '98H07480' } }],
          },
        })
        .mockResolvedValueOnce({
          response: {
            text: () => 'Xe 98H07480 - Xe khach 45 cho',
            functionCalls: () => null,
          },
        });

      const response = await aiService.generateResponse('xe 98H07480', 'session-format-1');
      expect(response).toContain('98H07480');
    });

    it('should format system stats results', async () => {
      mockSendMessage
        .mockResolvedValueOnce({
          response: {
            text: () => '',
            functionCalls: () => [{ name: 'get_system_stats', args: {} }],
          },
        })
        .mockResolvedValueOnce({
          response: {
            text: () => 'He thong co 3 xe, 3 tai xe',
            functionCalls: () => null,
          },
        });

      const response = await aiService.generateResponse('thong ke he thong', 'session-format-2');
      expect(typeof response).toBe('string');
    });
  });

  describe('Rate Limiting & Concurrent Requests', () => {
    it('should handle concurrent requests to same session', async () => {
      const requests = [
        aiService.generateResponse('Query 1', 'concurrent-session'),
        aiService.generateResponse('Query 2', 'concurrent-session'),
        aiService.generateResponse('Query 3', 'concurrent-session'),
      ];

      const responses = await Promise.all(requests);
      responses.forEach((r) => expect(typeof r).toBe('string'));
    });

    it('should handle concurrent requests to different sessions', async () => {
      const requests = [
        aiService.generateResponse('Query', 'session-x'),
        aiService.generateResponse('Query', 'session-y'),
        aiService.generateResponse('Query', 'session-z'),
      ];

      const responses = await Promise.all(requests);
      responses.forEach((r) => expect(typeof r).toBe('string'));
    });
  });
});
