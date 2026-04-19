import { scheduleService } from '@/services/schedule.service'

// scheduleApi: thin wrapper — syncFromAppSheet removed (AppSheet removed)
export const scheduleApi = {
  getAll: (routeId: string, operatorId?: string, activeOnly?: boolean, direction?: string) =>
    scheduleService.getAll(routeId, operatorId, activeOnly, direction),
  validateDay: scheduleService.validateDay.bind(scheduleService),
  checkTripLimit: scheduleService.checkTripLimit.bind(scheduleService),
}

export default scheduleApi
