import { Bus, ArrowRight } from "lucide-react";

interface IconProps {
  className?: string;
}

/**
 * Bus Enter Icon - Used for "Cho xe ra bến" (Vehicle exit)
 * Composite icon: Bus with ArrowRight badge
 */
export function BusEnterIcon({ className = "" }: IconProps) {
  return (
    <div className={`relative inline-flex h-5 w-5 ${className}`}>
      <Bus className="h-5 w-5" />
      <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5">
        <ArrowRight className="h-2.5 w-2.5" strokeWidth={2.5} />
      </div>
    </div>
  );
}

export default BusEnterIcon;
