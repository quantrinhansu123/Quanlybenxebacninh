import { Bus } from "lucide-react";

interface FloatingDotsEmptyProps {
  message: string;
}

export function FloatingDotsEmpty({ message }: FloatingDotsEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative w-24 h-24">
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Bus className="w-8 h-8 text-slate-300" />
          </div>
        </div>
        {/* Floating dots */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '0s', animationDuration: '1.5s' }} />
        <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-emerald-300 animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '1.5s' }} />
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-amber-300 animate-bounce" style={{ animationDelay: '0.4s', animationDuration: '1.5s' }} />
        <div className="absolute top-1/2 -left-1 w-2 h-2 rounded-full bg-violet-300 animate-bounce" style={{ animationDelay: '0.6s', animationDuration: '1.5s' }} />
        <div className="absolute top-1/2 -right-1 w-2 h-2 rounded-full bg-rose-300 animate-bounce" style={{ animationDelay: '0.8s', animationDuration: '1.5s' }} />
      </div>
      <p className="text-slate-400 font-medium mt-4">{message}</p>
    </div>
  );
}
