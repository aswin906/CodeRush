/**
 * AgroSense Design System Tokens & Status Color Mapping
 */

export type ShipmentStatus = 'OPTIMAL' | 'WARNING' | 'CRITICAL' | 'LIQUIDATING' | 'LIQUIDATED' | 'EXPIRED' | 'SOLD_OUT';

export interface StatusConfig {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  progressGradient: string;
  glow: string;
  hex: string;
}

/**
 * Strict status color mapping:
 * - OPTIMAL: green (emerald)
 * - WARNING: amber
 * - CRITICAL: red (rose)
 * - LIQUIDATING: orange
 * - LIQUIDATED: blue (sky)
 * - EXPIRED: gray (slate)
 * - SOLD_OUT: violet / purple
 */
export const STATUS_MAP: Record<ShipmentStatus, StatusConfig> = {
  OPTIMAL: {
    label: 'OPTIMAL',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/30',
    progressGradient: 'from-emerald-500 to-teal-400',
    glow: 'glow-emerald',
    hex: '#10b981',
  },
  WARNING: {
    label: 'WARNING',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-500/30',
    progressGradient: 'from-amber-500 to-yellow-400',
    glow: 'glow-amber',
    hex: '#f59e0b',
  },
  CRITICAL: {
    label: 'CRITICAL',
    badgeBg: 'bg-rose-500/10',
    badgeText: 'text-rose-400',
    badgeBorder: 'border-rose-500/30',
    progressGradient: 'from-rose-500 to-red-400',
    glow: 'glow-rose',
    hex: '#f43f5e',
  },
  LIQUIDATING: {
    label: 'LIQUIDATING',
    badgeBg: 'bg-orange-500/10',
    badgeText: 'text-orange-400',
    badgeBorder: 'border-orange-500/30',
    progressGradient: 'from-orange-500 to-amber-500',
    glow: 'glow-orange',
    hex: '#f97316',
  },
  LIQUIDATED: {
    label: 'LIQUIDATED',
    badgeBg: 'bg-sky-500/10',
    badgeText: 'text-sky-400',
    badgeBorder: 'border-sky-500/30',
    progressGradient: 'from-sky-500 to-blue-500',
    glow: 'glow-sky',
    hex: '#0ea5e9',
  },
  EXPIRED: {
    label: 'EXPIRED',
    badgeBg: 'bg-slate-800',
    badgeText: 'text-slate-400',
    badgeBorder: 'border-slate-700',
    progressGradient: 'from-slate-600 to-slate-700',
    glow: '',
    hex: '#64748b',
  },
  SOLD_OUT: {
    label: 'SOLD OUT',
    badgeBg: 'bg-purple-500/10',
    badgeText: 'text-purple-400',
    badgeBorder: 'border-purple-500/30',
    progressGradient: 'from-purple-600 to-indigo-500',
    glow: 'glow-purple',
    hex: '#a855f7',
  },
};

export const getStatusConfig = (status: string): StatusConfig => {
  return STATUS_MAP[status as ShipmentStatus] || {
    label: status,
    badgeBg: 'bg-slate-800',
    badgeText: 'text-slate-300',
    badgeBorder: 'border-slate-700',
    progressGradient: 'from-slate-600 to-slate-700',
    glow: '',
    hex: '#94a3b8',
  };
};
