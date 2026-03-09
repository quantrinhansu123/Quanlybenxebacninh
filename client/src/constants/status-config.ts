/**
 * Shared status configuration for dispatch records
 * Used in: Dashboard, DieuDo, ThanhToan
 */

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon?: string;
}

export const DISPATCH_STATUS: Record<string, StatusConfig> = {
  entered: {
    label: "Đã vào bến",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-200",
  },
  passengers_dropped: {
    label: "Đã trả khách",
    color: "text-cyan-700",
    bgColor: "bg-cyan-100",
    borderColor: "border-cyan-200",
  },
  permit_issued: {
    label: "Đã cấp phép",
    color: "text-violet-700",
    bgColor: "bg-violet-100",
    borderColor: "border-violet-200",
  },
  paid: {
    label: "Đã thanh toán",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
    borderColor: "border-emerald-200",
  },
  departure_ordered: {
    label: "Đã lệnh xuất",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-200",
  },
  departed: {
    label: "Đã xuất bến",
    color: "text-slate-700",
    bgColor: "bg-slate-100",
    borderColor: "border-slate-200",
  },
} as const;

export const OPERATOR_STATUS = {
  active: {
    label: "Hoạt động",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
  },
  inactive: {
    label: "Ngừng hoạt động",
    color: "text-slate-600",
    bgColor: "bg-slate-100",
  },
} as const;

export const PAYMENT_STATUS = {
  pending: {
    label: "Chưa thanh toán",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  paid: {
    label: "Đã thanh toán",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
  },
  overdue: {
    label: "Quá hạn",
    color: "text-rose-700",
    bgColor: "bg-rose-100",
  },
} as const;

export type DispatchStatusKey = keyof typeof DISPATCH_STATUS;
export type OperatorStatusKey = keyof typeof OPERATOR_STATUS;
export type PaymentStatusKey = keyof typeof PAYMENT_STATUS;
