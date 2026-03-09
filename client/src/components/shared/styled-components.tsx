import React from "react";

// Reusable styled components - Professional Light Theme with bold visual changes
// Based on Gemini AI analysis for modern SaaS UI

export const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`
    relative overflow-hidden rounded-xl
    bg-white border border-gray-200
    shadow-sm
    transition-all duration-200
    ${className}
  `}>
    {children}
  </div>
);

export const SectionHeader = ({ icon: Icon, title, badge, action }: {
  icon: React.ElementType;
  title: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-blue-600 text-white">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {badge}
    </div>
    {action}
  </div>
);

export const FormField = ({ label, required, error, children, className = "" }: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`mb-3 ${className}`}>
    <label className="block text-xs font-medium text-gray-600 mb-1">
      {label}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
    {children}
    {error && (
      <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {error}
      </p>
    )}
  </div>
);

export const StyledInput = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={`
      w-full h-9 px-3 py-2 rounded-lg
      bg-white border border-gray-300
      text-sm text-gray-900 placeholder-gray-400
      hover:border-gray-400
      focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
      transition-all duration-150
      disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50
      ${className}
    `}
    {...props}
  />
);

export const StyledSelect = ({ className = "", children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={`
      w-full h-9 px-3 py-2 rounded-lg
      bg-white border border-gray-300
      text-sm text-gray-900
      hover:border-gray-400
      focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
      transition-all duration-150
      disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50
      cursor-pointer
      ${className}
    `}
    {...props}
  >
    {children}
  </select>
);

// Empty state placeholder component with improved visual
export const EmptyState = ({ icon: Icon, message, action }: { 
  icon: React.ElementType; 
  message: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center min-h-[160px] py-8 bg-gradient-to-b from-gray-50 to-white rounded-xl border-2 border-dashed border-gray-200">
    <div className="p-4 rounded-2xl bg-gray-100 mb-4">
      <Icon className="w-10 h-10 text-gray-400" />
    </div>
    <p className="text-base font-medium text-gray-500 mb-3">{message}</p>
    {action}
  </div>
);

// Action Button styles
export const ActionButton = ({ 
  children, 
  variant = "primary", 
  size = "md",
  className = "", 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}) => {
  const variants = {
    primary: "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:from-blue-700 hover:to-blue-600",
    secondary: "bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 shadow-sm",
    danger: "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40 hover:from-rose-600 hover:to-red-600",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900"
  };
  
  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-11 px-5 text-base",
    lg: "h-12 px-6 text-lg"
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl font-semibold
        transition-all duration-200 ease-out
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        active:scale-[0.98]
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

// Badge component
export const Badge = ({ 
  children, 
  variant = "default",
  size = "md",
  className = "" 
}: { 
  children: React.ReactNode; 
  variant?: "default" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md" | "lg";
  className?: string;
}) => {
  const variants = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-rose-100 text-rose-700",
    info: "bg-blue-100 text-blue-700"
  };
  
  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  };

  return (
    <span className={`
      inline-flex items-center font-semibold rounded-full
      ${variants[variant]}
      ${sizes[size]}
      ${className}
    `}>
      {children}
    </span>
  );
};
