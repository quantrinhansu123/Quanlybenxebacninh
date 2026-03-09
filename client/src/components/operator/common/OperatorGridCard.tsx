import { Building2, Phone, User, Ticket, Eye, Edit, Trash2 } from "lucide-react";
import type { Operator } from "@/types";

interface OperatorWithSource extends Operator {
  source?: "database" | "legacy" | "google_sheets";
}

interface OperatorGridCardProps {
  operator: OperatorWithSource;
  index: number;
  onRowClick: (operator: Operator) => void;
  onView: (operator: Operator) => void;
  onEdit: (operator: OperatorWithSource) => void;
  onDelete: (operator: OperatorWithSource) => void;
}

export function OperatorGridCard({
  operator,
  index,
  onRowClick,
  onView,
  onEdit,
  onDelete,
}: OperatorGridCardProps) {
  const isReadOnly = operator.source === "legacy" || operator.source === "google_sheets";

  return (
    <div
      className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-orange-200 transition-all group hover:-translate-y-1 cursor-pointer"
      onClick={() => onRowClick(operator)}
      style={{
        animation: "fadeInUp 0.3s ease forwards",
        animationDelay: `${index * 50}ms`,
        opacity: 0,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center group-hover:from-orange-500 group-hover:to-amber-500 transition-colors">
            <Building2 className="h-6 w-6 text-orange-600 group-hover:text-white transition-colors" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 line-clamp-1">
              {operator.name}
            </h3>
            <p className="text-sm text-slate-500 font-mono">
              {operator.code || operator.id?.substring(0, 8) || "-"}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            operator.isActive
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              operator.isActive ? "bg-emerald-500" : "bg-slate-400"
            }`}
          />
          {operator.isActive ? "Hoạt động" : "Ngừng"}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-slate-400" />
          <span className="text-slate-600">{operator.phone || "-"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-slate-400" />
          <span className="text-slate-600 truncate">
            {operator.representativeName || "-"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Ticket className="h-4 w-4 text-slate-400" />
          <span className="text-slate-600">
            {operator.isTicketDelegated ? "Có ủy thác vé" : "Không ủy thác"}
          </span>
        </div>
      </div>

      <div
        className="relative z-10 flex items-center justify-end gap-1 pt-4 border-t border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onView(operator);
          }}
          className="p-2 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-all cursor-pointer"
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
              : "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
          }`}
          disabled={isReadOnly}
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(operator);
          }}
          className={`p-2 rounded-lg transition-all cursor-pointer ${
            isReadOnly
              ? "text-slate-300 cursor-not-allowed pointer-events-none"
              : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
          }`}
          disabled={isReadOnly}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
