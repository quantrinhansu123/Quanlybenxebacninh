import type { QueryType, QueryResult } from '../types/chat.types.js'

export class ResponseFormatterService {
  format(queryType: QueryType, result: QueryResult): string {
    if (!result.success) {
      return result.error || 'Không thể tìm thấy thông tin'
    }

    switch (queryType) {
      case 'VEHICLE_LOOKUP':
        return this.formatVehicle(result.data)
      case 'DRIVER_SEARCH':
        return this.formatDrivers(result.data)
      case 'ROUTE_INFO':
        return this.formatRoutes(result.data)
      case 'SCHEDULE_QUERY':
        return this.formatSchedules(result.data)
      case 'DISPATCH_STATS':
        return this.formatDispatchStats(result.data)
      case 'BADGE_LOOKUP':
        return this.formatBadge(result.data)
      case 'OPERATOR_INFO':
        return this.formatOperators(result.data)
      default:
        return JSON.stringify(result.data, null, 2)
    }
  }

  private formatVehicle(data: any): string {
    if (!data) return 'Không tìm thấy thông tin xe'

    // Handle summary mode (list all)
    if (data.summary) {
      let response = `📊 **Thống kê xe trong hệ thống**\n\n`
      response += `• Xe đăng ký: ${data.vehicleCount} xe\n`
      response += `• Phù hiệu: ${data.badgeCount} phù hiệu\n`
      response += `• Dữ liệu cũ: ${data.legacyCount} xe\n`
      
      if (data.samplePlates && data.samplePlates.length > 0) {
        response += `\n**Một số biển số mẫu:**\n`
        data.samplePlates.forEach((plate: string) => {
          response += `• ${plate}\n`
        })
      }
      
      response += `\n💡 Nhập biển số cụ thể để tra cứu (VD: xe 98H07480)`
      return response
    }

    // Handle combined results (vehicles + badges + legacy)
    if (data.totalFound !== undefined) {
      let response = `🔍 **Kết quả tra cứu biển số "${data.plateNumber}"**\n`
      response += `Tìm thấy ${data.totalFound} kết quả\n\n`

      // Format vehicles
      if (data.vehicles && data.vehicles.length > 0) {
        response += `**🚌 Xe đăng ký (${data.vehicles.length}):**\n`
        data.vehicles.forEach((v: any) => {
          const plate = v.plate_number || v.plateNumber || 'N/A'
          const type = v.vehicle_type || v.vehicleType || ''
          const operator = v.operatorName || v.operator_name || ''
          const seats = v.seat_capacity || v.seatCapacity || 0
          response += `• ${plate}`
          if (type) response += ` - ${type}`
          if (seats > 0) response += ` (${seats} chỗ)`
          if (operator) response += ` - ${operator}`
          response += '\n'
        })
        response += '\n'
      }

      // Format badges
      if (data.badges && data.badges.length > 0) {
        response += `**🏷️ Phù hiệu (${data.badges.length}):**\n`
        data.badges.forEach((b: any) => {
          const plate = b.BienSoXe || b.plate_number || 'N/A'
          const badgeNum = b.SoPhuHieu || b.badge_number || ''
          const status = b.TrangThai || b.status || ''
          const expiry = b.NgayHetHan || b.expiry_date || ''
          response += `• ${plate}`
          if (badgeNum) response += ` - Phù hiệu: ${badgeNum}`
          if (status) response += ` (${status})`
          if (expiry) response += ` - HH: ${expiry}`
          response += '\n'
        })
        response += '\n'
      }

      // Format legacy vehicles
      if (data.legacyVehicles && data.legacyVehicles.length > 0) {
        response += `**📁 Dữ liệu cũ (${data.legacyVehicles.length}):**\n`
        data.legacyVehicles.slice(0, 3).forEach((x: any) => {
          const plate = x.BienSo || x.plate_number || 'N/A'
          const owner = x.TenDangKyXe || x.owner_name || ''
          const type = x.LoaiXe || x.vehicle_type || ''
          response += `• ${plate}`
          if (type) response += ` - ${type}`
          if (owner) response += ` - ${owner}`
          response += '\n'
        })
        if (data.legacyVehicles.length > 3) {
          response += `  ...và ${data.legacyVehicles.length - 3} xe khác\n`
        }
      }

      return response.trim()
    }

    // Handle single vehicle (legacy format)
    const vehicle = data
    const plateNumber = vehicle.plate_number || vehicle.plateNumber || vehicle.BienSo || 'N/A'
    const vehicleType = vehicle.vehicle_type || vehicle.vehicleType || vehicle.LoaiXe || 'N/A'
    const seatCapacity = vehicle.seat_capacity || vehicle.seatCapacity || vehicle.SoCho || 0
    const bedCapacity = vehicle.bed_capacity || vehicle.bedCapacity || 0
    const manufacturer = vehicle.manufacturer || vehicle.NhanHieu || 'N/A'
    const manufactureYear = vehicle.manufacture_year || vehicle.manufactureYear || vehicle.NamSanXuat || 'N/A'
    const operatorName = vehicle.operatorName || vehicle.operator_name || vehicle.TenDangKyXe || 'N/A'
    const color = vehicle.color || vehicle.MauSon || 'N/A'
    const isActive = vehicle.is_active !== false ? 'Hoạt động' : 'Ngừng hoạt động'

    let response = `🚌 **Thông tin xe ${plateNumber}**\n\n`
    response += `• Loại xe: ${vehicleType}\n`
    
    if (seatCapacity > 0) {
      response += `• Số chỗ ngồi: ${seatCapacity}\n`
    }
    if (bedCapacity > 0) {
      response += `• Số giường: ${bedCapacity}\n`
    }
    
    response += `• Hãng xe: ${manufacturer}\n`
    response += `• Năm sản xuất: ${manufactureYear}\n`
    response += `• Màu sơn: ${color}\n`
    response += `• Đơn vị/Chủ xe: ${operatorName}\n`
    response += `• Trạng thái: ${isActive}\n`

    if (vehicle.chassis_number || vehicle.SoKhung) {
      response += `• Số khung: ${vehicle.chassis_number || vehicle.SoKhung}\n`
    }
    if (vehicle.engine_number || vehicle.SoMay) {
      response += `• Số máy: ${vehicle.engine_number || vehicle.SoMay}\n`
    }

    return response
  }

