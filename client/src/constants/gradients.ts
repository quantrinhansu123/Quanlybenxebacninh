/**
 * Shared gradient constants for consistent styling across components
 */

export const GRADIENTS = {
  // Primary gradients
  blue: "from-blue-500 to-indigo-600",
  emerald: "from-emerald-500 to-teal-600",
  amber: "from-amber-500 to-orange-600",
  rose: "from-rose-500 to-red-600",
  violet: "from-violet-500 to-purple-600",
  cyan: "from-cyan-500 to-blue-500",

  // Slate/Gray gradients
  slate: "from-slate-800 via-slate-900 to-slate-950",
  slateLight: "from-slate-100 to-slate-200",

  // Card background gradients
  cardBlue: "from-blue-50 to-cyan-50",
  cardEmerald: "from-emerald-50 to-teal-50",
  cardAmber: "from-amber-50 to-orange-50",
  cardRose: "from-rose-50 to-red-50",
  cardViolet: "from-violet-50 to-purple-50",

  // Hero gradients (for large sections)
  heroBlue: "from-blue-600 via-indigo-600 to-violet-600",
  heroOrange: "from-orange-500 via-amber-500 to-yellow-500",
} as const;

export const GLOW_SHADOWS = {
  blue: "shadow-blue-500/25",
  emerald: "shadow-emerald-500/25",
  amber: "shadow-amber-500/25",
  rose: "shadow-rose-500/25",
  violet: "shadow-violet-500/25",
  cyan: "shadow-cyan-500/25",
} as const;

export type GradientKey = keyof typeof GRADIENTS;
export type GlowShadowKey = keyof typeof GLOW_SHADOWS;
