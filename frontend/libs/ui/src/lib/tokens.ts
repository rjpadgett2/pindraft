/**
 * TypeScript mirror of design tokens.
 *
 * The runtime source of truth is `tokens.css` — components style with
 * `var(--pd-…)` so dark mode / theming can later swap values without rebuilding.
 * Use this file when a TS-side value is genuinely needed (chart colors fed to a
 * canvas library, programmatic style calculations). For component CSS, always
 * prefer the CSS custom properties.
 */

export const PALETTE = {
  slate: {
    50:  '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
    400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
    800: '#1e293b', 900: '#0f172a',
  },
  blue: {
    50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6',
    600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af',
  },
  green: { 50: '#ecfdf5', 100: '#d1fae5', 600: '#059669', 700: '#047857', 800: '#065f46' },
  amber: { 50: '#fffbeb', 100: '#fef3c7', 600: '#d97706', 700: '#b45309', 800: '#92400e' },
  red:   { 50: '#fef2f2', 100: '#fee2e2', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b' },
} as const;

export type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export const SPACING = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 24, xl: 32, '2xl': 48,
} as const;
