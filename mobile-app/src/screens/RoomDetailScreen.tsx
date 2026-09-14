import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Room } from '../types';
import { Button } from '../components/Button';
import { colors, radii, spacing, typography, shadows } from '../theme/tokens';

interface RoomDetailScreenProps {
  room: Room;
  onBack: () => void;
  onBook: () => void;
}

export function RoomDetailScreen({ room, onBack, onBook }: RoomDetailScreenProps) {
  const isAvailable = room.status === 'AVAILABLE';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Room details</Text>
        </View>

        <View style={styles.imageWrap}>
          <Image source={{ uri: room.imageUrl }} style={styles.image} contentFit="cover" transition={200} />
          {!isAvailable && (
            <View style={styles.overlay}>
              <Text style={styles.overlayText}>Unavailable</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{room.name}</Text>
            {room.rating != null && (
              <View style={styles.ratingChip}>
                <Ionicons name="star" size={12} color={colors.star} />
                <Text style={styles.ratingText}>{room.rating.toFixed(2)}</Text>
              </View>
            )}
          </View>

          <Text style={styles.meta}>
            {room.location || 'Main building'} · Floor {room.floor || 'G'} · Up to {room.capacity} people
          </Text>

          <View style={styles.statusRow}>
            <View style={[styles.statusPill, isAvailable ? styles.statusAvailable : styles.statusUnavailable]}>
              <Text style={[styles.statusText, !isAvailable && styles.statusTextUnavailable]}>
                {isAvailable ? 'Available now' : room.status}
              </Text>
            </View>
          </View>

          <Text style={styles.description}>{room.description}</Text>

          <Text style={styles.sectionLabel}>Amenities</Text>
          <View style={styles.amenitiesRow}>
            {room.amenities.map((amenity) => (
              <View key={amenity.id} style={styles.amenityChip}>
                <Ionicons name={amenity.icon as any} size={14} color={colors.body} />
                <Text style={styles.amenityText}>{amenity.name}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>From</Text>
          <Text style={styles.footerPrice}>R 550 / hour</Text>
        </View>
        <Button title={isAvailable ? 'Book room' : 'Unavailable'} onPress={onBook} disabled={!isAvailable} style={styles.cta} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingBottom: spacing.section },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.titleMd,
    color: colors.ink,
    marginLeft: spacing.sm,
  },
  imageWrap: {
    marginHorizontal: spacing.base,
    borderRadius: radii.xl,
    overflow: 'hidden',
    height: 260,
    ...shadows.card,
  },
  image: { width: '100%', height: '100%' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayText: {
    ...typography.titleMd,
    color: colors.onPrimary,
  },
  card: {
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    backgroundColor: colors.canvas,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.base,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.displaySm,
    color: colors.ink,
    flex: 1,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ratingText: {
    ...typography.caption,
    color: colors.ink,
  },
  meta: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: 8,
  },
  statusRow: { marginTop: spacing.md },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  statusAvailable: { backgroundColor: '#E8F7ED' },
  statusUnavailable: { backgroundColor: '#F9E9E7' },
  statusText: {
    ...typography.captionSm,
    color: colors.success,
  },
  statusTextUnavailable: { color: colors.error },
  description: {
    ...typography.bodyMd,
    color: colors.body,
    marginTop: spacing.md,
    lineHeight: 24,
  },
  sectionLabel: {
    ...typography.titleMd,
    color: colors.ink,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
  },
  amenityText: {
    ...typography.captionSm,
    color: colors.body,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.base,
    borderTopWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.canvas,
  },
  footerLabel: {
    ...typography.captionSm,
    color: colors.muted,
  },
  footerPrice: {
    ...typography.titleMd,
    color: colors.ink,
  },
  cta: { minWidth: 150 },
});

export default RoomDetailScreen;
