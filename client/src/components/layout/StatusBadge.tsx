import { Badge } from "@/components/ui/badge"
import type { DispatchStatus } from "@/types"

// Display status type for UI (different from backend status)
type DisplayStatus = "in-station" | "permit-issued" | "paid" | "departed"

interface StatusBadgeProps {
  status: DispatchStatus | DisplayStatus | "active" | "inactive" | "maintenance" | "suspended"
  label?: string
}

const statusConfig: Record<
  string,
  { label: string; variant: "success" | "warning" | "danger" | "default" | "secondary" }
> = {
  "in-station": { label: "Trong bến", variant: "secondary" },
  "permit-issued": { label: "Đã cấp nốt", variant: "warning" },
  paid: { label: "Đã thanh toán", variant: "success" },
  departed: { label: "Đã xuất bến", variant: "default" },
  invalid: { label: "Không đủ điều kiện", variant: "danger" },
  active: { label: "Hoạt động", variant: "success" },
  inactive: { label: "Không hoạt động", variant: "default" },
  maintenance: { label: "Bảo trì", variant: "warning" },
  suspended: { label: "Tạm ngưng", variant: "danger" },
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: "default" }
  return (
    <Badge variant={config.variant}>
      {label || config.label}
    </Badge>
  )
}

