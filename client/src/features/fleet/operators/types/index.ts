// Operators Domain Types

export type {
  Operator,
  OperatorInput,
} from '@/types/fleet.types'

// Feature-specific types
export interface OperatorFilters {
  search?: string
  isActive?: boolean
}

export interface OperatorFormMode {
  mode: 'create' | 'edit' | 'view'
  operatorId?: string
}
