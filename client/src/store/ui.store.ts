import { create } from 'zustand'
import { shiftService, type Shift } from '@/services/shift.service'

interface UIState {
  title: string
  setTitle: (title: string) => void
  currentShift: string
  setCurrentShift: (shift: string) => void
  shifts: Shift[]
  setShifts: (shifts: Shift[]) => void
  loadShifts: () => Promise<void>
  getShiftByCurrentTime: () => string
  initializeShiftIfNeeded: () => Promise<void>
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
}

// Helper function để parse time (HH:mm) thành số phút
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

// Helper function để format shift name (tương tự như trong ShiftSelectionDialog)
const formatShiftName = (shift: Shift): string => {
  return `${shift.name} (${shift.startTime} - ${shift.endTime})`
}

// Hàm xác định shift dựa trên giờ hiện tại
const getShiftByCurrentTime = (shifts: Shift[]): string => {
  if (shifts.length === 0) {
    // Fallback nếu chưa có shifts
    return '<Trống>'
  }

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  for (const shift of shifts) {
    const startMinutes = timeToMinutes(shift.startTime)
    const endMinutes = timeToMinutes(shift.endTime)

    // Xử lý ca kéo dài qua nửa đêm (ví dụ: 22:00 - 06:00)
    if (startMinutes > endMinutes) {
      // Ca kéo dài qua nửa đêm
      if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
        return formatShiftName(shift)
      }
    } else {
      // Ca thông thường
      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
        return formatShiftName(shift)
      }
    }
  }

  // Nếu không tìm thấy ca nào phù hợp, trả về ca đầu tiên hoặc '<Trống>'
  return '<Trống>'
}

// Load sidebar collapsed state from localStorage
const getInitialSidebarState = (): boolean => {
  if (typeof window === 'undefined') return false
  const saved = localStorage.getItem('sidebarCollapsed')
  return saved === 'true'
}

export const useUIStore = create<UIState>((set, get) => ({
  title: '',
  setTitle: (title) => set({ title }),
  currentShift: '<Trống>',
  setCurrentShift: (shift) => set({ currentShift: shift }),
  shifts: [],
  setShifts: (shifts) => set({ shifts }),
  loadShifts: async () => {
    try {
      const shifts = await shiftService.getAll()
      set({ shifts })
    } catch (error) {
      console.error('Failed to load shifts:', error)
      // Giữ shifts hiện tại nếu load thất bại
    }
  },
  getShiftByCurrentTime: () => {
    const { shifts } = get()
    return getShiftByCurrentTime(shifts)
  },
  initializeShiftIfNeeded: async () => {
    const { currentShift, shifts, loadShifts } = get()
    
    // Chỉ tự động set nếu currentShift là '<Trống>'
    if (currentShift === '<Trống>') {
      // Load shifts nếu chưa có
      if (shifts.length === 0) {
        await loadShifts()
      }
      
      // Lấy shifts mới nhất từ store
      const updatedShifts = get().shifts
      const shift = getShiftByCurrentTime(updatedShifts)
      
      if (shift !== '<Trống>') {
        set({ currentShift: shift })
      }
    }
  },
  sidebarCollapsed: getInitialSidebarState(),
  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed })
    localStorage.setItem('sidebarCollapsed', String(collapsed))
  },
  toggleSidebar: () => {
    const { sidebarCollapsed, setSidebarCollapsed } = get()
    setSidebarCollapsed(!sidebarCollapsed)
  },
}))
