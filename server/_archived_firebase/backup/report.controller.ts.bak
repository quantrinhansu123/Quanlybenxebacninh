import { Request, Response } from 'express'
import { firebase } from '../config/database.js'

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, operatorId, paymentStatus } = req.query

    let query = firebase
      .from('invoices')
      .select(`
        *,
        operators:operator_id(id, name, code)
      `)
      .gte('issue_date', startDate as string)
      .lte('issue_date', endDate as string)
      .order('issue_date', { ascending: false })

    if (operatorId) {
      query = query.eq('operator_id', operatorId as string)
    }
    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus as string)
    }

    const { data, error } = await query

    if (error) throw error

    const invoices = data.map((invoice: any) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      dispatchId: invoice.dispatch_record_id,
      operatorName: invoice.operators?.name || '',
      amount: parseFloat(invoice.total_amount) || 0,
      issueDate: invoice.issue_date,
      status: invoice.payment_status,
    }))

    return res.json(invoices)
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return res.status(500).json({ error: 'Failed to fetch invoices' })
  }
}

export const getVehicleLogs = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, vehicleId } = req.query

    let query = firebase
      .from('dispatch_records')
      .select('*')
      .gte('entry_time', startDate as string)
      .lte('entry_time', endDate as string)
      .order('entry_time', { ascending: false })

    if (vehicleId) {
      query = query.eq('vehicle_id', vehicleId as string)
    }

    const { data: records, error } = await query

    if (error) throw error

    // Fetch related data
    const vehicleIds = [...new Set(records.map((r: any) => r.vehicle_id))]
    const driverIds = [...new Set(records.map((r: any) => r.driver_id))]
    const routeIds = [...new Set(records.map((r: any) => r.route_id))]

    const { data: vehicles } = await firebase
      .from('vehicles')
      .select('id, plate_number')
      .in('id', vehicleIds)

    const { data: drivers } = await firebase
      .from('drivers')
      .select('id, full_name')
      .in('id', driverIds)

    const { data: routes } = await firebase
      .from('routes')
      .select('id, route_name')
      .in('id', routeIds)

    const vehicleMap = new Map(vehicles?.map((v: any) => [v.id, v.plate_number]) || [])
    const driverMap = new Map(drivers?.map((d: any) => [d.id, d.full_name]) || [])
    const routeMap = new Map(routes?.map((r: any) => [r.id, r.route_name]) || [])

    const result = records.map((record: any) => ({
      ...record,
      vehiclePlateNumber: vehicleMap.get(record.vehicle_id) || '',
      driverName: driverMap.get(record.driver_id) || '',
      routeName: routeMap.get(record.route_id) || '',
    }))

    return res.json(result)
  } catch (error) {
    console.error('Error fetching vehicle logs:', error)
    return res.status(500).json({ error: 'Failed to fetch vehicle logs' })
  }
}

export const getStationActivity = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query

    const { data: records, error } = await firebase
      .from('dispatch_records')
      .select('*')
      .gte('entry_time', startDate as string)
      .lte('entry_time', endDate as string)
      .order('entry_time', { ascending: false })

    if (error) throw error

    // Fetch related data
    const vehicleIds = [...new Set(records.map((r: any) => r.vehicle_id))]
    const driverIds = [...new Set(records.map((r: any) => r.driver_id))]
    const routeIds = [...new Set(records.map((r: any) => r.route_id))]

    const { data: vehicles } = await firebase
      .from('vehicles')
      .select('id, plate_number')
      .in('id', vehicleIds)

    const { data: drivers } = await firebase
      .from('drivers')
      .select('id, full_name')
      .in('id', driverIds)

    const { data: routes } = await firebase
      .from('routes')
      .select('id, route_name')
      .in('id', routeIds)

    const vehicleMap = new Map(vehicles?.map((v: any) => [v.id, v.plate_number]) || [])
    const driverMap = new Map(drivers?.map((d: any) => [d.id, d.full_name]) || [])
    const routeMap = new Map(routes?.map((r: any) => [r.id, r.route_name]) || [])

    const result = records.map((record: any) => ({
      ...record,
      vehiclePlateNumber: vehicleMap.get(record.vehicle_id) || '',
      driverName: driverMap.get(record.driver_id) || '',
      routeName: routeMap.get(record.route_id) || '',
    }))

    return res.json(result)
  } catch (error) {
    console.error('Error fetching station activity:', error)
    return res.status(500).json({ error: 'Failed to fetch station activity' })
  }
}

