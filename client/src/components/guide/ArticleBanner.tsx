interface ArticleBannerProps {
  title?: string
  children: React.ReactNode
  variant?: "info" | "warning" | "success" | "default"
  className?: string
}

export function ArticleBanner({ 
  title, 
  children, 
  variant = "default",
  className = "" 
}: ArticleBannerProps) {
  const variantStyles = {
    info: "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200",
    warning: "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200",
    success: "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200",
    default: "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200",
  }

  return (
    <div className={`rounded-lg p-6 mt-8 border ${variantStyles[variant]} ${className}`}>
      {title && (
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {title}
        </h3>
      )}
      <div className="text-gray-700">
        {children}
      </div>
    </div>
  )
}

