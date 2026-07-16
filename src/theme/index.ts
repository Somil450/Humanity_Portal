// ─── One Humanity Portal — Unified Dark Theme ─────────────────────────────

export const COLORS = {
  // ── Brand / Primary ─────────────────────────────────────────────────────
  primary: '#22C55E',         // Emerald green — success, brand
  primaryDark: '#16A34A',
  primaryLight: '#4ADE80',
  primaryBg: '#052E16',

  // ── Accent Gold (Admin / Alerts / Key Metrics) ───────────────────────────
  gold: '#F0C040',
  goldDark: '#C49A10',
  goldBg: '#1C1800',

  // ── Accent Blue (Info / Links) ────────────────────────────────────────────
  info: '#3B82F6',
  infoBg: '#0C1829',

  // ── Accent Purple (On Leave / Special States) ─────────────────────────────
  purple: '#A855F7',
  purpleBg: '#180A2B',

  // ── Danger / Error ────────────────────────────────────────────────────────
  danger: '#EF4444',
  dangerDark: '#B91C1C',
  dangerBg: '#1C0A0A',

  // ── Warning ───────────────────────────────────────────────────────────────
  warning: '#F97316',
  warningBg: '#1C0D00',

  // ── Success (alias) ───────────────────────────────────────────────────────
  success: '#22C55E',
  successBg: '#052E16',

  // ── Secondary / Amber ────────────────────────────────────────────────────
  secondary: '#F59E0B',
  secondaryDark: '#D97706',

  // ── Background layers ─────────────────────────────────────────────────────
  bgDeep: '#080810',          // Deepest background — main screen bg
  bgCard: '#10101C',          // Card / surface
  bgElevated: '#18182A',      // Elevated cards, modals, popovers
  bgHighlight: '#20203A',     // Hover / pressed state

  // ── Borders ───────────────────────────────────────────────────────────────
  borderSubtle: '#1E1E30',    // Very subtle separator
  borderDefault: '#252538',   // Default card borders
  borderStrong: '#353550',    // Stronger border / dividers

  // ── Text ──────────────────────────────────────────────────────────────────
  textPrimary: '#F1F5F9',     // Main text
  textSecondary: '#8892A4',   // Subtext / labels
  textMuted: '#3D4560',       // Very faint / disabled

  // ── Legacy compatibility (used in services / older screens) ───────────────
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  darkBg: '#080810',
  darkCard: '#10101C',
  darkBorder: '#252538',
  darkText: '#F1F5F9',
  darkSubtext: '#8892A4',

  // ── Status ────────────────────────────────────────────────────────────────
  statusPresent: '#22C55E',
  statusAbsent: '#EF4444',
  statusAway: '#F59E0B',
  statusOnLeave: '#A855F7',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 30,
    display: 36,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
};

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  green: {
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  gold: {
    shadowColor: '#F0C040',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
};

export const PRIORITY_COLORS: Record<string, string> = {
  none: COLORS.textMuted,
  low: COLORS.info,
  medium: COLORS.warning,
  high: COLORS.danger,
  urgent: '#7C3AED',
  critical: '#7C3AED',
  normal: COLORS.textSecondary,
};

export const STATUS_COLORS: Record<string, string> = {
  'todo': COLORS.textSecondary,
  'in-progress': COLORS.info,
  'review': COLORS.secondary,
  'done': COLORS.success,
  'awaiting-review': COLORS.secondary,
  'completed': COLORS.success,
  'pending': COLORS.secondary,
  'approved': COLORS.success,
  'declined': COLORS.danger,
  'active': COLORS.success,
  'inactive': COLORS.textMuted,
};

export const ATTENDANCE_STATUS_COLORS: Record<string, string> = {
  'clocked-in': COLORS.statusPresent,
  'clocked-out': COLORS.info,
  'away': COLORS.statusAway,
  'absent': COLORS.statusAbsent,
  'on-leave': COLORS.statusOnLeave,
  'review-paused': COLORS.warning,
};

// ── Common reusable style patterns ────────────────────────────────────────────
export const CARD = {
  backgroundColor: COLORS.bgCard,
  borderRadius: RADIUS.lg,
  borderWidth: 1,
  borderColor: COLORS.borderDefault,
};

export const CARD_ELEVATED = {
  backgroundColor: COLORS.bgElevated,
  borderRadius: RADIUS.lg,
  borderWidth: 1,
  borderColor: COLORS.borderStrong,
};