export const getInvalidVehicles = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query

    const { data: records, error } = await firebase
      .from('dispatch_records')
      .select('*')
      .eq('current_status', 'permit_rejected')
      .gte('entry_time', startDate as string)
      .lte('entry_time', endDate as string)
      .order('entry_time', { ascending: false })

    if (error) throw error

    // Fetch related data
    const vehicleIds = [...new Set(records.map((r: any) => r.vehicle_id))]
    const driverIds = [...new Set(records.map((r: any) => r.driver_id))]
    const routeIds = [...new Set(records.map((r: any) => r.route_id))]

    const { data: vehicles } = await firebase
      .from('vehicles')
      .select('id, plate_number')
      .in('id', vehicleIds)

    const { data: drivers } = await firebase
      .from('drivers')
      .select('id, full_name')
      .in('id', driverIds)

    const { data: routes } = await firebase
      .from('routes')
      .select('id, route_name')
      .in('id', routeIds)

    const vehicleMap = new Map(vehicles?.map((v: any) => [v.id, v.plate_number]) || [])
    const driverMap = new Map(drivers?.map((d: any) => [d.id, d.full_name]) || [])
    const routeMap = new Map(routes?.map((r: any) => [r.id, r.route_name]) || [])

    const result = records.map((record: any) => ({
      ...record,
      vehiclePlateNumber: vehicleMap.get(record.vehicle_id) || '',
      driverName: driverMap.get(record.driver_id) || '',
      routeName: routeMap.get(record.route_id) || '',
    }))

    return res.json(result)
  } catch (error) {
    console.error('Error fetching invalid vehicles:', error)
    return res.status(500).json({ error: 'Failed to fetch invalid vehicles' })
  }
}

export const getRevenue = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query

    const { data, error } = await firebase
      .from('dispatch_records')
      .select('payment_amount, entry_time, vehicle_id')
      .gte('entry_time', startDate as string)
      .lte('entry_time', endDate as string)
      .not('payment_amount', 'is', null)
      .eq('current_status', 'departed')

    if (error) throw error

    // Group by date
    const revenueByDate: Record<string, {
      date: string
      totalRevenue: number
      vehicleCount: Set<string>
      transactionCount: number
    }> = {}

    data.forEach((record: any) => {
      const date = new Date(record.entry_time).toISOString().split('T')[0]
      if (!revenueByDate[date]) {
        revenueByDate[date] = {
          date,
          totalRevenue: 0,
          vehicleCount: new Set(),
          transactionCount: 0,
        }
      }
      revenueByDate[date].totalRevenue += parseFloat(record.payment_amount) || 0
      revenueByDate[date].vehicleCount.add(record.vehicle_id)
      revenueByDate[date].transactionCount += 1
    })

    const revenue = Object.values(revenueByDate).map((item) => ({
      date: item.date,
      totalRevenue: item.totalRevenue,
      vehicleCount: item.vehicleCount.size,
      transactionCount: item.transactionCount,
    })).sort((a, b) => a.date.localeCompare(b.date))

    return res.json(revenue)
  } catch (error) {
    console.error('Error fetching revenue:', error)
    return res.status(500).json({ error: 'Failed to fetch revenue' })
  }
}

export const exportExcel = async (req: Request, res: Response) => {
  try {
    const { type: _type } = req.params
    const { startDate: _startDate, endDate: _endDate } = req.query

    // For now, return JSON. In production, you would use a library like exceljs
    // to generate actual Excel files
    return res.status(501).json({ 
      error: 'Excel export not yet implemented',
      message: 'This endpoint will generate Excel files in the future'
    })
  } catch (error) {
    console.error('Error exporting Excel:', error)
    return res.status(500).json({ error: 'Failed to export Excel' })
  }
}
