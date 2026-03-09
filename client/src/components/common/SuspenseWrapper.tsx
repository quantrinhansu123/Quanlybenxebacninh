import { Suspense, type ReactNode } from 'react'
import { PageLoader } from './PageLoader'

interface SuspenseWrapperProps {
  children: ReactNode
  fallback?: ReactNode
}

export function SuspenseWrapper({ children, fallback }: SuspenseWrapperProps) {
  return (
    <Suspense fallback={fallback ?? <PageLoader />}>
      {children}
    </Suspense>
  )
}
