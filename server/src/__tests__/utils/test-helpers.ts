/**
 * Test Helper Utilities
 * Common utilities for unit testing
 */

import type { Request, Response } from 'express';

/**
 * Create mock Express request
 */
export function mockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    params: {},
    query: {},
    body: {},
    user: { id: 'test-user-id', email: 'test@example.com' },
    ...overrides,
  };
}

/**
 * Create mock Express response
 */
export function mockResponse(): Partial<Response> & {
  _getStatusCode: () => number;
  _getData: () => unknown;
} {
  let statusCode = 200;
  let data: unknown = null;

  const res = {
    status: jest.fn().mockImplementation((code: number) => {
      statusCode = code;
      return res;
    }),
    json: jest.fn().mockImplementation((d: unknown) => {
      data = d;
      return res;
    }),
    send: jest.fn().mockImplementation((d: unknown) => {
      data = d;
      return res;
    }),
    _getStatusCode: () => statusCode,
    _getData: () => data,
  };

  return res as Partial<Response> & {
    _getStatusCode: () => number;
    _getData: () => unknown;
  };
}

/**
 * Create mock Firebase REST client
 */
export function mockFirebaseREST() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    push: jest.fn().mockResolvedValue({ name: 'new-id' }),
  };
}

/**
 * Generate unique ID for tests
 */
export function generateTestId(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create ISO timestamp for tests
 */
export function createTestTimestamp(offsetMinutes = 0): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + offsetMinutes);
  return date.toISOString();
}
