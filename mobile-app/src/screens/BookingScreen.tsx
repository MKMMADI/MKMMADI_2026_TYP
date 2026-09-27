import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { Room } from '../types';
import { Button } from '../components/Button';
import { colors, radii, spacing, typography } from '../theme/tokens';

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

type Meridiem = 'AM' | 'PM';

const MIN_HOUR_24 = 6;
const MAX_HOUR_24 = 20; // inclusive end boundary for meeting end

function parseTimeParts(hour12: string, minute: string, meridiem: Meridiem) {
  let h = parseInt(hour12, 10);
  const m = parseInt(minute, 10);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 1 || h > 12 || m < 0 || m > 59) {
    return null;
  }
  if (meridiem === 'AM') {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return { hour: h, minute: m };
}

function combineDateAndTime(date: Date, hour12: string, minute: string, meridiem: Meridiem) {
  const parts = parseTimeParts(hour12, minute, meridiem);
  if (!parts) return null;
  const d = new Date(date);
  d.setHours(parts.hour, parts.minute, 0, 0);
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
  const [purpose, setPurpose] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [monthCursor, setMonthCursor] = useState<Date>(startOfMonth(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [startHour, setStartHour] = useState('9');
  const [startMinute, setStartMinute] = useState('00');
  const [startMeridiem, setStartMeridiem] = useState<Meridiem>('AM');
  const [endHour, setEndHour] = useState('10');
  const [endMinute, setEndMinute] = useState('00');
  const [endMeridiem, setEndMeridiem] = useState<Meridiem>('AM');
  const [selectedRooms, setSelectedRooms] = useState<Room[]>(rooms);
  const [attendeeCount, setAttendeeCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const totalCapacity = selectedRooms.reduce((total, item) => total + item.capacity, 0);
  const availableAmenities = useMemo(() => {
    const firstRoomAmenities = selectedRooms[0]?.amenities || [];
    return firstRoomAmenities.filter((amenity) =>
      selectedRooms.every((room) => room.amenities.some((candidate) => candidate.id === amenity.id)),
    );
  }, [selectedRooms]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthCursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(monthCursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [monthCursor]);

  const preview = useMemo(() => {
    const start = combineDateAndTime(selectedDate, startHour, startMinute, startMeridiem);
    const end = combineDateAndTime(selectedDate, endHour, endMinute, endMeridiem);
    if (!start || !end) return 'Choose a valid time';
    return `${format(start, 'EEE d MMM')} · ${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`;
  }, [selectedDate, startHour, startMinute, startMeridiem, endHour, endMinute, endMeridiem]);

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

    const start = combineDateAndTime(selectedDate, startHour, startMinute, startMeridiem);
    const end = combineDateAndTime(selectedDate, endHour, endMinute, endMeridiem);

    if (!start || !end) {
      Alert.alert('Invalid time', 'Use hours 1–12 and minutes 00–59.');
      return;
    }
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

  function TimeRow({
    label,
    hour,
    minute,
    meridiem,
    onHour,
    onMinute,
    onMeridiem,
  }: {
    label: string;
    hour: string;
    minute: string;
    meridiem: Meridiem;
    onHour: (v: string) => void;
    onMinute: (v: string) => void;
    onMeridiem: (v: Meridiem) => void;
  }) {
    return (
      <View style={styles.timeBlock}>
        <Text style={styles.timeLabel}>{label}</Text>
        <View style={styles.timeRow}>
          <TextInput
            style={styles.timeInput}
            keyboardType="number-pad"
            maxLength={2}
            value={hour}
            onChangeText={onHour}
            placeholder="9"
            placeholderTextColor={colors.mutedSoft}
          />
          <Text style={styles.colon}>:</Text>
          <TextInput
            style={styles.timeInput}
            keyboardType="number-pad"
            maxLength={2}
            value={minute}
            onChangeText={onMinute}
            placeholder="00"
            placeholderTextColor={colors.mutedSoft}
          />
          <View style={styles.meridiemWrap}>
            {(['AM', 'PM'] as Meridiem[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.meridiemBtn, meridiem === m && styles.meridiemActive]}
                onPress={() => onMeridiem(m)}
              >
                <Text style={[styles.meridiemText, meridiem === m && styles.meridiemTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book room</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setCalendarOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Choose booking date"
          >
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={styles.dateBtnText}>{format(selectedDate, 'EEEE, d MMMM yyyy')}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Time (06:00 – 20:00)</Text>
          <TimeRow
            label="Start"
            hour={startHour}
            minute={startMinute}
            meridiem={startMeridiem}
            onHour={setStartHour}
            onMinute={setStartMinute}
            onMeridiem={setStartMeridiem}
          />
          <TimeRow
            label="End"
            hour={endHour}
            minute={endMinute}
            meridiem={endMeridiem}
            onHour={setEndHour}
            onMinute={setEndMinute}
            onMeridiem={setEndMeridiem}
          />
          <Text style={styles.preview}>{preview}</Text>
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

      <Modal visible={calendarOpen} animationType="slide" transparent onRequestClose={() => setCalendarOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCalendarOpen(false)} />
        <View style={styles.calendarSheet}>
          <View style={styles.calHeader}>
            <TouchableOpacity onPress={() => setMonthCursor((m) => addMonths(m, -1))}>
              <Ionicons name="chevron-back" size={22} color={colors.ink} />
            </TouchableOpacity>
            <Text style={styles.calTitle}>{format(monthCursor, 'MMMM yyyy')}</Text>
            <TouchableOpacity onPress={() => setMonthCursor((m) => addMonths(m, 1))}>
              <Ionicons name="chevron-forward" size={22} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <View style={styles.weekRow}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <Text key={d} style={styles.weekDay}>
                {d}
              </Text>
            ))}
          </View>
          <View style={styles.daysGrid}>
            {calendarDays.map((day) => {
              const outside = !isSameMonth(day, monthCursor);
              const selected = isSameDay(day, selectedDate);
              const past = isBefore(day, startOfDay(new Date()));
              return (
                <TouchableOpacity
                  key={day.toISOString()}
                  style={[styles.dayCell, selected && styles.daySelected]}
                  disabled={past}
                  accessibilityRole="button"
                  accessibilityLabel={format(day, 'EEEE d MMMM yyyy')}
                  onPress={() => {
                    setSelectedDate(startOfDay(day));
                    setCalendarOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dayText,
                      outside && styles.dayOutside,
                      past && styles.dayPast,
                      selected && styles.daySelectedText,
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.canvas,
  },
  dateBtnText: { ...typography.bodyMd, color: colors.ink, flex: 1 },
  timeBlock: { marginBottom: spacing.md },
  timeLabel: { ...typography.caption, color: colors.muted, marginBottom: 6 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeInput: {
    width: 52,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.sm,
    paddingVertical: 10,
    textAlign: 'center',
    ...typography.bodyMd,
    color: colors.ink,
    backgroundColor: colors.canvas,
  },
  colon: { ...typography.titleMd, color: colors.ink },
  meridiemWrap: { flexDirection: 'row', marginLeft: 8, borderRadius: radii.sm, overflow: 'hidden' },
  meridiemBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surfaceSoft,
  },
  meridiemActive: { backgroundColor: colors.primary },
  meridiemText: { ...typography.caption, color: colors.body },
  meridiemTextActive: { color: colors.onPrimary },
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(16,42,67,0.35)' },
  calendarSheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.base,
    paddingBottom: spacing.xl,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  calTitle: { ...typography.titleMd, color: colors.ink },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekDay: {
    width: `${100 / 7}%` as any,
    textAlign: 'center',
    ...typography.captionSm,
    color: colors.muted,
  },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  dayText: { ...typography.bodyMd, color: colors.ink },
  dayOutside: { color: colors.mutedSoft },
  dayPast: { color: colors.mutedSoft },
  daySelectedText: { color: colors.onPrimary, fontWeight: '600' },
});

export default BookingScreen;
