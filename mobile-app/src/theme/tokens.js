/**
 * Airbnb-inspired design tokens for the Conference Room Booking mobile app.
 * Primary brand voltage: Rausch #FF385C
 */

export const colors = {
  primary: '#FF385C',
  primaryActive: '#E00B41',
  primaryDisabled: '#FFD1DA',
  primaryError: '#C13515',
  canvas: '#FFFFFF',
  surfaceSoft: '#F7F7F7',
  surfaceStrong: '#F2F2F2',
  surfaceCard: '#FFFFFF',
  ink: '#222222',
  body: '#3F3F3F',
  muted: '#6A6A6A',
  mutedSoft: '#929292',
  onPrimary: '#FFFFFF',
  hairline: '#DDDDDD',
  hairlineSoft: '#EBEBEB',
  borderStrong: '#C1C1C1',
  success: '#008A05',
  warning: '#E07912',
  error: '#C13515',
  star: '#222222',
  scrim: 'rgba(0,0,0,0.4)',
};

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
};

export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 32,
  full: 9999,
};

export const typography = {
  displayXl: { fontSize: 28, fontWeight: '700', lineHeight: 40, letterSpacing: 0 },
  displayLg: { fontSize: 22, fontWeight: '500', lineHeight: 26, letterSpacing: -0.44 },
  displayMd: { fontSize: 21, fontWeight: '700', lineHeight: 30, letterSpacing: 0 },
  displaySm: { fontSize: 20, fontWeight: '600', lineHeight: 24, letterSpacing: -0.18 },
  titleMd: { fontSize: 16, fontWeight: '600', lineHeight: 20, letterSpacing: 0 },
  titleSm: { fontSize: 16, fontWeight: '500', lineHeight: 20, letterSpacing: 0 },
  bodyMd: { fontSize: 16, fontWeight: '400', lineHeight: 24, letterSpacing: 0 },
  bodySm: { fontSize: 14, fontWeight: '400', lineHeight: 20, letterSpacing: 0 },
  caption: { fontSize: 14, fontWeight: '500', lineHeight: 18, letterSpacing: 0 },
  captionSm: { fontSize: 13, fontWeight: '400', lineHeight: 16, letterSpacing: 0 },
  badge: { fontSize: 11, fontWeight: '600', lineHeight: 13, letterSpacing: 0 },
  buttonMd: { fontSize: 16, fontWeight: '500', lineHeight: 20, letterSpacing: 0 },
  buttonSm: { fontSize: 14, fontWeight: '500', lineHeight: 18, letterSpacing: 0 },
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  search: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
};
