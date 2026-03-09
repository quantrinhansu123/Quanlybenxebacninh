import { cn } from "@/lib/utils";

interface RadarPulseProps {
  count: number;
  color: string;
}

export function RadarPulse({ count, color }: RadarPulseProps) {
  const colors: Record<string, string> = {
    sky: "bg-sky-500",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
    violet: "bg-violet-500",
  };

  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border border-white/50">
      <div className="relative">
        <span className={cn(
          "absolute inline-flex h-3 w-3 rounded-full opacity-75 animate-ping",
          colors[color]
        )} />
        <span className={cn(
          "relative inline-flex h-3 w-3 rounded-full",
          colors[color]
        )} />
      </div>
      <span className="text-sm font-black text-slate-800 tabular-nums">{count}</span>
    </div>
  );
}
