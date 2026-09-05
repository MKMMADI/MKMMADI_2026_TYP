import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../types';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface EmployeeProfileScreenProps {
  user: User;
  onBack: () => void;
  onOpenHistory: () => void;
  onLogout: () => void;
}

export function EmployeeProfileScreen({ user, onBack, onOpenHistory, onLogout }: EmployeeProfileScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <View style={styles.profileCard}>
          <Image source={{ uri: user.avatarUrl || 'https://i.pravatar.cc/150?u=employee' }} style={styles.avatar} contentFit="cover" />
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.role}>{user.role}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Contact details</Text>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color={colors.muted} />
            <Text style={styles.infoText}>{user.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color={colors.muted} />
            <Text style={styles.infoText}>{user.contactNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="briefcase-outline" size={18} color={colors.muted} />
            <Text style={styles.infoText}>{user.department}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Bookings</Text>
          <TouchableOpacity style={styles.historyButton} onPress={onOpenHistory}>
            <Text style={styles.historyButtonText}>View booking history</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.ink} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.base, paddingBottom: spacing.section },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
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
  profileCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.xl,
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.sm,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: spacing.md,
  },
  name: {
    ...typography.displaySm,
    color: colors.ink,
  },
  role: {
    ...typography.caption,
    color: colors.muted,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionLabel: {
    ...typography.titleMd,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: spacing.sm,
  },
  infoText: {
    ...typography.bodySm,
    color: colors.body,
    flex: 1,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  historyButtonText: {
    ...typography.bodySm,
    color: colors.ink,
  },
  logoutButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutText: {
    ...typography.buttonMd,
    color: colors.onPrimary,
  },
});

export default EmployeeProfileScreen;
