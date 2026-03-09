import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  private handleRefresh = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-8 h-8" />
              <h2 className="text-xl font-semibold">Đã xảy ra lỗi</h2>
            </div>

            <p className="text-gray-600 text-sm">
              Ứng dụng gặp lỗi không mong muốn. Vui lòng thử làm mới trang hoặc quay về trang chủ.
            </p>

            {this.state.error && (
              <details className="bg-gray-50 rounded-lg p-3 text-xs">
                <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                  Chi tiết lỗi
                </summary>
                <pre className="whitespace-pre-wrap text-red-600 overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                onClick={this.handleRefresh}
                variant="outline"
                className="flex-1 gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Làm mới
              </Button>
              <Button
                onClick={this.handleGoHome}
                className="flex-1 gap-2"
              >
                <Home className="w-4 h-4" />
                Về trang chủ
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
