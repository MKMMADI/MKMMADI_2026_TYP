import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography, shadows } from '../theme/tokens';
import { format } from 'date-fns';

function formatWhen(start, end) {
  if (!start || !end) return 'Any time';
  return `${format(start, 'MMM d, HH:mm')} – ${format(end, 'HH:mm')}`;
}

export function SearchBar({ filters, onPress, compact = false }) {
  const hasFilters =
    filters.startAt || filters.endAt || filters.capacity > 1 || (filters.amenityIds && filters.amenityIds.length > 0);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.container, compact && styles.compact, shadows.search]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="search" size={18} color={colors.ink} />
      </View>

      <View style={styles.content}>
        {hasFilters ? (
          <>
            <Text style={styles.primaryLine} numberOfLines={1}>
              {filters.capacity > 1
                ? `${filters.capacity}+ people`
                : 'Any capacity'}
              {filters.amenityIds && filters.amenityIds.length > 0
                ? ` · ${filters.amenityIds.length} amenit${filters.amenityIds.length === 1 ? 'y' : 'ies'}`
                : ''}
            </Text>
            <Text style={styles.secondaryLine} numberOfLines={1}>
              {formatWhen(filters.startAt, filters.endAt)}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.primaryLine}>Find a conference room</Text>
            <Text style={styles.secondaryLine}>Date · Time · Capacity · Amenities</Text>
          </>
        )}
      </View>

      <View style={styles.orb}>
        <Ionicons name="options-outline" size={18} color={colors.onPrimary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderRadius: radii.full,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 8,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginHorizontal: spacing.base,
  },
  compact: { marginHorizontal: 0 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, paddingHorizontal: 4 },
  primaryLine: { ...typography.caption, color: colors.ink },
  secondaryLine: { ...typography.captionSm, color: colors.muted, marginTop: 1 },
  orb: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
