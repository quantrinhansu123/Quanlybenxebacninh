import { activeTheme } from './theme-variants'

// Icon theme configuration using active theme
export const iconTheme = {
  ...activeTheme,
  
  // Size classes
  sizes: {
    sm: "h-3 w-3",
    md: "h-4 w-4", 
    lg: "h-5 w-5",
    xl: "h-6 w-6",
  }
}

// Helper function to get icon classes
export const getIconClasses = (
  type: keyof typeof iconTheme,
  size: keyof typeof iconTheme.sizes = 'md'
) => {
  const colorClass = typeof iconTheme[type] === 'string' ? iconTheme[type] : iconTheme.default
  const sizeClass = iconTheme.sizes[size]
  return `${colorClass} ${sizeClass}`
}

// Predefined combinations for common use cases
export const iconStyles = {
  editButton: getIconClasses('edit'),
  viewButton: getIconClasses('view'),
  deleteButton: getIconClasses('delete'),
  historyButton: getIconClasses('history'),
  warningIcon: getIconClasses('warning'),
  dangerIcon: getIconClasses('danger'),
  successIcon: getIconClasses('success'),
  infoIcon: getIconClasses('info'),
  navigationIcon: getIconClasses('navigation'),
}