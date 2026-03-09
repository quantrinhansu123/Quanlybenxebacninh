import { FileCheck, Radio, Banknote, ArrowRight } from "lucide-react";

export type DisplayStatus = "in-station" | "permit-issued" | "paid" | "departed";

export const columnConfig: Record<DisplayStatus, {
  title: string;
  shortTitle: string;
  gradient: string;
  glassGradient: string;
  accentColor: string;
  iconBg: string;
  iconColor: string;
  icon: React.ElementType;
  borderColor: string;
  headerGradient: string;
  glowColor: string;
  dotColor: string;
}> = {
  "in-station": {
    title: "Xe trong bến",
    shortTitle: "Trong bến",
    gradient: "from-sky-500/10 via-cyan-500/5 to-transparent",
    glassGradient: "from-sky-500 via-cyan-500 to-blue-600",
    accentColor: "text-sky-700",
    iconBg: "bg-gradient-to-br from-sky-500 to-cyan-600",
    iconColor: "text-white",
    icon: Radio,
    borderColor: "border-sky-200/50",
    headerGradient: "from-sky-600 via-sky-500 to-cyan-500",
    glowColor: "shadow-sky-500/20",
    dotColor: "bg-sky-500"
  },
  "permit-issued": {
    title: "Đã cấp nốt",
    shortTitle: "Cấp nốt",
    gradient: "from-amber-500/10 via-orange-500/5 to-transparent",
    glassGradient: "from-amber-500 via-orange-500 to-yellow-600",
    accentColor: "text-amber-700",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-600",
    iconColor: "text-white",
    icon: FileCheck,
    borderColor: "border-amber-200/50",
    headerGradient: "from-amber-600 via-amber-500 to-orange-500",
    glowColor: "shadow-amber-500/20",
    dotColor: "bg-amber-500"
  },
  "paid": {
    title: "Đã thanh toán",
    shortTitle: "Thanh toán",
    gradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
    glassGradient: "from-emerald-500 via-teal-500 to-green-600",
    accentColor: "text-emerald-700",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
    iconColor: "text-white",
    icon: Banknote,
    borderColor: "border-emerald-200/50",
    headerGradient: "from-emerald-600 via-emerald-500 to-teal-500",
    glowColor: "shadow-emerald-500/20",
    dotColor: "bg-emerald-500"
  },
  "departed": {
    title: "Sẵn sàng xuất",
    shortTitle: "Xuất bến",
    gradient: "from-violet-500/10 via-purple-500/5 to-transparent",
    glassGradient: "from-violet-500 via-purple-500 to-indigo-600",
    accentColor: "text-violet-700",
    iconBg: "bg-gradient-to-br from-violet-500 to-purple-600",
    iconColor: "text-white",
    icon: ArrowRight,
    borderColor: "border-violet-200/50",
    headerGradient: "from-violet-600 via-violet-500 to-purple-500",
    glowColor: "shadow-violet-500/20",
    dotColor: "bg-violet-500"
  }
};
