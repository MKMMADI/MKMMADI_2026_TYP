import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Room } from '../types';
import { colors, spacing, typography, radii } from '../theme/tokens';
import api from '../api';

interface FavoritesTabScreenProps {
  onOpenRoom: (room: Room) => void;
}

export function FavoritesTabScreen({ onOpenRoom }: FavoritesTabScreenProps) {
  const [favoriteRooms, setFavoriteRooms] = useState<Room[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadRooms() {
      setLoading(true);
      try {
        const rooms = await api.getRooms();
        if (mounted && Array.isArray(rooms)) {
          const favorites = rooms.filter((r: Room) => r.isFavorite);
          setFavoriteRooms(favorites);
          
          const recentlyViewedRooms = rooms.slice(0, 3);
          setRecentlyViewed(recentlyViewedRooms);
        }
      } catch (err) {
        console.warn('Failed to load rooms', err);
      } finally {
        setLoading(false);
      }
    }
    loadRooms();
    return () => { mounted = false; };
  }, []);

  const handleToggleFavorite = async (room: Room) => {
    try {
      await api.toggleFavorite(room.id);
      setFavoriteRooms((prev) =>
        prev.filter((r) => r.id !== room.id)
      );
    } catch (err) {
      console.warn('Failed to remove favorite', err);
    }
  };

  const handleRoomPress = (room: Room) => {
    onOpenRoom(room);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
        <View style={styles.loadingContainer}>
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
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {favoriteRooms.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Favorite Rooms</Text>
            {favoriteRooms.map((room) => (
              <TouchableOpacity
                key={room.id}
                style={styles.roomCard}
                onPress={() => handleRoomPress(room)}
                activeOpacity={0.7}
              >
                <View style={styles.roomInfo}>
                  <Text style={styles.roomName}>{room.name}</Text>
                  <Text style={styles.roomLocation}>
                    {room.location ?? `Capacity: ${room.capacity}`}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleToggleFavorite(room)}
                  style={styles.favoriteButton}
                >
                  <Ionicons name="heart" size={24} color="#E91E63" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the heart icon on any room to add it to your favorites
            </Text>
          </View>
        )}

        {recentlyViewed.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, styles.recentTitle]}>Recently Viewed</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentList}
            >
              {recentlyViewed.map((room) => (
                <TouchableOpacity
                  key={room.id}
                  style={styles.recentCard}
                  onPress={() => handleRoomPress(room)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.recentRoomName}>{room.name}</Text>
                  <Text style={styles.recentRoomCapacity}>
                    {room.capacity} people
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
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
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.section,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.bodyMd,
    color: colors.muted,
  },
  sectionTitle: {
    ...typography.titleMd,
    color: colors.ink,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  recentTitle: {
    marginTop: spacing.xl,
  },
  roomCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    ...typography.titleSm,
    color: colors.ink,
    marginBottom: 4,
  },
  roomLocation: {
    ...typography.bodySm,
    color: colors.muted,
  },
  favoriteButton: {
    padding: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
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
    paddingHorizontal: spacing.lg,
  },
  recentList: {
    paddingRight: spacing.base,
  },
  recentCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.base,
    marginRight: spacing.md,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recentRoomName: {
    ...typography.titleSm,
    color: colors.ink,
    marginBottom: 4,
  },
  recentRoomCapacity: {
    ...typography.captionSm,
    color: colors.muted,
  },
});
