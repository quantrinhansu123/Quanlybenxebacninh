import { memo } from "react";
import { Building2, Phone, User, CheckCircle, Eye, Edit } from "lucide-react";
import type { Operator } from "@/types";

interface OperatorWithSource extends Operator {
  source?: "database" | "legacy" | "google_sheets";
}

interface OperatorTableRowProps {
  operator: OperatorWithSource;
  index: number;
  onRowClick: (operator: Operator) => void;
  onView: (operator: Operator) => void;
  onEdit: (operator: OperatorWithSource) => void;
  onDelete: (operator: OperatorWithSource) => void;
}

export const OperatorTableRow = memo(function OperatorTableRow({
  operator,
  index,
  onRowClick,
  onView,
  onEdit,
  onDelete: _onDelete,
}: OperatorTableRowProps) {
  // Google Sheets data is read-only (managed externally)
  const isReadOnly = operator.source === "legacy" || operator.source === "google_sheets";

  return (
    <tr
      className="group hover:bg-orange-50/50 transition-colors cursor-pointer"
      onClick={() => onRowClick(operator)}
      style={{
        animation: "fadeInUp 0.3s ease forwards",
        animationDelay: `${index * 30}ms`,
        opacity: 0,
      }}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center group-hover:from-orange-500 group-hover:to-amber-500 transition-colors">
            <Building2 className="h-5 w-5 text-orange-600 group-hover:text-white transition-colors" />
          </div>
          <span className="font-semibold text-slate-800">
            {operator.name}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <Phone className="h-4 w-4 text-slate-400" />
          <span className="text-slate-600">{operator.phone || "-"}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <User className="h-4 w-4 text-slate-400" />
          <span className="text-slate-600">
            {operator.representativeName || "-"}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        {operator.isTicketDelegated ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">
            <CheckCircle className="h-3 w-3" />
            Có
          </span>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </td>
      <td className="px-6 py-4 text-center">
        <span
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
            operator.isActive
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              operator.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
            }`}
          />
          {operator.isActive ? "Hoạt động" : "Ngừng"}
        </span>
      </td>
      <td
        className="px-6 py-4 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center gap-1 opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onView(operator);
            }}
            className="p-2 rounded-lg text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-all cursor-pointer"
            title="Xem chi tiết"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(operator);
            }}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              isReadOnly
                ? "text-slate-300 cursor-not-allowed pointer-events-none"
                : "text-slate-500 hover:text-amber-600 hover:bg-amber-50"
            }`}
            title={isReadOnly ? "Dữ liệu được quản lý từ Google Sheets" : "Chỉnh sửa"}
            disabled={isReadOnly}
          >
            <Edit className="h-4 w-4" />
          </button>
          {/* Nút xóa đã được ẩn theo yêu cầu */}
        </div>
      </td>
    </tr>
  );
});
