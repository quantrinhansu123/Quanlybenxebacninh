/**
 * Case Converter Utilities
 * Converts between snake_case (database) and camelCase (API)
 */

/**
 * Convert snake_case string to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Convert camelCase string to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/**
 * Convert object keys from snake_case to camelCase (shallow)
 */
export function mapSnakeToCamel<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (!obj || typeof obj !== 'object') return obj

  const result: Record<string, any> = {}
  for (const key of Object.keys(obj)) {
    const camelKey = snakeToCamel(key)
    result[camelKey] = obj[key]
  }
  return result
}

/**
 * Convert object keys from camelCase to snake_case (shallow)
 */
export function mapCamelToSnake<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (!obj || typeof obj !== 'object') return obj

  const result: Record<string, any> = {}
  for (const key of Object.keys(obj)) {
    const snakeKey = camelToSnake(key)
    result[snakeKey] = obj[key]
  }
  return result
}

/**
 * Deep convert object keys from snake_case to camelCase
 */
export function deepMapSnakeToCamel<T>(obj: T): any {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(deepMapSnakeToCamel)
  if (typeof obj !== 'object') return obj

  const result: Record<string, any> = {}
  for (const key of Object.keys(obj as Record<string, any>)) {
    const camelKey = snakeToCamel(key)
    result[camelKey] = deepMapSnakeToCamel((obj as Record<string, any>)[key])
  }
  return result
}

/**
 * Deep convert object keys from camelCase to snake_case
 */
export function deepMapCamelToSnake<T>(obj: T): any {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(deepMapCamelToSnake)
  if (typeof obj !== 'object') return obj

  const result: Record<string, any> = {}
  for (const key of Object.keys(obj as Record<string, any>)) {
    const snakeKey = camelToSnake(key)
    result[snakeKey] = deepMapCamelToSnake((obj as Record<string, any>)[key])
  }
  return result
}
