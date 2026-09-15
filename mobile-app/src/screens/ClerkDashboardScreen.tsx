import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api';
import { Booking, BookingStatus } from '../types';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface ClerkDashboardScreenProps {
  onOpenProfile?: () => void;
  onOpenHistory?: () => void;
}

type StatusFilter = 'ALL' | BookingStatus;

const statusMeta: Record<
  BookingStatus,
  { label: string; tone: string; tint: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  CONFIRMED: { label: 'Awaiting prep', tone: '#F8E7C7', tint: '#B76A00', icon: 'time-outline' },
  PREPARING: { label: 'Preparing', tone: '#D9EBFF', tint: '#0056A8', icon: 'sparkles-outline' },
  READY: { label: 'Ready', tone: '#DDF5E5', tint: '#0A7A3F', icon: 'checkmark-circle-outline' },
  COMPLETED: { label: 'Completed', tone: '#E8E9F7', tint: '#3E49A6', icon: 'checkbox-outline' },
  CANCELLED: { label: 'Cancelled', tone: '#F9E1E1', tint: '#A32323', icon: 'close-circle-outline' },
};

const statusOrder: StatusFilter[] = ['ALL', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'];
const tabLabels: Record<StatusFilter, string> = {
  ALL: 'All',
  CONFIRMED: 'Queued',
  PREPARING: 'Prep',
  READY: 'Ready',
  COMPLETED: 'Done',
  CANCELLED: 'Cancelled',
};

function formatTimeRange(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const format = (value: Date) =>
    value.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });

  return `${format(startDate)} – ${format(endDate)}`;
}

function formatBookingDate(start: string, end?: string) {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : startDate;
  const sameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();

  const dayOpts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };

  if (sameDay) {
    return startDate.toLocaleDateString([], dayOpts);
  }

  return `${startDate.toLocaleDateString([], dayOpts)} – ${endDate.toLocaleDateString([], dayOpts)}`;
}

function formatBookingDateTime(start: string, end: string) {
  return `${formatBookingDate(start, end)} · ${formatTimeRange(start, end)}`;
}

function mapBookingFromApi(payload: any): Booking {
  const room = payload.rooms?.[0]?.room ?? {
    id: String(payload.roomId ?? 'unknown-room'),
    name: 'Unassigned room',
    description: 'Room details unavailable',
    capacity: 0,
    status: 'AVAILABLE',
    isActive: true,
    imageUrl: '',
    amenities: [],
  };

  return {
    id: String(payload.id),
    employeeId: String(payload.employee?.id ?? payload.employeeId ?? 'unknown-user'),
    startAt: payload.startAt,
    endAt: payload.endAt,
    purpose: payload.purpose,
    status: payload.status,
    createdAt: payload.createdAt ?? new Date().toISOString(),
    rooms: [
      {
        id: String(payload.rooms?.[0]?.id ?? `${payload.id}-room`),
        roomId: String(room.id),
        room,
      },
    ],
    requestedAmenities: Array.isArray(payload.amenities)
      ? payload.amenities.map((entry: any) => ({
          id: String(entry.amenity?.id ?? entry.id ?? `${payload.id}-amenity`),
          name: entry.amenity?.name ?? entry.name ?? 'Amenity',
          icon: entry.amenity?.icon ?? 'checkmark-circle-outline',
          description: entry.amenity?.description ?? '',
        }))
      : [],
  };
}

function inventoryChecklistForRoom(booking: Booking): string[] {
  const roomName = booking.rooms[0]?.room?.name ?? 'Room';
  const baseList = [`${roomName} set-up checklist`, 'Sanitiser and wipe-down check', 'Table and chair layout'];

  const extras = booking.requestedAmenities.map((amenity) => {
    const name = amenity.name.toLowerCase();
    if (name.includes('projector')) return 'Projector remote + HDMI cable';
    if (name.includes('whiteboard')) return 'Whiteboard markers and eraser';
    if (name.includes('phone')) return 'Conference phone charged';
    if (name.includes('coffee')) return 'Coffee station restocked';
    if (name.includes('tv')) return 'TV input checked';
    return `${amenity.name} set and checked`;
  });

  return [...baseList, ...extras];
}

