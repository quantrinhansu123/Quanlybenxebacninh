import api from '@/lib/api'
import type { ReportFilter, InvoiceReport, RevenueReport } from '@/types'

export const reportService = {
  getInvoices: async (filter: ReportFilter): Promise<InvoiceReport[]> => {
    const response = await api.get<InvoiceReport[]>('/reports/invoices', { params: filter })
    return response.data
  },

  getVehicleLogs: async (filter: ReportFilter): Promise<any[]> => {
    const response = await api.get('/reports/vehicle-logs', { params: filter })
    return response.data
  },

  getStationActivity: async (filter: ReportFilter): Promise<any[]> => {
    const response = await api.get('/reports/station-activity', { params: filter })
    return response.data
  },

  getInvalidVehicles: async (filter: ReportFilter): Promise<any[]> => {
    const response = await api.get('/reports/invalid-vehicles', { params: filter })
    return response.data
  },

  getRevenue: async (filter: ReportFilter): Promise<RevenueReport[]> => {
    const response = await api.get<RevenueReport[]>('/reports/revenue', { params: filter })
    return response.data
  },

  exportExcel: async (type: string, filter: ReportFilter): Promise<Blob> => {
    const response = await api.get(`/reports/export/${type}`, {
      params: filter,
      responseType: 'blob',
    })
    return response.data
  },
}

