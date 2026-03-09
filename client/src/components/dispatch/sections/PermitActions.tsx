import { X, XCircle, CheckCircle } from "lucide-react";

interface PermitActionsProps {
  readOnly: boolean;
  isLoading: boolean;
  onClose: () => void;
  onNotEligible: () => void;
  onEligible: () => void;
}

export function PermitActions({
  readOnly,
  isLoading,
  onClose,
  onNotEligible,
  onEligible,
}: PermitActionsProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Cancel/Close button - Ghost style */}
      <button
        type="button"
        onClick={onClose}
        disabled={isLoading}
        className="
          inline-flex items-center gap-2 h-12 px-6 rounded-xl
          bg-white border-2 border-gray-200 text-gray-600
          font-semibold text-base
          hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800
          active:scale-[0.98]
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        <X className="h-5 w-5" />
        {readOnly ? "Đóng" : "Hủy"}
      </button>

      {!readOnly && (
        <>
          {/* Not Eligible button - Danger style */}
          <button
            type="button"
            onClick={onNotEligible}
            disabled={isLoading}
            className="
              inline-flex items-center gap-2 h-12 px-6 rounded-xl
              bg-gradient-to-r from-rose-500 to-red-500 text-white
              font-bold text-base
              shadow-xl shadow-rose-500/30
              hover:shadow-2xl hover:shadow-rose-500/40 hover:from-rose-600 hover:to-red-600
              active:scale-[0.98]
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <XCircle className="h-5 w-5" />
            Không đủ điều kiện
          </button>

          {/* Eligible button - Success style with emphasis */}
          <button
            type="button"
            onClick={onEligible}
            disabled={isLoading}
            className="
              inline-flex items-center gap-2 h-14 px-8 rounded-xl
              bg-gradient-to-r from-emerald-500 to-green-500 text-white
              font-bold text-lg
              shadow-xl shadow-emerald-500/40
              hover:shadow-2xl hover:shadow-emerald-500/50 hover:from-emerald-600 hover:to-green-600
              active:scale-[0.98]
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ring-4 ring-emerald-500/20
            "
          >
            <CheckCircle className="h-6 w-6" />
            Đủ điều kiện
          </button>
        </>
      )}
    </div>
  );
}
