import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface AdminRouteProps {
  children: React.ReactNode
}

/** Chỉ user có role `admin` (quản trị) mới xem được. */
export function AdminRoute({ children }: AdminRouteProps) {
  const user = useAuthStore((s) => s.user)
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}
