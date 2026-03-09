import { CheckCircle, Clock, AlertCircle, FileX, Shield, Settings } from "lucide-react";
import { GlassCard, SectionHeader } from "@/components/shared/styled-components";

type DocumentStatus = 'valid' | 'expired' | 'expiring_soon' | 'missing';

interface DocumentCheckResult {
  name: string;
  status: DocumentStatus;
  expiryDate?: string;
  daysRemaining?: number;
}

interface DocumentCheckCardsProps {
  documents: DocumentCheckResult[];
  isValid: boolean;
  validCount: number;
  totalCount: number;
  onEdit: () => void;
}

export function DocumentCheckCards({ documents, isValid, validCount, totalCount, onEdit }: DocumentCheckCardsProps) {
  return (
    <GlassCard>
      <SectionHeader
        icon={Shield}
        title="Kiểm tra điều kiện"
        badge={
          <span className={`text-xs px-2 py-1 rounded font-bold ${
            isValid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}>
            {validCount}/{totalCount}
          </span>
        }
        action={
          <button
            type="button"
            onClick={onEdit}
            className="h-7 w-7 rounded-lg bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-center"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        }
      />

      {/* Compact Document List */}
      <div className="p-3 space-y-2">
        {documents.map((doc, index) => {
          const statusConfig = {
            valid: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: doc.daysRemaining && doc.daysRemaining < 999 ? `${doc.daysRemaining}d` : 'OK' },
            expiring_soon: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: doc.daysRemaining === 0 ? 'Hôm nay!' : `${doc.daysRemaining}d` },
            expired: { icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', label: 'Hết hạn' },
            missing: { icon: FileX, color: 'text-gray-500', bg: 'bg-gray-50', label: 'Thiếu' }
          };
          const config = statusConfig[doc.status];
          const Icon = config.icon;

          return (
            <div
              key={index}
              className={`flex items-center justify-between p-2.5 rounded-lg ${config.bg} border border-transparent hover:border-gray-200 transition-colors`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${config.color}`} />
                <span className="text-sm font-medium text-gray-700">{doc.name}</span>
              </div>
              <span className={`text-xs font-bold ${config.color}`}>{config.label}</span>
            </div>
          );
        })}
      </div>

      {/* Compact Status Footer */}
      <div className={`px-3 py-2 border-t text-center ${
        isValid ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
      }`}>
        <span className={`text-xs font-bold ${isValid ? 'text-emerald-700' : 'text-rose-700'}`}>
          {isValid ? '✓ Đủ điều kiện cấp phép' : '✗ Chưa đủ điều kiện'}
        </span>
      </div>
    </GlassCard>
  );
}
