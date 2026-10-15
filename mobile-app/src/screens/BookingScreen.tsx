import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  format,
  isBefore,
  startOfDay,
} from 'date-fns';
import { Room } from '../types';
import { Button } from '../components/Button';
import { NativeDateTimePicker } from '../components/NativeDateTimePicker';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { useAppTheme } from '../theme/AppTheme';
import type { ColorPalette } from '../theme/tokens';

interface BookingScreenProps {
  rooms: Room[];
  onBack: () => void;
  onConfirm: (payload: {
    purpose: string;
    startAt: string;
    endAt: string;
    roomIds: string[];
    amenityIds: string[];
    capacity: number;
  }) => Promise<void> | void;
}

const MIN_HOUR_24 = 6;
const MAX_HOUR_24 = 20; // inclusive end boundary for meeting end

function createTime(hour: number, minute: number) {
  const time = new Date();
  time.setHours(hour, minute, 0, 0);
  return time;
}

function combineDateAndTime(date: Date, time: Date) {
  const d = new Date(date);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return d;
}

function inBusinessHours(d: Date, isEnd = false) {
  const mins = d.getHours() * 60 + d.getMinutes();
  const min = MIN_HOUR_24 * 60;
  const max = MAX_HOUR_24 * 60;
  if (isEnd) return mins > min && mins <= max;
  return mins >= min && mins < max;
}

