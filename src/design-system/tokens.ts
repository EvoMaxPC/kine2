/**
 * @file tokens.ts
 * @description Centralized design tokens for Consultorio Kinesiológico (Section 15).
 * 
 * DESIGN CONSTITUTION:
 * - Canvas: Warm white / light sage-tinted gray (bg-stone-50 / #F8FAF9)
 * - Surfaces: Pure white (#FFFFFF) with 1px border lines (border-stone-200/80)
 * - Primary: Professional deep teal / sage (#0D5C52 / text-teal-800 / bg-teal-700)
 * - Secondary: Soft clinical desaturated blue (#335C67 / text-slate-700)
 * - Accents: Soft mint (#E6F4F1 / bg-teal-50)
 * - Text: Dark charcoal with warm green undertone (#1C2421)
 */

export const DESIGN_TOKENS = {
  colors: {
    canvas: 'bg-[#F8FAF9]',
    surface: 'bg-white',
    surfaceSubtle: 'bg-stone-50/80',
    border: 'border-stone-200/80',
    borderSubtle: 'border-stone-100',
    textPrimary: 'text-[#1C2421]',
    textSecondary: 'text-stone-500',
    textMuted: 'text-stone-400',
    primary: 'bg-[#0D5C52] text-white hover:bg-[#0A473F]',
    primaryMuted: 'bg-teal-50 text-teal-800 border border-teal-200/60',
    status: {
      confirmed: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
      pending: 'bg-amber-50 text-amber-900 border-amber-200/80',
      cancelled: 'bg-rose-50 text-rose-800 border-rose-200/80',
      completed: 'bg-slate-50 text-slate-700 border-slate-200',
      noShow: 'bg-rose-50 text-rose-700 border-rose-200',
      available: 'bg-teal-50/50 text-teal-800 border-dashed border-teal-200/60',
    },
  },
  typography: {
    fontSans: 'font-sans',
    fontMono: 'font-mono tabular-nums',
  },
} as const;
