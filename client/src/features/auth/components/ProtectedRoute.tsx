import { useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useUIStore } from '@/store/ui.store'
import { prefetchAppData } from '@/services/data-prefetch.service'
import { useAppSheetPolling } from '@/hooks/use-appsheet-polling'
import { normalizeScheduleRows } from '@/services/appsheet-normalize-schedules'
import { normalizeBusScheduleRows } from '@/services/appsheet-normalize-bus-schedules'
import { scheduleApi } from '@/features/fleet/schedules'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()
  const { initializeShiftIfNeeded } = useUIStore()
  const hasPrefetched = useRef(false)
  const shouldEnableScheduleSync = isAuthenticated && !isLoading

  // Global schedule sync: schedules were wired in the worker but never subscribed anywhere.
  useAppSheetPolling({
    endpointKey: 'fixedSchedules',
    normalize: normalizeScheduleRows,
    onData: () => {},
    onSyncToDb: (data) => scheduleApi.syncFromAppSheet(data),
    enabled: shouldEnableScheduleSync,
  })

  useAppSheetPolling({
    endpointKey: 'busSchedules',
    normalize: normalizeBusScheduleRows,
    onData: () => {},
    onSyncToDb: (data) => scheduleApi.syncFromAppSheet(data),
    enabled: shouldEnableScheduleSync,
  })

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Tự động set shift theo giờ hiện tại khi đăng nhập lần đầu
  // + prefetch data in background for instant page loads
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      initializeShiftIfNeeded()

      // Prefetch data once after authentication
      if (!hasPrefetched.current) {
        hasPrefetched.current = true
        // Run in background, don't block rendering
        prefetchAppData()
      }
    }
  }, [isAuthenticated, isLoading, initializeShiftIfNeeded])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
