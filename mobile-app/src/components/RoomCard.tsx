import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Room } from '../types';
import { colors, radii, spacing, typography, shadows } from '../theme/tokens';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - spacing.base * 2;

interface RoomCardProps {
  room: Room;
  onPress: (room: Room) => void;
  onToggleFavorite?: (room: Room) => void;
  showFavorite?: boolean;
}

export function RoomCard({
  room,
  onPress,
  onToggleFavorite,
  showFavorite,
}: RoomCardProps) {
  const isUnavailable = room.status !== 'AVAILABLE';
  const showHeart = showFavorite ?? Boolean(onToggleFavorite);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => onPress(room)}
      style={styles.card}
    >
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: room.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
        {room.isFavorite && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Favorite</Text>
          </View>
        )}
        {showHeart && (
          <TouchableOpacity
            style={[styles.heart, room.isFavorite && styles.heartActive]}
            onPress={(e) => {
              e?.stopPropagation?.();
              onToggleFavorite?.(room);
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={room.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Ionicons
              name={room.isFavorite ? 'heart' : 'heart-outline'}
              size={20}
              color={room.isFavorite ? '#E11D48' : colors.ink}
            />
          </TouchableOpacity>
        )}
        {isUnavailable && (
          <View style={styles.unavailableOverlay}>
            <Text style={styles.unavailableText}>
              {room.status === 'MAINTENANCE' ? 'Maintenance' : 'Unavailable'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.meta}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {room.name}
          </Text>
          {room.rating != null && (
            <View style={styles.rating}>
              <Ionicons name="star" size={12} color={colors.star} />
              <Text style={styles.ratingText}>{room.rating.toFixed(2)}</Text>
            </View>
          )}
        </View>

        <Text style={styles.subtitle} numberOfLines={1}>
          {room.location || 'Main building'} · Floor {room.floor || 'G'} · Up to {room.capacity}{' '}
          people
        </Text>

        <View style={styles.amenitiesRow}>
          {(room.amenities || []).slice(0, 3).map((a) => (
            <View key={a.id} style={styles.amenityChip}>
              <Ionicons name={a.icon as any} size={12} color={colors.muted} />
              <Text style={styles.amenityText}>{a.name}</Text>
            </View>
          ))}
          {(room.amenities || []).length > 3 && (
            <Text style={styles.moreAmenities}>+{room.amenities.length - 3}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginBottom: spacing.md,
    backgroundColor: colors.canvas,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.card,
  },
  imageWrap: {
    width: '100%',
    height: 180,
    backgroundColor: colors.surfaceSoft,
  },
  image: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: colors.canvas,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  badgeText: {
    ...typography.captionSm,
    color: colors.ink,
    fontWeight: '600',
  },
  heart: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    zIndex: 2,
    elevation: 3,
  },
  heartActive: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16,42,67,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableText: {
    ...typography.titleSm,
    color: colors.onPrimary,
  },
  meta: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    ...typography.titleMd,
    color: colors.ink,
    flex: 1,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    ...typography.captionSm,
    color: colors.ink,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: 4,
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
  },
  amenityText: {
    ...typography.captionSm,
    color: colors.muted,
  },
  moreAmenities: {
    ...typography.captionSm,
    color: colors.muted,
    alignSelf: 'center',
  },
});
