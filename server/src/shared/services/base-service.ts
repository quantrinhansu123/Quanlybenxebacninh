/**
 * Base Service Template
 *
 * Use this pattern for services with complex business logic.
 * Services wrap repositories and add business logic on top.
 *
 * Simple CRUD operations do not need services - use repository directly.
 *
 * @example
 * ```typescript
 * class DispatchService extends BaseService {
 *   constructor(private dispatchRepo: DispatchRepository) {
 *     super('DispatchService');
 *   }
 *
 *   async processWorkflow(id: string, action: WorkflowAction): Promise<DispatchRecord> {
 *     const record = await this.dispatchRepo.findByIdOrFail(id);
 *     // Complex business logic here
 *     return this.dispatchRepo.updateById(id, updates);
 *   }
 * }
 * ```
 */

/**
 * Service interface defining standard operations
 * Repositories handle CRUD, services handle business logic
 */
export interface IService<T> {
  findById(id: string): Promise<T | null>
  findAll(): Promise<T[]>
  create(data: Partial<T>): Promise<T>
  update(id: string, data: Partial<T>): Promise<T>
  delete(id: string): Promise<void>
}

/**
 * Abstract base service providing common functionality
 * Extend this for services with complex business logic
 */
export abstract class BaseService {
  constructor(protected serviceName: string) {}

  /**
   * Standard error handler - logs and re-throws
   * Override in subclass for custom error handling
   */
  protected handleError(operation: string, error: unknown): never {
    console.error(`[${this.serviceName}] ${operation} failed:`, error)
    throw error
  }

  /**
   * Log operation for debugging
   */
  protected log(message: string, data?: unknown): void {
    console.log(`[${this.serviceName}] ${message}`, data ?? '')
  }

  /**
   * Wrap async operations with error handling
   */
  protected async withErrorHandling<R>(
    operation: string,
    fn: () => Promise<R>
  ): Promise<R> {
    try {
      return await fn()
    } catch (error) {
      this.handleError(operation, error)
    }
  }
}

/**
 * Type for workflow actions in dispatch
 */
export type WorkflowAction =
  | 'recordPassengerDrop'
  | 'issuePermit'
  | 'rejectPermit'
  | 'processPayment'
  | 'issueDepartureOrder'
  | 'recordDeparture'
  | 'recordExit'

/**
 * Generic service result type
 */
export interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Create a success result
 */
export function successResult<T>(data: T): ServiceResult<T> {
  return { success: true, data }
}

/**
 * Create an error result
 */
export function errorResult<T>(error: string): ServiceResult<T> {
  return { success: false, error }
}
