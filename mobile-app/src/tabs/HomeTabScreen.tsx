import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Modal,
  TouchableOpacity,
  TextInput,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Room, SearchFilters } from '../types';
import { RoomCard } from '../components/RoomCard';
import { SearchBar } from '../components/SearchBar';
import { Button } from '../components/Button';
import { colors, spacing, typography, radii } from '../theme/tokens';
import api from '../api';
import { applyFavoriteFlags, getFavoriteRoomIds } from '../lib/preferences';

interface OccupancySlot {
  bookingId: number | string;
  roomId: number | string;
  startAt: string;
  endAt: string;
  status: string;
}

interface HomeTabScreenProps {
  onOpenRoom: (room: Room) => void;
}

const HOUR_MS = 60 * 60 * 1000;

function mapRoom(item: any): Room {
  const amenities = (item.amenities || []).map((a: any) =>
    a?.amenity
      ? {
          id: String(a.amenity.id ?? a.id),
          name: a.amenity.name ?? a.name,
          icon: a.amenity.icon ?? 'checkmark-circle-outline',
          description: a.amenity.description,
        }
      : {
          id: String(a.id),
          name: a.name,
          icon: a.icon ?? 'checkmark-circle-outline',
          description: a.description,
        },
  );
  return {
    id: String(item.id),
    name: item.name,
    description: item.description ?? '',
    capacity: item.capacity ?? 0,
    status: item.status ?? 'AVAILABLE',
    isActive: item.isActive ?? true,
    imageUrl: item.imageUrl ?? '',
    amenities,
    floor: item.floor,
    location: item.location,
    rating: item.rating,
    reviewCount: item.reviewCount,
    isFavorite: item.isFavorite,
  };
}

/** Room is busy if now is within [start - 1h, end). Stays available until 1 hour before start. */
function isBusyNow(roomId: string, slots: OccupancySlot[], now = new Date()): boolean {
  const t = now.getTime();
  return slots.some((s) => {
    if (String(s.roomId) !== String(roomId)) return false;
    const start = new Date(s.startAt).getTime();
    const end = new Date(s.endAt).getTime();
    return start - HOUR_MS <= t && t < end;
  });
}