export function ClerkDashboardScreen({ onOpenProfile, onOpenHistory }: ClerkDashboardScreenProps) {
  const [queue, setQueue] = useState<Booking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<BookingStatus | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.getBookings();
      const nextQueue = Array.isArray(response)
        ? response
            .map((item) => mapBookingFromApi(item))
            .filter((booking) => ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'].includes(booking.status))
        : [];

      setQueue(nextQueue);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load the preparation queue.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const selectedBooking = useMemo(
    () => queue.find((booking) => booking.id === selectedBookingId) ?? null,
    [queue, selectedBookingId]
  );

  const filteredQueue = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return queue.filter((booking) => {
      const roomName = booking.rooms[0]?.room?.name ?? '';
      const matchesStatus = statusFilter === 'ALL' || booking.status === statusFilter;
      const matchesSearch =
        !query ||
        roomName.toLowerCase().includes(query) ||
        booking.purpose.toLowerCase().includes(query) ||
        booking.status.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [queue, searchText, statusFilter]);

  const summary = useMemo(
    () => [
      { label: 'Awaiting prep', value: queue.filter((b) => b.status === 'CONFIRMED').length, tone: '#F8E7C7' },
      { label: 'Preparing', value: queue.filter((b) => b.status === 'PREPARING').length, tone: '#D9EBFF' },
      { label: 'Ready', value: queue.filter((b) => b.status === 'READY').length, tone: '#DDF5E5' },
      { label: 'Completed', value: queue.filter((b) => b.status === 'COMPLETED').length, tone: '#E8E9F7' },
    ],
    [queue]
  );

  const openBookingDetails = (booking: Booking) => {
    setSelectedBookingId(booking.id);
    setPendingStatus(booking.status);
    setStatusMenuOpen(false);
  };

  const submitStatusChange = async () => {
    if (!selectedBooking || !pendingStatus || pendingStatus === selectedBooking.status) {
      return;
    }

    Alert.alert(
      'Confirm status change',
      `Update ${selectedBooking.rooms[0]?.room?.name ?? 'this room'} (${formatBookingDateTime(selectedBooking.startAt, selectedBooking.endAt)}) from ${statusMeta[selectedBooking.status].label} to ${statusMeta[pendingStatus].label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.updateBookingStatus(selectedBooking.id, pendingStatus);
              setQueue((current) =>
                current.map((booking) =>
                  booking.id === selectedBooking.id ? { ...booking, status: pendingStatus } : booking
                )
              );
              setSelectedBookingId(null);
              setPendingStatus(null);
              setStatusMenuOpen(false);
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Could not update the room status.';
              Alert.alert('Status update failed', message);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.kicker}>Operations</Text>
          <Text style={styles.headerTitle}>Clerk dashboard</Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity style={styles.iconButton} onPress={onOpenProfile}>
            <Ionicons name="person-circle-outline" size={22} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={onOpenHistory}>
            <Ionicons name="time-outline" size={20} color={colors.ink} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Today’s prep queue</Text>
        <Text style={styles.heroSubtitle}>Search by room or meeting, then confirm status changes before anything is saved.</Text>
      </View>

      <View style={styles.summaryGrid}>
        {summary.map((card) => (
          <View key={card.label} style={[styles.summaryCard, { backgroundColor: card.tone }]}>
            <Text style={styles.summaryLabel}>{card.label}</Text>
            <Text style={styles.summaryValue}>{card.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search room, meeting or status"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {statusOrder.map((status) => {
          const isActive = statusFilter === status;
          const total = status === 'ALL' ? queue.length : queue.filter((booking) => booking.status === status).length;
          const label = tabLabels[status];

          return (
            <TouchableOpacity
              key={status}
              onPress={() => setStatusFilter(status)}
              activeOpacity={0.85}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
            >
              <Text
                numberOfLines={1}
                style={[styles.filterText, isActive && styles.filterTextActive]}
              >
                {label}
              </Text>
              <View style={[styles.filterCount, isActive && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>{total}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.listArea}>
      {loading ? (
        <View style={styles.stateWrap}>
          <Text style={styles.stateText}>Loading the queue…</Text>
        </View>
      ) : error ? (
        <View style={styles.stateWrap}>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadQueue}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {filteredQueue.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No rooms match this view</Text>
              <Text style={styles.emptyStateText}>Try another status or clear the search.</Text>
            </View>
          ) : (
            filteredQueue.map((booking) => {
              const roomName = booking.rooms[0]?.room?.name ?? 'Room assignment';
              const meta = statusMeta[booking.status];

              return (
                <TouchableOpacity
                  key={booking.id}
                  activeOpacity={0.9}
                  style={styles.card}
                  onPress={() => openBookingDetails(booking)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.roomNameWrap}>
                      <Text style={styles.roomName}>{roomName}</Text>
                      <Text style={styles.timeText}>{formatBookingDateTime(booking.startAt, booking.endAt)}</Text>
                    </View>

                    <View style={[styles.statusPill, { backgroundColor: meta.tone }]}>
                      <Ionicons name={meta.icon} size={14} color={meta.tint} />
                      <Text style={[styles.statusText, { color: meta.tint }]}>{meta.label}</Text>
                    </View>
                  </View>

                  <Text style={styles.title}>{booking.purpose}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
      </View>

      <Modal visible={Boolean(selectedBooking)} transparent animationType="slide" onRequestClose={() => setSelectedBookingId(null)}>
        {selectedBooking && (
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedBooking.rooms[0]?.room?.name ?? 'Room details'}</Text>
                <TouchableOpacity onPress={() => setSelectedBookingId(null)} style={styles.closeButton}>
                  <Ionicons name="close" size={22} color={colors.ink} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Event</Text>
                  <Text style={styles.value}>{selectedBooking.purpose}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.label}>Date</Text>
                  <Text style={styles.value}>{formatBookingDate(selectedBooking.startAt, selectedBooking.endAt)}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.label}>Time</Text>
                  <Text style={styles.value}>{formatTimeRange(selectedBooking.startAt, selectedBooking.endAt)}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.label}>Current status</Text>
                  <View style={[styles.statusPill, { backgroundColor: statusMeta[selectedBooking.status].tone }]}>
                    <Ionicons name={statusMeta[selectedBooking.status].icon} size={14} color={statusMeta[selectedBooking.status].tint} />
                    <Text style={[styles.statusText, { color: statusMeta[selectedBooking.status].tint }]}>
                      {statusMeta[selectedBooking.status].label}
                    </Text>
                  </View>
                </View>

                <View style={styles.dropdownSection}>
                  <Text style={styles.label}>Update room status</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setStatusMenuOpen((prev) => !prev)}
                  >
                    <Text style={styles.dropdownText}>
                      {pendingStatus ? statusMeta[pendingStatus].label : statusMeta[selectedBooking.status].label}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={colors.ink} />
                  </TouchableOpacity>

                  {statusMenuOpen && (
                    <View style={styles.dropdownMenu}>
                      {statusOrder.filter((status) => status !== 'ALL').map((status) => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.dropdownOption,
                            pendingStatus === status && styles.dropdownOptionSelected,
                          ]}
                          onPress={() => {
                            setPendingStatus(status);
                            setStatusMenuOpen(false);
                          }}
                        >
                          <Text style={styles.dropdownOptionText}>{statusMeta[status].label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>Amenities needed</Text>
                  <View style={styles.chipRow}>
                    {selectedBooking.requestedAmenities.length > 0 ? (
                      selectedBooking.requestedAmenities.map((amenity) => (
                        <View key={amenity.id} style={styles.chip}>
                          <Text style={styles.chipText}>{amenity.name}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyText}>No special amenities requested.</Text>
                    )}
                  </View>
                </View>

                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>Inventory checklist</Text>
                  {inventoryChecklistForRoom(selectedBooking).map((item) => (
                    <View key={item} style={styles.checkRow}>
                      <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                      <Text style={styles.checkText}>{item}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    (!pendingStatus || pendingStatus === selectedBooking.status) && styles.confirmButtonDisabled,
                  ]}
                  onPress={submitStatusChange}
                  disabled={!pendingStatus || pendingStatus === selectedBooking.status}
                >
                  <Text style={styles.confirmButtonText}>Confirm status change</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  kicker: {
    ...typography.microLabel,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerTitle: {
    ...typography.displayMd,
    color: colors.ink,
    marginTop: 2,
  },
  topActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    marginHorizontal: spacing.base,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: radii.xl,
    backgroundColor: '#F6F8FA',
    borderWidth: 1,
    borderColor: '#EEF1F4',
    marginBottom: spacing.sm,
  },
  heroTitle: {
    ...typography.titleMd,
    color: colors.ink,
  },
  heroSubtitle: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: 6,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  summaryCard: {
    width: '47%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    minHeight: 64,
    justifyContent: 'center',
  },
  summaryLabel: {
    ...typography.captionSm,
    color: colors.body,
  },
  summaryValue: {
    ...typography.displaySm,
    color: colors.ink,
    marginTop: 4,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceSoft,
    borderColor: '#E8E8E8',
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.base,
    paddingVertical: 10,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.ink,
  },
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 52,
    marginBottom: spacing.sm,
  },
  filterRow: {
    paddingHorizontal: spacing.base,
    paddingVertical: 4,
    gap: 8,
    alignItems: 'center',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    flexShrink: 0,
  },
  filterPillActive: {
    backgroundColor: '#F5F8FF',
    borderColor: '#D1E2FF',
  },
  filterText: {
    ...typography.captionSm,
    color: colors.body,
    flexShrink: 0,
  },
  filterTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  filterCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E7E9EC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterCountActive: {
    backgroundColor: '#DCEAFF',
  },
  filterCountText: {
    ...typography.captionSm,
    color: colors.ink,
    fontWeight: '700',
  },
  filterCountTextActive: {
    color: colors.primary,
  },
  listArea: {
    flex: 1,
    minHeight: 0,
  },
  listScroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.section,
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#EEF1F4',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  roomNameWrap: {
    flex: 1,
  },
  roomName: {
    ...typography.titleMd,
    color: colors.ink,
  },
  timeText: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    gap: 4,
  },
  statusText: {
    ...typography.captionSm,
    fontWeight: '700',
  },
  title: {
    ...typography.bodyMd,
    color: colors.ink,
    marginTop: spacing.md,
  },
  stateWrap: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  stateText: {
    ...typography.bodyMd,
    color: colors.muted,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  retryButtonText: {
    ...typography.buttonSm,
    color: colors.onPrimary,
  },
  emptyState: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyStateTitle: {
    ...typography.titleMd,
    color: colors.ink,
  },
  emptyStateText: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: 6,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '88%',
    paddingBottom: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  modalTitle: {
    ...typography.titleMd,
    color: colors.ink,
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
  infoRow: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.captionSm,
    color: colors.muted,
    marginBottom: 4,
  },
  value: {
    ...typography.bodyMd,
    color: colors.ink,
  },
  dropdownSection: {
    marginBottom: spacing.md,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  dropdownText: {
    ...typography.bodyMd,
    color: colors.ink,
  },
  dropdownMenu: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
  },
  dropdownOptionSelected: {
    backgroundColor: '#F5F8FF',
  },
  dropdownOptionText: {
    ...typography.bodyMd,
    color: colors.ink,
  },
  sectionBlock: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.titleSm,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: '#EEF1F4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  chipText: {
    ...typography.captionSm,
    color: colors.ink,
  },
  emptyText: {
    ...typography.bodySm,
    color: colors.muted,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  checkText: {
    ...typography.bodySm,
    color: colors.body,
    flex: 1,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.primaryDisabled,
  },
  confirmButtonText: {
    ...typography.buttonMd,
    color: colors.onPrimary,
  },
});

export default ClerkDashboardScreen;
