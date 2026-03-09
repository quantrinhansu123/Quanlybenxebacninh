import { chatCacheService } from './chat-cache.service.js'
import { SchemaType } from '@google/generative-ai'

// Use any for function declarations to avoid strict type checking issues
export const CHAT_FUNCTIONS: any[] = [
  {
    name: 'search_vehicle',
    description: 'Tìm kiếm thông tin xe theo biển số. Sử dụng khi người dùng hỏi về xe, biển số, BKS, thông tin xe cụ thể.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        plate_number: {
          type: SchemaType.STRING,
          description: 'Biển số xe cần tìm (VD: 98H07480, 51B12345, 29A-12345)'
        }
      },
      required: ['plate_number']
    }
  },
  {
    name: 'search_driver',
    description: 'Tìm kiếm tài xế theo tên hoặc số GPLX. Sử dụng khi người dùng hỏi về tài xế, lái xe, người lái.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: 'Tên tài xế hoặc số giấy phép lái xe'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'search_operator',
    description: 'Tìm đơn vị vận tải, nhà xe, công ty vận tải theo tên. Sử dụng khi người dùng hỏi về đơn vị, nhà xe, công ty.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: 'Tên đơn vị vận tải, nhà xe (VD: Phương Trang, Mai Linh, Thành Bưởi)'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'search_route',
    description: 'Tìm thông tin tuyến đường theo mã tuyến, bến đi, bến đến. Sử dụng khi người dùng hỏi về tuyến, hành trình, bến.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        search_term: {
          type: SchemaType.STRING,
          description: 'Mã tuyến, tên bến đi hoặc bến đến (VD: TP.HCM, Đà Lạt, Cần Thơ)'
        }
      },
      required: ['search_term']
    }
  },
  {
    name: 'search_badge',
    description: 'Tìm phù hiệu xe theo số phù hiệu hoặc biển số. Sử dụng khi người dùng hỏi về phù hiệu, giấy phép vận tải.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        number: {
          type: SchemaType.STRING,
          description: 'Số phù hiệu hoặc biển số xe'
        }
      },
      required: ['number']
    }
  },
  {
    name: 'get_dispatch_stats',
    description: 'Lấy thống kê điều độ xe vào/ra bến. Sử dụng khi người dùng hỏi về số xe vào bến, ra bến, thống kê điều độ.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        date: {
          type: SchemaType.STRING,
          description: 'Ngày cần thống kê (định dạng YYYY-MM-DD). Để trống nếu hỏi về hôm nay.'
        }
      }
    }
  },
  {
    name: 'get_system_stats',
    description: 'Lấy thống kê tổng quan hệ thống: tổng số xe, tài xế, đơn vị vận tải, tuyến đường. Sử dụng khi người dùng hỏi bao nhiêu xe, tài xế, đơn vị.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: 'search_schedule',
    description: 'Tìm lịch trình chạy xe. Sử dụng khi người dùng hỏi về lịch trình, giờ xuất bến, biểu đồ chạy xe.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        term: {
          type: SchemaType.STRING,
          description: 'Mã lịch trình hoặc thời gian'
        }
      }
    }
  },
  {
    name: 'search_service',
    description: 'Tìm dịch vụ theo tên hoặc mã. Sử dụng khi người dùng hỏi về dịch vụ, giá dịch vụ, phí dịch vụ.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        term: {
          type: SchemaType.STRING,
          description: 'Tên hoặc mã dịch vụ'
        }
      }
    }
  },
  {
    name: 'get_shift_info',
    description: 'Lấy thông tin ca trực. Sử dụng khi người dùng hỏi về ca trực, lịch làm việc.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        date: {
          type: SchemaType.STRING,
          description: 'Ngày cần xem ca trực (YYYY-MM-DD)'
        }
      }
    }
  },
  {
    name: 'get_invoices',
    description: 'Lấy danh sách hóa đơn. Sử dụng khi người dùng hỏi về hóa đơn, thanh toán.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        date: {
          type: SchemaType.STRING,
          description: 'Ngày cần xem hóa đơn (YYYY-MM-DD)'
        }
      }
    }
  },
  {
    name: 'get_violations',
    description: 'Lấy danh sách vi phạm. Sử dụng khi người dùng hỏi về vi phạm, lỗi, phạt.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        plate_number: {
          type: SchemaType.STRING,
          description: 'Biển số xe cần xem vi phạm'
        }
      }
    }
  },
  {
    name: 'get_service_charges',
    description: 'Lấy bảng giá dịch vụ. Sử dụng khi người dùng hỏi về giá, phí, bảng giá dịch vụ.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        service: {
          type: SchemaType.STRING,
          description: 'Tên dịch vụ cần xem giá'
        }
      }
    }
  }
]