export function BookingScreen({ rooms, onBack, onConfirm }: BookingScreenProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [purpose, setPurpose] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [startTime, setStartTime] = useState<Date>(() => createTime(9, 0));
  const [endTime, setEndTime] = useState<Date>(() => createTime(10, 0));
  const [selectedRooms, setSelectedRooms] = useState<Room[]>(rooms);
  const [attendeeCount, setAttendeeCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const totalCapacity = selectedRooms.reduce((total, item) => total + item.capacity, 0);
  const availableAmenities = useMemo(() => {
    const firstRoomAmenities = selectedRooms[0]?.amenities || [];
    return firstRoomAmenities.filter((amenity) =>
      selectedRooms.every((room) => room.amenities.some((candidate) => candidate.id === amenity.id)),
    );
  }, [selectedRooms]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  React.useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    });

    return () => subscription.remove();
  }, []);

  const preview = useMemo(() => {
    const start = combineDateAndTime(selectedDate, startTime);
    const end = combineDateAndTime(selectedDate, endTime);
    return `${format(start, 'EEE d MMM')} · ${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`;
  }, [selectedDate, startTime, endTime]);

  function toggleAmenity(id: string) {
    setSelectedAmenities((prev) =>
      Array.isArray(prev) && prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...(Array.isArray(prev) ? prev : []), id],
    );
  }

  function removeRoom(roomId: string) {
    if (selectedRooms.length <= 1) return;

    const nextRooms = selectedRooms.filter((room) => room.id !== roomId);
    const sharedAmenityIds = new Set(
      (nextRooms[0]?.amenities || [])
        .filter((amenity) =>
          nextRooms.every((room) => room.amenities.some((candidate) => candidate.id === amenity.id)),
        )
        .map((amenity) => amenity.id),
    );
    setSelectedRooms(nextRooms);
    setSelectedAmenities((currentAmenities) =>
      currentAmenities.filter((amenityId) => sharedAmenityIds.has(amenityId)),
    );
    const nextCapacity = nextRooms.reduce((total, room) => total + room.capacity, 0);
    setAttendeeCount((currentCount) => Math.min(currentCount, nextCapacity));
    setBookingError(null);
  }

  async function handleSubmit() {
    if (!purpose.trim()) {
      Alert.alert('Missing purpose', 'Please add a short meeting purpose.');
      return;
    }

    const start = combineDateAndTime(selectedDate, startTime);
    const end = combineDateAndTime(selectedDate, endTime);
    if (end <= start) {
      Alert.alert('Invalid window', 'End time must be after start time.');
      return;
    }
    if (!inBusinessHours(start, false) || !inBusinessHours(end, true)) {
      Alert.alert('Outside hours', 'Bookings must be between 06:00 and 20:00.');
      return;
    }
    if (isBefore(start, new Date())) {
      Alert.alert('In the past', 'Start time must be in the future.');
      return;
    }

    setLoading(true);
    setBookingError(null);
    try {
      await onConfirm({
        purpose: purpose.trim(),
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        roomIds: selectedRooms.map((item) => item.id),
        amenityIds: selectedAmenities,
        capacity: attendeeCount,
      });
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book room</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <Text style={styles.roomName}>
          {selectedRooms.length === 1 ? selectedRooms[0].name : `${selectedRooms.length} rooms selected`}
        </Text>
        <Text style={styles.roomMeta}>
          {totalCapacity} combined seats
        </Text>

        <View style={styles.selectedRooms}>
          {selectedRooms.length === 0 ? (
            <Text style={styles.emptyRooms}>No rooms selected. Go back and choose at least one room.</Text>
          ) : selectedRooms.map((item) => (
            <View key={item.id} style={styles.selectedRoomRow}>
              <View style={styles.selectedRoomInfo}>
                <Text style={styles.selectedRoomName}>{item.name}</Text>
                <Text style={styles.selectedRoomCapacity}>{item.capacity} seats</Text>
              </View>
              {selectedRooms.length > 1 ? (
                <TouchableOpacity
                  style={styles.removeRoomButton}
                  onPress={() => removeRoom(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.name}`}
                >
                  <Ionicons name="close-circle-outline" size={20} color={colors.muted} />
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Attendees</Text>
          <View style={styles.capacityStepper}>
            <TouchableOpacity
              style={styles.capacityButton}
              onPress={() => setAttendeeCount((count) => Math.max(1, count - 1))}
              disabled={attendeeCount <= 1}
              accessibilityLabel="Decrease attendee count"
            >
              <Ionicons name="remove" size={18} color={colors.ink} />
            </TouchableOpacity>
            <Text style={styles.capacityValue}>{attendeeCount}</Text>
            <TouchableOpacity
              style={styles.capacityButton}
              onPress={() => setAttendeeCount((count) => Math.min(totalCapacity, count + 1))}
              disabled={attendeeCount >= totalCapacity}
              accessibilityLabel="Increase attendee count"
            >
              <Ionicons name="add" size={18} color={colors.ink} />
            </TouchableOpacity>
            <Text style={styles.capacityHint}>of {totalCapacity} seats</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Date</Text>
          <NativeDateTimePicker
            label="Choose booking date"
            value={selectedDate}
            mode="date"
            minimumDate={startOfDay(new Date())}
            onChange={(date) => setSelectedDate(startOfDay(date))}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Time (06:00 – 20:00)</Text>
          <View style={styles.timeFields}>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>Start</Text>
              <NativeDateTimePicker
                label="Choose start time"
                value={startTime}
                mode="time"
                onChange={setStartTime}
              />
            </View>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>End</Text>
              <NativeDateTimePicker
                label="Choose end time"
                value={endTime}
                mode="time"
                onChange={setEndTime}
              />
            </View>
          </View>
          <Text style={styles.preview}>{preview}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Amenities</Text>
          <View style={styles.amenityGrid}>
            {availableAmenities.length === 0 ? (
              <Text style={styles.noAmenities}>No amenities are shared by all selected rooms.</Text>
            ) : availableAmenities.map((amenity) => {
              const active = selectedAmenities.includes(amenity.id);
              return (
                <TouchableOpacity
                  key={amenity.id}
                  style={[styles.amenityOption, active && styles.amenityOptionActive]}
                  onPress={() => toggleAmenity(amenity.id)}
                >
                  <Ionicons
                    name={amenity.icon as any}
                    size={16}
                    color={active ? colors.onPrimary : colors.body}
                  />
                  <Text style={[styles.amenityText, active && styles.amenityTextActive]}>
                    {amenity.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Purpose</Text>
          <TextInput
            style={[styles.input, styles.purposeInput]}
            value={purpose}
            onChangeText={setPurpose}
            placeholder="e.g. Sprint planning with product"
            placeholderTextColor={colors.mutedSoft}
            multiline
          />
        </View>
        {bookingError ? (
          <Text style={styles.errorMessage} accessibilityRole="alert">
            {bookingError}
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Confirm booking"
          onPress={handleSubmit}
          loading={loading}
          disabled={selectedRooms.length === 0}
          fullWidth
        />
      </View>
      </View>

    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  body: { flex: 1 },
  scroll: { flex: 1 },
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
  content: { paddingHorizontal: spacing.base, paddingBottom: spacing.section },
  roomName: { ...typography.displaySm, color: colors.ink },
  roomMeta: { ...typography.bodySm, color: colors.muted, marginTop: 4 },
  selectedRooms: {
    marginTop: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectedRoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  selectedRoomInfo: { flex: 1 },
  selectedRoomName: { ...typography.bodySm, color: colors.ink },
  selectedRoomCapacity: { ...typography.captionSm, color: colors.muted },
  emptyRooms: { ...typography.bodySm, color: colors.muted },
  removeRoomButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { marginTop: spacing.lg },
  sectionLabel: { ...typography.titleMd, color: colors.ink, marginBottom: spacing.sm },
  capacityStepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  capacityButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
  },
  capacityValue: { ...typography.titleMd, color: colors.ink, minWidth: 28, textAlign: 'center' },
  capacityHint: { ...typography.bodySm, color: colors.muted },
  timeFields: { flexDirection: 'row', gap: spacing.sm },
  timeField: { flex: 1 },
  timeLabel: { ...typography.caption, color: colors.muted, marginBottom: 6 },
  preview: { ...typography.caption, color: colors.steel, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.canvas,
    ...typography.bodyMd,
    color: colors.ink,
  },
  purposeInput: { minHeight: 80, textAlignVertical: 'top' },
  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  amenityOptionActive: { backgroundColor: colors.primary },
  amenityText: { ...typography.captionSm, color: colors.body },
  amenityTextActive: { color: colors.onPrimary },
  noAmenities: { ...typography.bodySm, color: colors.muted },
  errorMessage: {
    ...typography.bodySm,
    color: colors.error,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
  },
  footer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.base,
    borderTopWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.canvas,
  },
});
};

export default BookingScreen;
