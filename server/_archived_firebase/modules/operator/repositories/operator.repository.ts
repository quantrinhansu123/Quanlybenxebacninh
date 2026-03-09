/**
 * Operator Repository
 * Data access layer for Operator entity
 */

import { BaseRepository } from '../../../shared/database/base-repository.js'
import {
  OperatorDB,
  OperatorAPI,
  mapOperator,
  mapOperatorToDB,
} from '../../../shared/mappers/entity-mappers.js'

export class OperatorRepository extends BaseRepository<OperatorDB, OperatorAPI> {
  constructor() {
    super('operators')
  }

  protected mapToAPI(db: OperatorDB): OperatorAPI {
    return mapOperator(db)
  }

  protected mapToDB(api: Partial<OperatorAPI>): Partial<OperatorDB> {
    return mapOperatorToDB(api)
  }

  /**
   * Find operators by active status
   */
  async findByActiveStatus(isActive: boolean): Promise<OperatorAPI[]> {
    return this.findAllFiltered((op) => op.isActive === isActive)
  }

  /**
   * Find operator by code
   */
  async findByCode(code: string): Promise<OperatorAPI | null> {
    return this.findOneByField('code', code)
  }

  /**
   * Check if code already exists
   */
  async codeExists(code: string, excludeId?: string): Promise<boolean> {
    const all = await this.findAll()
    return all.some((op) => op.code === code && op.id !== excludeId)
  }
}

// Export singleton instance
export const operatorRepository = new OperatorRepository()
