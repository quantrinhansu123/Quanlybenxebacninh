// Dispatch Feature Public API
// Only export what should be used by other features/modules

// Hooks
export { useDispatch } from './hooks'

// Store
export { useDispatchStore, getDisplayStatus } from './store/dispatchStore'

// API
export { dispatchApi } from './api/dispatchApi'

// Types
export type {
  DispatchStatus,
  PermitStatus,
  PaymentMethod,
  DispatchRecord,
  DispatchInput,
  DisplayStatus,
  DispatchFilters,
  PassengerDropInput,
  PermitInput,
  PaymentInput,
  DepartureOrderInput,
  ExitInput,
  DispatchWorkflowState,
} from './types'

// Components - Icons
export { BusPlusIcon, BusEnterIcon, FileExclamationIcon } from './components/icons'

// Components - Dialogs (re-exported from original locations)
export {
  ChoXeVaoBenDialog,
  XeTraKhachDialog,
  CapPhepDialog,
  CapLenhXuatBenDialog,
  ChoXeRaBenDialog,
  ChoNhieuXeRaBenDialog,
  ThanhToanTheoThangDialog,
  KiemTraGiayToDialog,
  LyDoKhongDuDieuKienDialog,
  ThemDichVuDialog,
  ThemTaiXeDialog,
  DocumentHistoryDialog,
} from './components'
