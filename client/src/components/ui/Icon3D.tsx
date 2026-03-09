import { cn } from "@/lib/utils";

// Import 3D icons as URLs
import receiptIcon from "@/assets/icons/3d/receipt-3d.svg";
import clockIcon from "@/assets/icons/3d/clock-3d.svg";
import checkIcon from "@/assets/icons/3d/check-3d.svg";
import walletIcon from "@/assets/icons/3d/wallet-3d.svg";
import busIcon from "@/assets/icons/3d/bus-3d.svg";

const icons = {
  receipt: receiptIcon,
  clock: clockIcon,
  check: checkIcon,
  wallet: walletIcon,
  bus: busIcon,
} as const;

type IconName = keyof typeof icons;

interface Icon3DProps {
  name: IconName;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-10 h-10",
  xl: "w-12 h-12",
};

export function Icon3D({ name, size = "md", className }: Icon3DProps) {
  const iconSrc = icons[name];

  return (
    <img
      src={iconSrc}
      alt={`${name} icon`}
      className={cn(sizeClasses[size], className)}
      aria-hidden="true"
    />
  );
}

export type { IconName };
