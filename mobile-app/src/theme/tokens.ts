/**
 * Design tokens for the Conference Room Booking mobile app.
 * Aligned with web-app navy/steel palette (manager-dashboard.css / auth.css).
 * Primary: navy #16324F · Steel accent #2F6690
 */

export const colors = {
  primary: '#16324F',
  primaryActive: '#102A43',
  primaryDisabled: '#B8C9D6',
  primaryError: '#C13515',
  steel: '#2F6690',
  steelLight: '#DCE8F1',
  canvas: '#FFFFFF',
  surfaceSoft: '#F4F7FA',
  surfaceStrong: '#EAF0F4',
  surfaceCard: '#FFFFFF',
  ink: '#1B2633',
  body: '#3F3F3F',
  muted: '#5C6B78',
  mutedSoft: '#8A9AAB',
  onPrimary: '#FFFFFF',
  hairline: '#C7D3DD',
  hairlineSoft: '#D9E2EA',
  borderStrong: '#A8B8C8',
  border: '#D9E2EA',
  success: '#008A05',
  warning: '#E07912',
  error: '#C13515',
  star: '#1B2633',
  scrim: 'rgba(16,42,67,0.4)',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 64,
} as const;

export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 32,
  full: 9999,
} as const;

export const typography = {
  displayXl: { fontSize: 28, fontWeight: '700' as const, lineHeight: 40, letterSpacing: 0 },
  displayLg: { fontSize: 22, fontWeight: '500' as const, lineHeight: 26, letterSpacing: -0.44 },
  displayMd: { fontSize: 21, fontWeight: '700' as const, lineHeight: 30, letterSpacing: 0 },
  displaySm: { fontSize: 20, fontWeight: '600' as const, lineHeight: 24, letterSpacing: -0.18 },
  titleLg: { fontSize: 20, fontWeight: '700' as const, lineHeight: 28, letterSpacing: 0 },
  titleMd: { fontSize: 16, fontWeight: '600' as const, lineHeight: 20, letterSpacing: 0 },
  titleSm: { fontSize: 16, fontWeight: '500' as const, lineHeight: 20, letterSpacing: 0 },
  bodyMd: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24, letterSpacing: 0 },
  bodySm: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20, letterSpacing: 0 },
  caption: { fontSize: 14, fontWeight: '500' as const, lineHeight: 18, letterSpacing: 0 },
  captionSm: { fontSize: 13, fontWeight: '400' as const, lineHeight: 16, letterSpacing: 0 },
  badge: { fontSize: 11, fontWeight: '600' as const, lineHeight: 13, letterSpacing: 0 },
  microLabel: { fontSize: 12, fontWeight: '700' as const, lineHeight: 16, letterSpacing: 0 },
  buttonMd: { fontSize: 16, fontWeight: '500' as const, lineHeight: 20, letterSpacing: 0 },
  buttonSm: { fontSize: 14, fontWeight: '500' as const, lineHeight: 18, letterSpacing: 0 },
} as const;

export const shadows = {
  card: {
    shadowColor: '#102A43',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  search: {
    shadowColor: '#102A43',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  soft: {
    shadowColor: '#102A43',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
} as const;
