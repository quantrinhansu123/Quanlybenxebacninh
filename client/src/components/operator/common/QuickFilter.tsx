interface QuickFilterProps {
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
}

export function QuickFilter({ label, count, active, onClick }: QuickFilterProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
        active
          ? "bg-orange-500 text-white shadow-md shadow-orange-500/25"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
            active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"
          }`}
        >
          {count.toLocaleString()}
        </span>
      )}
    </button>
  );
}
