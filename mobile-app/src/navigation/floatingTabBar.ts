import { Platform, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, radii, shadows } from '../theme/tokens';

/** Horizontal inset so the bar reads as a floating pill above the home indicator. */
export const FLOATING_TAB_MARGIN_H = 16;
/** Gap above the bottom edge / safe-area. */
export const FLOATING_TAB_MARGIN_BOTTOM = 12;
/** Visible bar height (icons + labels). */
export const FLOATING_TAB_HEIGHT = 64;

/**
 * Shared floating tab-bar chrome for Employee + Clerk navigators.
 * Pass `bottomInset` from `useSafeAreaInsets().bottom` so it clears the home indicator.
 */
export function getFloatingTabBarStyle(bottomInset = 0): ViewStyle {
  return {
    position: 'absolute',
    left: FLOATING_TAB_MARGIN_H,
    right: FLOATING_TAB_MARGIN_H,
    bottom: Math.max(bottomInset, FLOATING_TAB_MARGIN_BOTTOM),
    height: FLOATING_TAB_HEIGHT,
    borderRadius: radii.xl,
    backgroundColor: colors.white,
    borderTopWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairlineSoft,
    paddingTop: 8,
    paddingBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: shadows.search.shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
      default: {},
    }),
  };
}

export const floatingTabBarLabelStyle: TextStyle = {
  fontSize: 11,
  fontWeight: '600',
  marginBottom: 2,
};

/** Extra scroll padding so list content isn’t hidden under the floating bar. */
export function getFloatingTabContentPadding(bottomInset = 0): number {
  return (
    FLOATING_TAB_HEIGHT +
    Math.max(bottomInset, FLOATING_TAB_MARGIN_BOTTOM) +
    FLOATING_TAB_MARGIN_BOTTOM +
    8
  );
}
