import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'

export function useSmartNavigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const navigateWithReturn = (path: string, options?: { replace?: boolean }) => {
    const returnTo = encodeURIComponent(location.pathname + location.search)
    const separator = path.includes('?') ? '&' : '?'
    navigate(`${path}${separator}returnTo=${returnTo}`, options)
  }

  const goBack = () => {
    const returnTo = searchParams.get('returnTo')
    if (returnTo) {
      navigate(decodeURIComponent(returnTo))
    } else {
      navigate(-1)
    }
  }

  return { navigateWithReturn, goBack, navigate }
}
