import { routeService } from '@/services/route.service'

// routeApi: thin wrapper — syncFromAppSheet removed (AppSheet removed)
export const routeApi = {
  getAll: routeService.getAll.bind(routeService),
}

export { routeService }
