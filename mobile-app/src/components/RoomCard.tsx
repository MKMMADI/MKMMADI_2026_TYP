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
}

export function RoomCard({ room, onPress, onToggleFavorite }: RoomCardProps) {
  const isUnavailable = room.status !== 'AVAILABLE';

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
            <Text style={styles.badgeText}>Guest favorite</Text>
          </View>
        )}
        {onToggleFavorite && (
          <TouchableOpacity
            style={styles.heart}
            onPress={() => onToggleFavorite(room)}
            hitSlop={12}
          >
            <Ionicons
              name={room.isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={room.isFavorite ? colors.primary : colors.onPrimary}
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
          {room.location} · Floor {room.floor} · Up to {room.capacity} people
        </Text>

        <View style={styles.amenitiesRow}>
          {room.amenities.slice(0, 3).map((a) => (
            <View key={a.id} style={styles.amenityChip}>
              <Ionicons name={a.icon as any} size={12} color={colors.muted} />
              <Text style={styles.amenityText}>{a.name}</Text>
            </View>
          ))}
          {room.amenities.length > 3 && (
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
    marginBottom: spacing.lg,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceStrong,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: spacing.sm + 2,
    left: spacing.sm + 2,
    backgroundColor: colors.canvas,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    ...shadows.soft,
  },
  badgeText: {
    ...typography.badge,
    color: colors.ink,
  },
  heart: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableText: {
    ...typography.titleMd,
    color: colors.onPrimary,
  },
  meta: {
    paddingTop: spacing.md,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    ...typography.titleMd,
    color: colors.ink,
    flex: 1,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    ...typography.caption,
    color: colors.ink,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.muted,
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
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
