import { cn } from "@/lib/utils";

interface LiveBeaconProps {
  size?: "small" | "default" | "large";
}

export function LiveBeacon({ size = "default" }: LiveBeaconProps) {
  const sizes = {
    small: "h-2 w-2",
    default: "h-3 w-3",
    large: "h-4 w-4",
  };

  return (
    <span className="relative flex">
      <span
        className={cn(
          "animate-ping absolute inline-flex rounded-full bg-emerald-400 opacity-75",
          sizes[size]
        )}
      />
      <span
        className={cn(
          "relative inline-flex rounded-full bg-emerald-500",
          sizes[size]
        )}
      />
    </span>
  );
}