  private formatDrivers(drivers: any[]): string {
    if (!drivers || drivers.length === 0) {
      return 'Không tìm thấy tài xế nào'
    }

    if (drivers.length === 1) {
      const d = drivers[0]
      const fullName = d.full_name || d.fullName || 'N/A'
      const licenseNumber = d.license_number || d.licenseNumber || 'N/A'
      const phone = d.phone || d.phone_number || 'N/A'
      const isActive = d.is_active !== false ? 'Hoạt động' : 'Ngừng hoạt động'

      let response = `👤 **Thông tin tài xế ${fullName}**\n\n`
      response += `• GPLX: ${licenseNumber}\n`
      response += `• Điện thoại: ${phone}\n`
      response += `• Trạng thái: ${isActive}\n`

      if (d.address) {
        response += `• Địa chỉ: ${d.address}\n`
      }

      return response
    }

    let response = `👥 **Tìm thấy ${drivers.length} tài xế:**\n\n`
    drivers.slice(0, 5).forEach((d, index) => {
      const fullName = d.full_name || d.fullName || 'N/A'
      const licenseNumber = d.license_number || d.licenseNumber || ''
      response += `${index + 1}. ${fullName}`
      if (licenseNumber) response += ` (GPLX: ${licenseNumber})`
      response += '\n'
    })

    if (drivers.length > 5) {
      response += `\n...và ${drivers.length - 5} tài xế khác`
    }

    return response
  }

  private formatRoutes(routes: any[]): string {
    if (!routes || routes.length === 0) {
      return 'Không tìm thấy tuyến nào'
    }

    if (routes.length === 1) {
      const r = routes[0]
      const routeCode = this.resolveDisplayRouteCode(r, 'N/A')
      const routeName = r.route_name || r.routeName || ''
      const departure = r.departure_station || r.BenDi || 'N/A'
      const arrival = r.arrival_station || r.BenDen || 'N/A'
      const distance = r.distance_km || r.CuLyTuyen_km || 0
      const routePath = r.route_path || r.HanhTrinh || ''

      let response = `🛣️ **Thông tin tuyến ${routeCode}**\n\n`
      if (routeName) response += `• Tên tuyến: ${routeName}\n`
      response += `• Bến đi: ${departure}\n`
      response += `• Bến đến: ${arrival}\n`
      if (distance > 0) response += `• Cự ly: ${distance} km\n`
      if (routePath) response += `• Hành trình: ${routePath}\n`

      return response
    }

    let response = `🛣️ **Tìm thấy ${routes.length} tuyến:**\n\n`
    routes.slice(0, 5).forEach((r, index) => {
      const routeCode = this.resolveDisplayRouteCode(r, '')
      const departure = r.departure_station || r.BenDi || ''
      const arrival = r.arrival_station || r.BenDen || ''
      response += `${index + 1}. ${routeCode ? `[${routeCode}] ` : ''}${departure} - ${arrival}\n`
    })

    if (routes.length > 5) {
      response += `\n...và ${routes.length - 5} tuyến khác`
    }

    return response
  }

