/**
 * @deprecated This file is deprecated as of Backend-first Migration (2024-12-19)
 *
 * REASON: All frontend services now use Backend API instead of direct Firebase access.
 * This improves security (Firebase will be locked) and centralizes business logic in Backend.
 *
 * MIGRATION: Use `import api from '@/lib/api'` instead of `firebaseClient`
 *
 * Example migration:
 * BEFORE: const data = await firebaseClient.getAsArray('vehicles')
 * AFTER:  const response = await api.get('/vehicles'); return response.data
 *
 * This file will be DELETED after Phase 2 (Lock Firebase Security) is complete.
 * DO NOT USE THIS FILE FOR NEW CODE.
 */

console.warn(
  '[DEPRECATED] firebase.ts is deprecated. Use api.ts instead. ' +
  'See Backend-first Migration plan for details.'
)

const FIREBASE_URL = 'https://benxe-management-20251218-default-rtdb.asia-southeast1.firebasedatabase.app'

/**
 * @deprecated Use api.ts instead
 */
export const firebaseClient = {
  /** @deprecated Use api.get() instead */
  get: async <T>(path: string): Promise<T | null> => {
    console.warn(`[DEPRECATED] firebaseClient.get('${path}') - Use api.get() instead`)
    try {
      const response = await fetch(`${FIREBASE_URL}/${path}.json`)
      if (!response.ok) {
        throw new Error(`Firebase error: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error(`Firebase GET ${path} error:`, error)
      return null
    }
  },

  /** @deprecated Use api.get() instead */
  getAsArray: async <T>(path: string): Promise<T[]> => {
    console.warn(`[DEPRECATED] firebaseClient.getAsArray('${path}') - Use api.get() instead`)
    try {
      const response = await fetch(`${FIREBASE_URL}/${path}.json`)
      if (!response.ok) {
        throw new Error(`Firebase error: ${response.status}`)
      }
      const data = await response.json()
      if (!data) return []

      return Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })) as T[]
    } catch (error) {
      console.error(`Firebase GET ${path} error:`, error)
      return []
    }
  },

  /** @deprecated Use api.post() instead */
  set: async <T>(path: string, data: T): Promise<boolean> => {
    console.warn(`[DEPRECATED] firebaseClient.set('${path}') - Use api.post() instead`)
    try {
      const response = await fetch(`${FIREBASE_URL}/${path}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return response.ok
    } catch (error) {
      console.error(`Firebase SET ${path} error:`, error)
      return false
    }
  },

  /** @deprecated Use api.put() or api.patch() instead */
  update: async <T>(path: string, data: Partial<T>): Promise<boolean> => {
    console.warn(`[DEPRECATED] firebaseClient.update('${path}') - Use api.put() instead`)
    try {
      const response = await fetch(`${FIREBASE_URL}/${path}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return response.ok
    } catch (error) {
      console.error(`Firebase UPDATE ${path} error:`, error)
      return false
    }
  },

  /** @deprecated Use api.post() instead */
  push: async <T>(path: string, data: T): Promise<string | null> => {
    console.warn(`[DEPRECATED] firebaseClient.push('${path}') - Use api.post() instead`)
    try {
      const response = await fetch(`${FIREBASE_URL}/${path}.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) return null
      const result = await response.json()
      return result.name
    } catch (error) {
      console.error(`Firebase PUSH ${path} error:`, error)
      return null
    }
  },

  /** @deprecated Use api.delete() instead */
  delete: async (path: string): Promise<boolean> => {
    console.warn(`[DEPRECATED] firebaseClient.delete('${path}') - Use api.delete() instead`)
    try {
      const response = await fetch(`${FIREBASE_URL}/${path}.json`, {
        method: 'DELETE'
      })
      return response.ok
    } catch (error) {
      console.error(`Firebase DELETE ${path} error:`, error)
      return false
    }
  },

  /** @deprecated ID generation moved to Backend */
  generateId: (): string => {
    console.warn('[DEPRECATED] firebaseClient.generateId() - Backend generates IDs now')
    const timestamp = Date.now().toString(36)
    const randomPart = Math.random().toString(36).substring(2, 15)
    return `${timestamp}-${randomPart}`
  }
}
