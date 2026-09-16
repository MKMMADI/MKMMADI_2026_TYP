import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person-circle" size={60} color={colors.primary} />
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <Text style={styles.department}>{user.department}</Text>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="settings-outline" size={20} color={colors.ink} />
          <Text style={styles.menuText}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="time-outline" size={20} color={colors.ink} />
          <Text style={styles.menuText}>Work History</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Support</Text>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="help-circle-outline" size={20} color={colors.ink} />
          <Text style={styles.menuText}>Help & Support</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="information-circle-outline" size={20} color={colors.ink} />
          <Text style={styles.menuText}>About</Text>
        </TouchableOpacity>
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
            <Text style={styles.logoutText}>Sign Out</Text>
          </>
        )}
      </TouchableOpacity>
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
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.displayMd,
    color: colors.ink,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F4',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  name: {
    ...typography.titleLg,
    color: colors.ink,
  },
  email: {
    ...typography.bodyMd,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  department: {
    ...typography.bodySm,
    color: colors.body,
    marginTop: spacing.xs,
  },
  menuSection: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F4',
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
  },
  menuText: {
    ...typography.bodyMd,
    color: colors.ink,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.lg,
  },
  logoutText: {
    ...typography.bodyMd,
    color: colors.error,
  },
});
