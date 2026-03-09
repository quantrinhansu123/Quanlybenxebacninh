import { CheckCircle2, XCircle, Users, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusType = 'eligible' | 'ineligible' | 'returned' | 'irregular';

interface StatusRibbonProps {
  type: StatusType;
}

const configs = {
  eligible: {
    bg: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    text: 'ĐỦ ĐK',
    icon: CheckCircle2
  },
  ineligible: {
    bg: 'bg-gradient-to-r from-rose-500 to-red-500',
    text: 'THIẾU',
    icon: XCircle
  },
  returned: {
    bg: 'bg-gradient-to-r from-sky-500 to-blue-500',
    text: 'TRẢ KHÁCH',
    icon: Users
  },
  irregular: {
    bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
    text: 'VÃNG LAI',
    icon: AlertTriangle
  },
};

export function StatusRibbon({ type }: StatusRibbonProps) {
  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className={cn(
      "absolute -top-1 -right-1 flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-bold uppercase tracking-wider shadow-lg",
      config.bg
    )}>
      <Icon className="w-3 h-3" />
      <span>{config.text}</span>
    </div>
  );
}