export interface FunctionCallResult {
  success: boolean
  data?: any
  error?: string
}

export async function executeFunction(name: string, args: Record<string, any>): Promise<FunctionCallResult> {
  try {
    // Ensure cache data is loaded before searching
    await chatCacheService.loadDataIfNeeded()

    switch (name) {
      case 'search_vehicle': {
        const results = chatCacheService.searchVehicleByPlate(args.plate_number || '')
        return {
          success: results.length > 0,
          data: results.length > 0 ? results : null,
          error: results.length === 0 ? `Không tìm thấy xe với biển số "${args.plate_number}"` : undefined
        }
      }

      case 'search_driver': {
        const results = chatCacheService.searchDriverByName(args.name || '')
        return {
          success: results.length > 0,
          data: results.length > 0 ? results : null,
          error: results.length === 0 ? `Không tìm thấy tài xế "${args.name}"` : undefined
        }
      }

      case 'search_operator': {
        const results = chatCacheService.searchOperatorByName(args.name || '')
        return {
          success: results.length > 0,
          data: results.length > 0 ? results : null,
          error: results.length === 0 ? `Không tìm thấy đơn vị "${args.name}"` : undefined
        }
      }

      case 'search_route': {
        const results = chatCacheService.searchRouteByCode(args.search_term || '')
        return {
          success: results.length > 0,
          data: results.length > 0 ? results : null,
          error: results.length === 0 ? `Không tìm thấy tuyến "${args.search_term}"` : undefined
        }
      }

      case 'search_badge': {
        const results = chatCacheService.searchBadgeByNumber(args.number || '')
        return {
          success: results.length > 0,
          data: results.length > 0 ? results : null,
          error: results.length === 0 ? `Không tìm thấy phù hiệu "${args.number}"` : undefined
        }
      }

      case 'get_dispatch_stats': {
        const stats = chatCacheService.getDispatchStats(args.date)
        return { success: true, data: stats }
      }

      case 'get_system_stats': {
        const stats = chatCacheService.getSystemStats()
        return { success: true, data: stats }
      }

      case 'search_schedule': {
        const results = chatCacheService.searchSchedules(args.term || '')
        return {
          success: true,
          data: results.length > 0 ? results : { message: 'Chưa có lịch trình nào được thiết lập' }
        }
      }

      case 'search_service': {
        const results = chatCacheService.searchServices(args.term || '')
        return {
          success: true,
          data: results.length > 0 ? results : { message: 'Chưa có dịch vụ nào' }
        }
      }

      case 'get_shift_info': {
        const results = chatCacheService.getShiftInfo(args.date)
        return {
          success: true,
          data: results.length > 0 ? results : { message: 'Chưa có thông tin ca trực' }
        }
      }

      case 'get_invoices': {
        const results = chatCacheService.getInvoices(args.date)
        return {
          success: true,
          data: results.length > 0 ? results : { message: 'Chưa có hóa đơn nào' }
        }
      }

      case 'get_violations': {
        const results = chatCacheService.getViolations(args.plate_number)
        return {
          success: true,
          data: results.length > 0 ? results : { message: 'Không có vi phạm nào' }
        }
      }

      case 'get_service_charges': {
        const results = chatCacheService.getServiceCharges(args.service)
        return {
          success: true,
          data: results.length > 0 ? results : { message: 'Chưa có bảng giá dịch vụ' }
        }
      }

      default:
        return { success: false, error: `Unknown function: ${name}` }
    }
  } catch (error: any) {
    console.error(`[ChatFunctions] Error executing ${name}:`, error)
    return { success: false, error: error.message }
  }
}