  private resolveDisplayRouteCode(route: any, fallback: string): string {
    const routeCode = String(route.route_code || route.routeCode || route.MaSoTuyen || '').trim()
    const routeCodeOld = String(route.route_code_old || route.routeCodeOld || '').trim()
    const routeType = String(route.route_type || route.routeType || '').trim().toLowerCase()
    const shouldUseOld = !!routeCodeOld && (routeType === 'bus' || routeCode.toUpperCase().startsWith('BUS-'))
    if (shouldUseOld) return routeCodeOld
    if (routeCode) return routeCode
    if (routeCodeOld) return routeCodeOld
    return fallback
  }

  private formatSchedules(schedules: any[]): string {
    if (!schedules || schedules.length === 0) {
      return 'Chưa có lịch trình nào được thiết lập'
    }

    let response = `📅 **Danh sách lịch trình (${schedules.length} lịch):**\n\n`

    schedules.slice(0, 10).forEach((s, index) => {
      const code = s.schedule_code || s.scheduleCode || ''
      const time = s.departure_time || s.departureTime || ''
      response += `${index + 1}. ${code ? `[${code}] ` : ''}${time}\n`
    })

    if (schedules.length > 10) {
      response += `\n...và ${schedules.length - 10} lịch trình khác`
    }

    return response
  }

  private formatDispatchStats(stats: any): string {
    const { date, entered, exited } = stats

    let response = `📊 **Thống kê điều độ ngày ${date}**\n\n`
    response += `• Xe vào bến: ${entered} lượt\n`
    response += `• Xe ra bến: ${exited} lượt\n`
    response += `• Tổng điều độ: ${entered + exited} lượt\n`

    return response
  }

  private formatBadge(badge: any): string {
    if (!badge) return 'Không tìm thấy thông tin phù hiệu'

    const badgeNumber = badge.SoPhuHieu || badge.badge_number || 'N/A'
    const plateNumber = badge.BienSoXe || badge.plate_number || 'N/A'
    const badgeType = badge.LoaiPH || badge.badge_type || 'N/A'
    const badgeColor = badge.MauPhuHieu || badge.badge_color || 'N/A'
    const issueDate = badge.NgayCap || badge.issue_date || 'N/A'
    const expiryDate = badge.NgayHetHan || badge.expiry_date || 'N/A'
    const status = badge.TrangThai || badge.status || 'N/A'
    const route = badge.TuyenDuong || badge.route || ''

    let response = `🏷️ **Thông tin phù hiệu ${badgeNumber}**\n\n`
    response += `• Biển số xe: ${plateNumber}\n`
    response += `• Loại phù hiệu: ${badgeType}\n`
    response += `• Màu phù hiệu: ${badgeColor}\n`
    response += `• Ngày cấp: ${issueDate}\n`
    response += `• Ngày hết hạn: ${expiryDate}\n`
    response += `• Trạng thái: ${status}\n`
    if (route) response += `• Tuyến đường: ${route}\n`

    return response
  }

  private formatOperators(operators: any[]): string {
    if (!operators || operators.length === 0) {
      return 'Không tìm thấy đơn vị vận tải nào'
    }

    if (operators.length === 1) {
      const o = operators[0]
      const name = o.name || 'N/A'
      const code = o.code || 'N/A'
      const phone = o.phone || 'N/A'
      const address = o.address || 'N/A'
      const representative = o.representative_name || ''
      const isActive = o.is_active !== false ? 'Hoạt động' : 'Ngừng hoạt động'

      let response = `🏢 **Thông tin đơn vị ${name}**\n\n`
      response += `• Mã đơn vị: ${code}\n`
      response += `• Điện thoại: ${phone}\n`
      response += `• Địa chỉ: ${address}\n`
      if (representative) response += `• Người đại diện: ${representative}\n`
      response += `• Trạng thái: ${isActive}\n`

      return response
    }

    let response = `🏢 **Tìm thấy ${operators.length} đơn vị:**\n\n`
    operators.slice(0, 5).forEach((o, index) => {
      const name = o.name || 'N/A'
      const code = o.code || ''
      response += `${index + 1}. ${name}${code ? ` (${code})` : ''}\n`
    })

    return response
  }
}

export const responseFormatter = new ResponseFormatterService()
