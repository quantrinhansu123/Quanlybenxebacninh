import { CarFront, Plus } from "lucide-react";

interface IconProps {
  className?: string;
}

/**
 * Bus Plus Icon - Used for "Xe tăng cường" (Augmented vehicle)
 * Composite icon: CarFront with Plus badge
 */
export function BusPlusIcon({ className = "" }: IconProps) {
  return (
    <div className={`relative inline-flex h-5 w-5 ${className}`}>
      <CarFront className="h-5 w-5" />
      <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5">
        <Plus className="h-2.5 w-2.5" strokeWidth={3} />
      </div>
    </div>
  );
}

export default BusPlusIcon;
