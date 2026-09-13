import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface ClerkStockScreenProps {
  onBack: () => void;
}

export function ClerkStockScreen({ onBack }: ClerkStockScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.back} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Stock</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.heading}>Quick stock adjust</Text>
        <Text style={styles.copy}>
          Issue consumables while preparing a room. Full inventory levels stay with managers; this
          screen will list low items and simple ± adjustments in a follow-up sprint.
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Coming next</Text>
          <Text style={styles.copy}>Use the preparation queue for room status updates today.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.titleMd, color: colors.ink },
  body: { padding: spacing.base },
  heading: { ...typography.displaySm, color: colors.ink, marginBottom: 8 },
  copy: { ...typography.bodySm, color: colors.muted, lineHeight: 20 },
  card: {
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.lg,
    padding: spacing.base,
  },
  cardTitle: { ...typography.titleMd, color: colors.ink, marginBottom: 6 },
});

export default ClerkStockScreen;
