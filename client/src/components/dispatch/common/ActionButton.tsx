import { cn } from "@/lib/utils";

interface ActionButtonProps {
  icon: React.ElementType;
  onClick: (e: React.MouseEvent) => void;
  title: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const variants = {
  default: 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800',
  success: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-600 hover:text-emerald-700 hover:shadow-emerald-200',
  warning: 'bg-amber-100 hover:bg-amber-200 text-amber-600 hover:text-amber-700 hover:shadow-amber-200',
  danger: 'bg-rose-100 hover:bg-rose-200 text-rose-600 hover:text-rose-700 hover:shadow-rose-200',
  info: 'bg-sky-100 hover:bg-sky-200 text-sky-600 hover:text-sky-700 hover:shadow-sky-200',
};

export function ActionButton({ icon: Icon, onClick, title, variant = 'default' }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-2.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95",
        variants[variant]
      )}
      title={title}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
