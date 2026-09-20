import React, { useEffect, useMemo, useState } from 'react';
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
import { colors, radii, spacing, typography } from '../theme/tokens';
import api from '../api';

interface RoomDetailScreenProps {
  room: Room;
  onBack: () => void;
  onBook: () => void;
}

interface UpcomingSlot {
  bookingId: number | string;
  startAt: string;
  endAt: string;
  status: string;
}

const HOUR_MS = 60 * 60 * 1000;

function formatSlot(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const dateOpts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  return `${s.toLocaleDateString([], dateOpts)} · ${s.toLocaleTimeString([], timeOpts)} – ${e.toLocaleTimeString([], timeOpts)}`;
}

export function RoomDetailScreen({ room, onBack, onBook }: RoomDetailScreenProps) {
  const [upcoming, setUpcoming] = useState<UpcomingSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [isFavorite, setIsFavorite] = useState(Boolean(room?.isFavorite));

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingSlots(true);
      try {
        const from = new Date().toISOString();
        const to = new Date(Date.now() + 30 * 24 * HOUR_MS).toISOString();
        const slots = await api.getOccupancy(from, to);
        if (!mounted || !Array.isArray(slots)) return;
        const forRoom = (slots as any[])
          .filter((s) => String(s.roomId) === String(room.id))
          .filter((s) => new Date(s.endAt).getTime() > Date.now())
          .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
          .slice(0, 5)
          .map((s) => ({
            bookingId: s.bookingId,
            startAt: s.startAt,
            endAt: s.endAt,
            status: s.status,
          }));
        setUpcoming(forRoom);
      } catch (err) {
        console.warn('Failed to load upcoming bookings', err);
        setUpcoming([]);
      } finally {
        if (mounted) setLoadingSlots(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [room.id]);

  const busyNow = useMemo(() => {
    const t = Date.now();
    return upcoming.some((s) => {
      const start = new Date(s.startAt).getTime();
      const end = new Date(s.endAt).getTime();
      return start - HOUR_MS <= t && t < end;
    });
  }, [upcoming]);

  const opsUnavailable = room.status !== 'AVAILABLE';
  const isAvailable = !opsUnavailable; // booking still allowed; occupancy is informational

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Room details</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={async () => {
              try {
                const result = await api.toggleFavorite(room.id);
                setIsFavorite(Boolean(result?.isFavorite));
              } catch (err) {
                console.warn('Favorite toggle failed', err);
              }
            }}
            hitSlop={12}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? '#E11D48' : colors.ink}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.imageWrap}>
          <Image source={{ uri: room.imageUrl }} style={styles.image} contentFit="cover" transition={200} />
          {opsUnavailable && (
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
            <View
              style={[
                styles.statusPill,
                opsUnavailable ? styles.statusUnavailable : busyNow ? styles.statusBusy : styles.statusAvailable,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  (opsUnavailable || busyNow) && styles.statusTextUnavailable,
                ]}
              >
                {opsUnavailable
                  ? room.status
                  : busyNow
                    ? 'In use / starting soon'
                    : 'Available now'}
              </Text>
            </View>
          </View>

          <Text style={styles.description}>{room.description}</Text>

          <Text style={styles.sectionLabel}>Amenities</Text>
          <View style={styles.amenitiesRow}>
            {(room.amenities || []).length === 0 ? (
              <Text style={styles.muted}>No amenities listed</Text>
            ) : (
              room.amenities.map((amenity) => (
                <View key={amenity.id} style={styles.amenityChip}>
                  <Ionicons name={amenity.icon as any} size={14} color={colors.body} />
                  <Text style={styles.amenityText}>{amenity.name}</Text>
                </View>
              ))
            )}
          </View>

          <Text style={styles.sectionLabel}>Upcoming bookings</Text>
          {loadingSlots ? (
            <Text style={styles.muted}>Loading schedule…</Text>
          ) : upcoming.length === 0 ? (
            <View style={styles.emptySchedule}>
              <Ionicons name="calendar-outline" size={22} color={colors.muted} />
              <Text style={styles.muted}>No upcoming bookings for this space</Text>
            </View>
          ) : (
            upcoming.map((slot) => (
              <View key={`${slot.bookingId}-${slot.startAt}`} style={styles.slotRow}>
                <Ionicons name="time-outline" size={16} color={colors.steel} />
                <Text style={styles.slotText}>{formatSlot(slot.startAt, slot.endAt)}</Text>
                <Text style={styles.slotStatus}>{slot.status}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={opsUnavailable ? 'Unavailable' : 'Book room'}
          onPress={onBook}
          disabled={opsUnavailable}
          fullWidth
        />
      </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  body: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: spacing.lg },
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
  heartBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    marginHorizontal: spacing.base,
    borderRadius: radii.lg,
    overflow: 'hidden',
    height: 200,
    backgroundColor: colors.surfaceSoft,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(16,42,67,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayText: { ...typography.titleMd, color: colors.white },
  card: {
    marginTop: spacing.base,
    marginHorizontal: spacing.base,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.base,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { ...typography.displaySm, color: colors.ink, flex: 1 },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  ratingText: { ...typography.captionSm, color: colors.ink },
  meta: { ...typography.bodySm, color: colors.muted, marginTop: 6 },
  statusRow: { marginTop: spacing.sm },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusAvailable: { backgroundColor: '#E8F7ED' },
  statusBusy: { backgroundColor: '#FFF3D6' },
  statusUnavailable: { backgroundColor: '#F9E1E1' },
  statusText: { ...typography.captionSm, color: colors.success, fontWeight: '600' },
  statusTextUnavailable: { color: colors.body },
  description: { ...typography.bodyMd, color: colors.body, marginTop: spacing.md },
  sectionLabel: { ...typography.titleSm, color: colors.ink, marginTop: spacing.lg, marginBottom: 8 },
  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
  },
  amenityText: { ...typography.captionSm, color: colors.body },
  muted: { ...typography.bodySm, color: colors.muted },
  emptySchedule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairlineSoft,
  },
  slotText: { ...typography.bodySm, color: colors.ink, flex: 1 },
  slotStatus: { ...typography.captionSm, color: colors.muted },
  footer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.base,
    borderTopWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.canvas,
  },
});

export default RoomDetailScreen;
