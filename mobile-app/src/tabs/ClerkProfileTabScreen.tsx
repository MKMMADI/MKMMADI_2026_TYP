import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../types';
import { colors, spacing, typography, radii } from '../theme/tokens';
import api from '../api';

export interface ClerkProfileTabScreenProps {
  user: User;
  onSignOut: () => void | Promise<void>;
}

export function ClerkProfileTabScreen({ user, onSignOut }: ClerkProfileTabScreenProps) {
  const [signingOut, setSigningOut] = useState(false);
  const initial = (user.name || user.email || '?').charAt(0).toUpperCase();

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

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headerTitle}>Profile</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.badgeRow}>
            {!!user.department && (
              <Text style={styles.department}>{user.department}</Text>
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

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuItem}>
            <Ionicons name="mail-outline" size={20} color={colors.ink} />
            <Text style={styles.menuText}>Email</Text>
            <Text style={styles.menuValue} numberOfLines={1}>
              {user.email}
            </Text>
          </View>
          <View style={styles.menuItem}>
            <Ionicons name="briefcase-outline" size={20} color={colors.ink} />
            <Text style={styles.menuText}>Department</Text>
            <Text style={styles.menuValue}>{user.department || '—'}</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Ops</Text>
          <View style={styles.hintCard}>
            <Ionicons name="information-circle-outline" size={18} color={colors.steel} />
            <Text style={styles.hintText}>
              Use Dashboard for today’s overview, Queue to advance prep status, and Rooms to flag
              maintenance.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={signingOut}
          activeOpacity={0.85}
        >
          {signingOut ? (
            <ActivityIndicator color={colors.error} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
              <Text style={styles.logoutText}>Sign out</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.version}>MKMMADI · Clerk</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingBottom: spacing.section },
  headerTitle: {
    ...typography.displayMd,
    color: colors.ink,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { ...typography.displayMd, color: colors.white, fontWeight: '700' },
  name: { ...typography.titleLg, color: colors.ink },
  email: { ...typography.bodyMd, color: colors.muted, marginTop: 4 },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    justifyContent: 'center',
  },
  department: {
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
    fontWeight: '600',
    overflow: 'hidden',
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  contactText: { ...typography.bodySm, color: colors.muted },
  menuSection: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    padding: spacing.base,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
  },
  sectionTitle: {
    ...typography.captionSm,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairlineSoft,
  },
  menuText: { ...typography.bodyMd, color: colors.ink, flex: 1 },
  menuValue: { ...typography.bodySm, color: colors.muted, maxWidth: 160 },
  hintCard: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  hintText: { ...typography.bodySm, color: colors.body, flex: 1 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#F0C4C0',
    backgroundColor: colors.white,
  },
  logoutText: { ...typography.bodyMd, color: colors.error, fontWeight: '600' },
  version: {
    ...typography.captionSm,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
