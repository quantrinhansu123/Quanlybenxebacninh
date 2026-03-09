// Different color themes for icons
export const colorThemes = {
  // Default blue theme
  default: {
    edit: "text-blue-600 hover:text-blue-700",
    view: "text-green-600 hover:text-green-700", 
    delete: "text-red-600 hover:text-red-700",
    history: "text-purple-600 hover:text-purple-700",
    warning: "text-yellow-600",
    danger: "text-red-600",
    success: "text-green-600",
    info: "text-blue-600",
    navigation: "text-gray-600 hover:text-gray-700",
    default: "text-gray-500 hover:text-gray-600",
    muted: "text-gray-400",
  },

  // Professional gray theme
  professional: {
    edit: "text-slate-600 hover:text-slate-700",
    view: "text-slate-600 hover:text-slate-700", 
    delete: "text-red-600 hover:text-red-700",
    history: "text-slate-600 hover:text-slate-700",
    warning: "text-amber-600",
    danger: "text-red-600",
    success: "text-emerald-600",
    info: "text-slate-600",
    navigation: "text-slate-500 hover:text-slate-600",
    default: "text-slate-400 hover:text-slate-500",
    muted: "text-slate-300",
  },

  // Vibrant theme
  vibrant: {
    edit: "text-indigo-600 hover:text-indigo-700",
    view: "text-emerald-600 hover:text-emerald-700", 
    delete: "text-rose-600 hover:text-rose-700",
    history: "text-violet-600 hover:text-violet-700",
    warning: "text-orange-600",
    danger: "text-rose-600",
    success: "text-emerald-600",
    info: "text-sky-600",
    navigation: "text-gray-600 hover:text-gray-700",
    default: "text-gray-500 hover:text-gray-600",
    muted: "text-gray-400",
  },

  // Minimal theme
  minimal: {
    edit: "text-gray-700 hover:text-gray-800",
    view: "text-gray-700 hover:text-gray-800", 
    delete: "text-gray-700 hover:text-gray-800",
    history: "text-gray-700 hover:text-gray-800",
    warning: "text-gray-700",
    danger: "text-gray-700",
    success: "text-gray-700",
    info: "text-gray-700",
    navigation: "text-gray-600 hover:text-gray-700",
    default: "text-gray-500 hover:text-gray-600",
    muted: "text-gray-400",
  }
}

// Current active theme - change this to switch themes globally
export const ACTIVE_THEME: keyof typeof colorThemes = 'default'

// Export the active theme
export const activeTheme = colorThemes[ACTIVE_THEME]