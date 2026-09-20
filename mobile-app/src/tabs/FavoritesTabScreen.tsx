import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Room } from '../types';
import { RoomCard } from '../components/RoomCard';
import { colors, spacing, typography, radii } from '../theme/tokens';
import api from '../api';
import {
  applyFavoriteFlags,
  getFavoriteRoomIds,
  getRecentRoomIds,
} from '../lib/preferences';

interface FavoritesTabScreenProps {
  onOpenRoom: (room: Room) => void;
  onBookRoom?: (room: Room) => void;
}

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

export function FavoritesTabScreen({ onOpenRoom, onBookRoom }: FavoritesTabScreenProps) {
  const [favoriteRooms, setFavoriteRooms] = useState<Room[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [roomsRes, favIds, recentIds] = await Promise.all([
        api.getRooms(),
        getFavoriteRoomIds(),
        getRecentRoomIds(),
      ]);
      const rooms = Array.isArray(roomsRes) ? roomsRes.map(mapRoom) : [];
      const withFlags = applyFavoriteFlags(rooms, favIds);
      const byId = new Map(withFlags.map((r) => [String(r.id), r]));

      setFavoriteRooms(withFlags.filter((r) => r.isFavorite));

      const recent = recentIds
        .map((id) => byId.get(String(id)))
        .filter((r): r is Room => Boolean(r))
        .slice(0, 8);
      setRecentlyViewed(recent);
    } catch (err) {
      console.warn('Failed to load favorites', err);
      setFavoriteRooms([]);
      setRecentlyViewed([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        await load();
        if (active) setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleToggleFavorite = async (room: Room) => {
    try {
      const result = await api.toggleFavorite(room.id);
      const isFavorite = result?.isFavorite ?? false;
      if (!isFavorite) {
        setFavoriteRooms((prev) => prev.filter((r) => r.id !== room.id));
      } else {
        setFavoriteRooms((prev) => {
          if (prev.some((r) => r.id === room.id)) return prev;
          return [{ ...room, isFavorite: true }, ...prev];
        });
      }
      setRecentlyViewed((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, isFavorite } : r)),
      );
    } catch (err) {
      console.warn('Failed to toggle favorite', err);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading favorites…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />

      <View style={styles.header}>
        <Text style={styles.title}>Favorites</Text>
        <Text style={styles.subtitle}>Saved rooms and recent visits</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.sectionTitle}>Favorite rooms</Text>
        {favoriteRooms.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the heart on any room from Home to save it here for quick access.
            </Text>
          </View>
        ) : (
          favoriteRooms.map((room) => (
            <View key={room.id} style={styles.cardBlock}>
              <RoomCard
                room={room}
                onPress={onOpenRoom}
                onToggleFavorite={handleToggleFavorite}
              />
              {onBookRoom && room.status === 'AVAILABLE' ? (
                <TouchableOpacity
                  style={styles.quickBook}
                  onPress={() => onBookRoom(room)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="calendar-outline" size={16} color={colors.onPrimary} />
                  <Text style={styles.quickBookText}>Quick book</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, styles.recentTitle]}>Recently viewed</Text>
        {recentlyViewed.length === 0 ? (
          <Text style={styles.muted}>Rooms you open will show up here.</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentList}
          >
            {recentlyViewed.map((room) => (
              <TouchableOpacity
                key={`recent-${room.id}`}
                style={styles.recentCard}
                onPress={() => onOpenRoom(room)}
                activeOpacity={0.85}
              >
                <View style={styles.recentTop}>
                  <Ionicons
                    name={room.isFavorite ? 'heart' : 'business-outline'}
                    size={16}
                    color={room.isFavorite ? colors.primary : colors.steel}
                  />
                  {room.status !== 'AVAILABLE' ? (
                    <Text style={styles.recentStatus}>{room.status.replace(/_/g, ' ')}</Text>
                  ) : null}
                </View>
                <Text style={styles.recentRoomName} numberOfLines={2}>
                  {room.name}
                </Text>
                <Text style={styles.recentRoomCapacity}>Up to {room.capacity} people</Text>
                {onBookRoom && room.status === 'AVAILABLE' ? (
                  <TouchableOpacity
                    style={styles.recentBook}
                    onPress={() => onBookRoom(room)}
                  >
                    <Text style={styles.recentBookText}>Book</Text>
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.displayMd,
    color: colors.ink,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: 4,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.section,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.bodyMd,
    color: colors.muted,
  },
  sectionTitle: {
    ...typography.titleMd,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  recentTitle: {
    marginTop: spacing.xl,
  },
  cardBlock: {
    marginBottom: spacing.md,
  },
  quickBook: {
    marginTop: -4,
    marginBottom: spacing.sm,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 12,
  },
  quickBookText: {
    ...typography.buttonSm,
    color: colors.onPrimary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    ...typography.titleMd,
    color: colors.ink,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  muted: {
    ...typography.bodySm,
    color: colors.muted,
    marginBottom: spacing.md,
  },
  recentList: {
    paddingRight: spacing.base,
    gap: spacing.md,
  },
  recentCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.base,
    width: 150,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  recentTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recentStatus: {
    ...typography.captionSm,
    color: colors.warning,
    fontSize: 10,
  },
  recentRoomName: {
    ...typography.titleSm,
    color: colors.ink,
    marginBottom: 4,
    minHeight: 40,
  },
  recentRoomCapacity: {
    ...typography.captionSm,
    color: colors.muted,
  },
  recentBook: {
    marginTop: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.steelLight,
    alignItems: 'center',
  },
  recentBookText: {
    ...typography.buttonSm,
    color: colors.primary,
  },
});
