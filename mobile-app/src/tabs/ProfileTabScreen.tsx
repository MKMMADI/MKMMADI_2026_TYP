import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { User, Booking } from '../types';
import { colors, spacing, typography, radii } from '../theme/tokens';
import api from '../api';
import { getFavoriteRoomIds } from '../lib/preferences';

interface ProfileTabScreenProps {
  user: User;
  onSignOut: () => void | Promise<void>;
  onOpenHistory: () => void;
  onOpenMyBookings?: () => void;
}

function mapBooking(item: any): Booking {
  return {
    id: String(item.id),
    employeeId: String(item.employee?.id ?? item.employeeId ?? ''),
    startAt: item.startAt,
    endAt: item.endAt,
    purpose: item.purpose ?? '',
    status: item.status,
    createdAt: item.createdAt ?? new Date().toISOString(),
    rooms: item.rooms ?? [],
    requestedAmenities: item.amenities ?? [],
  };
}

export function ProfileTabScreen({
  user,
  onSignOut,
  onOpenHistory,
  onOpenMyBookings,
}: ProfileTabScreenProps) {
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    pending: 0,
    favorites: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    try {
      const [bookingsRes, favIds] = await Promise.all([
        api.getBookings().catch(() => []),
        getFavoriteRoomIds().catch(() => [] as string[]),
      ]);
      const bookings = Array.isArray(bookingsRes) ? bookingsRes.map(mapBooking) : [];
      const now = Date.now();
      const upcoming = bookings.filter(
        (b) =>
          new Date(b.endAt).getTime() >= now &&
          b.status !== 'CANCELLED' &&
          b.status !== 'COMPLETED',
      ).length;
      const pending = bookings.filter((b) => b.status === 'PENDING').length;
      setStats({
        total: bookings.length,
        upcoming,
        pending,
        favorites: favIds.length,
      });
    } catch (err) {
      console.warn('Failed to load profile summary', err);
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

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await api.signOut();
            await onSignOut();
          } catch (err) {
            console.warn('Sign out error', err);
            await onSignOut();
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  const initial = (user.name || user.email || '?').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            )}
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.badgeRow}>
            {!!user.department && (
              <Text style={styles.userDepartment}>{user.department}</Text>
            )}
            <Text style={styles.rolePill}>{user.role}</Text>
          </View>
          {!!user.contactNumber && (
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={14} color={colors.muted} />
              <Text style={styles.contactText}>{user.contactNumber}</Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
          ) : (
            <>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.upcoming}</Text>
                <Text style={styles.statLabel}>Upcoming</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>All bookings</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.favorites}</Text>
                <Text style={styles.statLabel}>Favorites</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bookings</Text>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={onOpenMyBookings}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="calendar-outline" size={22} color={colors.ink} />
              <Text style={styles.menuItemText}>My bookings</Text>
            </View>
            <View style={styles.menuItemRight}>
              {stats.upcoming > 0 ? (
                <Text style={styles.menuItemValue}>{stats.upcoming} upcoming</Text>
              ) : null}
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={onOpenHistory}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="time-outline" size={22} color={colors.ink} />
              <Text style={styles.menuItemText}>Booking history</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="mail-outline" size={22} color={colors.ink} />
              <Text style={styles.menuItemText}>Email</Text>
            </View>
            <Text style={styles.menuItemValue} numberOfLines={1}>
              {user.email}
            </Text>
          </View>
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="briefcase-outline" size={22} color={colors.ink} />
              <Text style={styles.menuItemText}>Department</Text>
            </View>
            <Text style={styles.menuItemValue}>{user.department || '—'}</Text>
          </View>
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="call-outline" size={22} color={colors.ink} />
              <Text style={styles.menuItemText}>Phone</Text>
            </View>
            <Text style={styles.menuItemValue}>{user.contactNumber || '—'}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={signingOut}
          activeOpacity={0.85}
        >
          {signingOut ? (
            <ActivityIndicator color="#A32323" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#A32323" />
              <Text style={styles.logoutText}>Sign out</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.version}>MKMMADI · Employee</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.base, paddingBottom: spacing.section },
  profileHeader: { alignItems: 'center', paddingVertical: spacing.xl },
  avatarContainer: { marginBottom: spacing.md },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { ...typography.displayMd, color: colors.white, fontWeight: '700' },
  userName: { ...typography.titleLg, color: colors.ink, marginBottom: 4 },
  userEmail: { ...typography.bodyMd, color: colors.muted, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  userDepartment: {
    ...typography.bodySm,
    color: colors.ink,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rolePill: {
    ...typography.captionSm,
    color: colors.onPrimary,
    backgroundColor: colors.steel,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    fontWeight: '600',
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  contactText: { ...typography.bodySm, color: colors.muted },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  statCard: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 72,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  statValue: { ...typography.titleMd, color: colors.primary },
  statLabel: { ...typography.captionSm, color: colors.muted, marginTop: 2, textAlign: 'center' },
  section: {
    marginTop: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  sectionTitle: {
    ...typography.captionSm,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairlineSoft,
    gap: spacing.sm,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  menuItemRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  menuItemText: { ...typography.bodyMd, color: colors.ink },
  menuItemValue: { ...typography.bodySm, color: colors.muted, maxWidth: 160 },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: '#F0C4C0',
  },
  logoutText: { ...typography.bodyMd, color: '#A32323', fontWeight: '600' },
  version: { ...typography.captionSm, color: colors.muted, textAlign: 'center', marginTop: spacing.lg },
});
