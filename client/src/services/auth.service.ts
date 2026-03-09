// Backward compatibility re-export
// TODO: Update all imports to use @/features/auth directly, then remove this file

import { authApi } from '@/features/auth'

export const authService = authApi
export default authApi

