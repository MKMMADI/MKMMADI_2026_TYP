import React from 'react';
import { Platform, StyleSheet, View, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../theme/tokens';

/** Horizontal inset — larger = narrower floating bar. */
export const FLOATING_TAB_MARGIN_H = 28;
/** Gap above the bottom edge / safe-area. */
export const FLOATING_TAB_MARGIN_BOTTOM = 12;
/** Visible bar height (icons + labels). */
export const FLOATING_TAB_HEIGHT = 62;

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
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 6,
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
  fontSize: 10,
  fontWeight: '600',
  marginBottom: 0,
  marginTop: 2,
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

const indicatorStyles = StyleSheet.create({
  /** Active indicator (selected tab pill) around the icon. */
  pill: {
    width: 44,
    height: 28,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: colors.steelLight,
  },
  pillIdle: {
    backgroundColor: 'transparent',
  },
});

export type TabIconName = keyof typeof Ionicons.glyphMap;

/**
 * Icon + active indicator pill for the focused tab.
 * Design term: “active indicator” (also called selected pill / tab highlight).
 */
export function FloatingTabIcon({
  name,
  focused,
  color,
  size = 22,
}: {
  name: TabIconName;
  focused: boolean;
  color: string;
  size?: number;
}) {
  return (
    <View style={[indicatorStyles.pill, focused ? indicatorStyles.pillActive : indicatorStyles.pillIdle]}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}