export function HomeTabScreen({ onOpenRoom }: HomeTabScreenProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [occupancy, setOccupancy] = useState<OccupancySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SearchFilters>({
    startAt: null,
    endAt: null,
    capacity: 1,
    amenityIds: [],
  });
  const [draft, setDraft] = useState<SearchFilters>(filters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date().toISOString();
      const to = new Date(Date.now() + 14 * 24 * HOUR_MS).toISOString();
      const [roomsRes, occRes, favIds] = await Promise.all([
        api.getRooms(),
        api.getOccupancy(from, to).catch(() => []),
        getFavoriteRoomIds().catch(() => [] as string[]),
      ]);
      if (Array.isArray(roomsRes)) {
        setRooms(applyFavoriteFlags(roomsRes.map(mapRoom), favIds));
      }
      if (Array.isArray(occRes)) setOccupancy(occRes as OccupancySlot[]);
    } catch (err) {
      console.warn('Failed to load home data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const displayedRooms = useMemo(() => {
    let list = rooms.filter((r) => r.isActive !== false);

    // text query
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.description || '').toLowerCase().includes(q) ||
          (r.location || '').toLowerCase().includes(q),
      );
    }

    // capacity
    if (filters.capacity > 1) {
      list = list.filter((r) => r.capacity >= filters.capacity);
    }

    // amenities
    if (filters.amenityIds.length > 0) {
      list = list.filter((r) =>
        filters.amenityIds.every((id) => r.amenities.some((a) => a.id === id)),
      );
    }

    // time-window conflict using occupancy (if user picked a window)
    if (filters.startAt && filters.endAt) {
      const start = filters.startAt.getTime();
      const end = filters.endAt.getTime();
      list = list.filter((r) => {
        const conflict = occupancy.some(
          (s) =>
            String(s.roomId) === String(r.id) &&
            new Date(s.startAt).getTime() < end &&
            new Date(s.endAt).getTime() > start,
        );
        return !conflict;
      });
    }

    return list;
  }, [rooms, occupancy, filters, query]);

  const roomsWithBusy = useMemo(() => {
    return displayedRooms.map((r) => {
      const busy = isBusyNow(r.id, occupancy);
      // Operational status wins; otherwise reflect live occupancy
      if (r.status !== 'AVAILABLE') return { ...r, _busy: true as const };
      return { ...r, _busy: busy };
    });
  }, [displayedRooms, occupancy]);

  const allAmenityOptions = useMemo(() => {
    const map = new Map<string, string>();
    rooms.forEach((r) => r.amenities.forEach((a) => map.set(a.id, a.name)));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rooms]);

  const openFilters = () => {
    setDraft(filters);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setFilters(draft);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    const empty: SearchFilters = { startAt: null, endAt: null, capacity: 1, amenityIds: [] };
    setDraft(empty);
    setFilters(empty);
    setQuery('');
    setFilterOpen(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.greeting}>Where to meet?</Text>
          <Text style={styles.subGreeting}>Book a conference room in your building</Text>
        </View>
      </View>

      <SearchBar filters={filters} onPress={openFilters} />

      <View style={styles.queryRow}>
        <Ionicons name="search" size={16} color={colors.muted} />
        <TextInput
          style={styles.queryInput}
          placeholder="Search by name or location"
          placeholderTextColor={colors.mutedSoft}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>
          {filters.startAt || filters.capacity > 1 || filters.amenityIds.length || query
            ? 'Matching rooms'
            : 'Available rooms'}
        </Text>
        {loading ? (
          <Text style={{ color: colors.muted }}>Loading...</Text>
        ) : roomsWithBusy.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="business-outline" size={40} color={colors.muted} />
            <Text style={styles.emptyTitle}>No rooms match</Text>
            <Text style={styles.emptySub}>Try clearing filters or search</Text>
          </View>
        ) : (
          roomsWithBusy.map((room) => {
            const displayRoom: Room = {
              ...room,
              // Surface occupancy as non-available for the card overlay without mutating ops status permanently
              status: room._busy && room.status === 'AVAILABLE' ? 'OUT_OF_SERVICE' : room.status,
            };
            return (
              <View key={room.id}>
                <RoomCard
                  room={displayRoom}
                  onPress={() => onOpenRoom(room)}
                  onToggleFavorite={async (r) => {
                    try {
                      const result = await api.toggleFavorite(r.id);
                      const isFavorite = Boolean(result?.isFavorite);
                      setRooms((prev) =>
                        prev.map((x) => (x.id === r.id ? { ...x, isFavorite } : x)),
                      );
                    } catch (err) {
                      console.warn('Failed to toggle favorite', err);
                    }
                  }}
                />
                {room._busy && room.status === 'AVAILABLE' ? (
                  <Text style={styles.busyHint}>In use or starting within the hour</Text>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={filterOpen} animationType="slide" transparent onRequestClose={() => setFilterOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFilterOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Filters</Text>

          <Text style={styles.fieldLabel}>Minimum capacity</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => setDraft((d) => ({ ...d, capacity: Math.max(1, d.capacity - 1) }))}
            >
              <Ionicons name="remove" size={18} color={colors.ink} />
            </TouchableOpacity>
            <Text style={styles.stepValue}>{draft.capacity}+ people</Text>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => setDraft((d) => ({ ...d, capacity: d.capacity + 1 }))}
            >
              <Ionicons name="add" size={18} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Amenities</Text>
          <View style={styles.amenityWrap}>
            {allAmenityOptions.length === 0 ? (
              <Text style={styles.emptySub}>No amenities loaded</Text>
            ) : (
              allAmenityOptions.map((a) => {
                const active = draft.amenityIds.includes(a.id);
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() =>
                      setDraft((d) => ({
                        ...d,
                        amenityIds: active
                          ? d.amenityIds.filter((id) => id !== a.id)
                          : [...d.amenityIds, a.id],
                      }))
                    }
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{a.name}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <Text style={styles.hint}>
            Availability on the list updates an hour before each booking starts. Use search text to
            filter by room name.
          </Text>

          <View style={styles.sheetActions}>
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearText}>Clear all</Text>
            </TouchableOpacity>
            <Button title="Show rooms" onPress={applyFilters} style={{ minWidth: 140 }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  headerRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
  },
  headerTextWrap: { flex: 1 },
  greeting: { ...typography.displayLg, color: colors.ink },
  subGreeting: { ...typography.bodySm, color: colors.muted, marginTop: 4 },
  queryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceSoft,
  },
  queryInput: {
    flex: 1,
    ...typography.bodySm,
    color: colors.ink,
    padding: 0,
  },
  list: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.section,
  },
  sectionTitle: {
    ...typography.titleMd,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  busyHint: {
    ...typography.captionSm,
    color: colors.warning,
    marginTop: -8,
    marginBottom: spacing.md,
    marginLeft: 4,
  },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyTitle: { ...typography.titleMd, color: colors.ink, marginTop: spacing.sm },
  emptySub: { ...typography.bodySm, color: colors.muted, marginTop: 4 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(16,42,67,0.35)',
  },
  sheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.base,
    paddingBottom: spacing.xl,
  },
  sheetTitle: { ...typography.titleLg, color: colors.ink, marginBottom: spacing.md },
  fieldLabel: { ...typography.caption, color: colors.muted, marginBottom: spacing.sm, marginTop: spacing.md },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { ...typography.titleSm, color: colors.ink, minWidth: 100, textAlign: 'center' },
  amenityWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { ...typography.captionSm, color: colors.body },
  chipTextActive: { color: colors.onPrimary },
  hint: { ...typography.captionSm, color: colors.muted, marginTop: spacing.lg },
  sheetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  clearText: { ...typography.buttonSm, color: colors.steel },
});
