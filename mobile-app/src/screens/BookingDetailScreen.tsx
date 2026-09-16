import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Booking, BookingStatus, Room } from '../types';
import { Button } from '../components/Button';
import { colors, radii, spacing, typography } from '../theme/tokens';
import api from '../api';

const statusMeta: Record<
  BookingStatus,
  { label: string; tone: string; tint: string }
> = {
  PENDING: { label: 'Pending Approval', tone: '#FFF3D6', tint: '#9A6B00' },
  CONFIRMED: { label: 'Confirmed', tone: '#F8E7C7', tint: '#B76A00' },
  PREPARING: { label: 'Preparing', tone: '#D9EBFF', tint: '#0056A8' },
  READY: { label: 'Ready', tone: '#DDF5E5', tint: '#0A7A3F' },
  COMPLETED: { label: 'Completed', tone: '#E8E9F7', tint: '#3E49A6' },
  CANCELLED: { label: 'Cancelled', tone: '#F9E1E1', tint: '#A32323' },
};

interface BookingDetailScreenProps {
  booking: Booking;
  onBack: () => void;
  onBookAgain: (room: Room) => void;
  onCancelled?: (booking: Booking) => void;
}

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function canCancelBooking(booking: Booking): { ok: boolean; reason?: string } {
  if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
    return { ok: false, reason: 'This booking can no longer be cancelled.' };
  }
  if (booking.status === 'PENDING') {
    return { ok: true };
  }
  const msUntilStart = new Date(booking.startAt).getTime() - Date.now();
  if (msUntilStart < SIX_HOURS_MS) {
    return {
      ok: false,
      reason: 'Approved bookings can only be cancelled at least 6 hours before the start time.',
    };
  }
  return { ok: true };
}

function formatWindow(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const dateOpts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  return `${s.toLocaleDateString([], dateOpts)} · ${s.toLocaleTimeString([], timeOpts)} – ${e.toLocaleTimeString([], timeOpts)}`;
}

export function BookingDetailScreen({
  booking: initial,
  onBack,
  onBookAgain,
  onCancelled,
}: BookingDetailScreenProps) {
  const [booking, setBooking] = useState(initial);
  const [cancelling, setCancelling] = useState(false);

  const room = booking.rooms[0]?.room;
  const meta = statusMeta[booking.status] ?? statusMeta.PENDING;
  const cancelGate = useMemo(() => canCancelBooking(booking), [booking]);

  // Prefer amenities on the room; fall back to requestedAmenities on the booking
  const amenities =
    room?.amenities?.length
      ? room.amenities
      : booking.requestedAmenities ?? [];

  const handleCancel = () => {
    if (!cancelGate.ok) {
      Alert.alert('Cannot cancel', cancelGate.reason || 'Not allowed.');
      return;
    }
    Alert.alert('Cancel booking', 'Are you sure you want to cancel this booking?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            const updated = await api.cancelBooking(booking.id);
            const next = {
              ...booking,
              status: (updated?.status as BookingStatus) || ('CANCELLED' as BookingStatus),
            };
            setBooking(next);
            onCancelled?.(next);
            Alert.alert('Cancelled', 'Your booking has been cancelled.');
          } catch (err: any) {
            Alert.alert('Could not cancel', err?.message || 'Please try again.');
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {room?.imageUrl ? (
          <View style={styles.imageWrap}>
            <Image source={{ uri: room.imageUrl }} style={styles.image} contentFit="cover" />
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.roomName}>{room?.name ?? 'Room'}</Text>
            <View style={[styles.statusPill, { backgroundColor: meta.tone }]}>
              <Text style={[styles.statusText, { color: meta.tint }]}>{meta.label}</Text>
            </View>
          </View>

          <Text style={styles.meta}>
            {room?.location || 'Main building'}
            {room?.floor ? ` · Floor ${room.floor}` : ''}
            {room?.capacity ? ` · Up to ${room.capacity} people` : ''}
          </Text>

          <Text style={styles.sectionLabel}>When</Text>
          <Text style={styles.body}>{formatWindow(booking.startAt, booking.endAt)}</Text>

          {!!booking.purpose && (
            <>
              <Text style={styles.sectionLabel}>Purpose</Text>
              <Text style={styles.body}>{booking.purpose}</Text>
            </>
          )}

          <Text style={styles.sectionLabel}>Amenities</Text>
          {amenities.length === 0 ? (
            <Text style={styles.muted}>No amenities listed for this room</Text>
          ) : (
            <View style={styles.amenitiesRow}>
              {amenities.map((a) => (
                <View key={a.id} style={styles.amenityChip}>
                  <Ionicons name={(a.icon as any) || 'checkmark-circle-outline'} size={14} color={colors.body} />
                  <Text style={styles.amenityText}>{a.name}</Text>
                </View>
              ))}
            </View>
          )}

          {room?.description ? (
            <>
              <Text style={styles.sectionLabel}>About this space</Text>
              <Text style={styles.body}>{room.description}</Text>
            </>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {cancelGate.ok && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={cancelling}>
            {cancelling ? (
              <ActivityIndicator color={colors.error} />
            ) : (
              <Text style={styles.cancelText}>Cancel booking</Text>
            )}
          </TouchableOpacity>
        )}
        {room && (
          <Button
            title="Book this room again"
            onPress={() => onBookAgain(room)}
            style={styles.cta}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
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
  content: { paddingBottom: spacing.section },
  imageWrap: {
    marginHorizontal: spacing.base,
    borderRadius: radii.lg,
    overflow: 'hidden',
    height: 180,
    backgroundColor: colors.surfaceSoft,
  },
  image: { width: '100%', height: '100%' },
  card: {
    marginTop: spacing.base,
    marginHorizontal: spacing.base,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  roomName: {
    ...typography.displaySm,
    color: colors.ink,
    flex: 1,
  },
  statusPill: {
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    ...typography.captionSm,
    fontWeight: '600',
  },
  meta: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: 6,
  },
  sectionLabel: {
    ...typography.titleSm,
    color: colors.ink,
    marginTop: spacing.lg,
    marginBottom: 6,
  },
  body: {
    ...typography.bodyMd,
    color: colors.body,
  },
  muted: {
    ...typography.bodySm,
    color: colors.muted,
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
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.base,
    borderTopWidth: 1,
    borderColor: colors.hairline,
    gap: spacing.sm,
    backgroundColor: colors.canvas,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#F0C4C0',
    backgroundColor: '#FDF6F5',
  },
  cancelText: {
    ...typography.buttonSm,
    color: colors.error,
  },
  cta: { width: '100%' },
});

export default BookingDetailScreen;
