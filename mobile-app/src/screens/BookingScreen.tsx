import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Room } from '../types';
import { Button } from '../components/Button';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface BookingScreenProps {
  room: Room;
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

function isoFromOffset(hoursFromNow: number) {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + hoursFromNow);
  return date.toISOString();
}

export function BookingScreen({ room, onBack, onConfirm }: BookingScreenProps) {
  const [purpose, setPurpose] = useState('Planning session with design and product team');
  const [startAt, setStartAt] = useState(isoFromOffset(1));
  const [endAt, setEndAt] = useState(isoFromOffset(3));
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(room.amenities.slice(0, 2).map((a) => a.id));
  const [loading, setLoading] = useState(false);

  const dateDisplay = useMemo(() => {
    const start = new Date(startAt);
    const end = new Date(endAt);
    return `${start.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleString([], { hour: 'numeric', minute: '2-digit' })}`;
  }, [startAt, endAt]);

  function toggleAmenity(id: string) {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function handleSubmit() {
    if (!purpose.trim()) {
      Alert.alert('Missing purpose', 'Please add a short meeting purpose.');
      return;
    }

    const start = new Date(startAt);
    const end = new Date(endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      Alert.alert('Invalid time', 'Please choose a valid meeting window.');
      return;
    }

    setLoading(true);
    try {
      await onConfirm({
        purpose: purpose.trim(),
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        roomIds: [room.id],
        amenityIds: selectedAmenities,
        capacity: room.capacity,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book room</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.roomName}>{room.name}</Text>
          <Text style={styles.roomMeta}>{room.location || 'Main building'} · Floor {room.floor || 'G'}</Text>
          <Text style={styles.dateText}>{dateDisplay}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Purpose</Text>
          <TextInput
            style={styles.input}
            value={purpose}
            onChangeText={setPurpose}
            multiline
            placeholder="What is this meeting for?"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Time</Text>
          <TextInput
            style={styles.input}
            value={new Date(startAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            onChangeText={(value) => {
              const parsed = new Date(value);
              if (!Number.isNaN(parsed.getTime())) setStartAt(parsed.toISOString());
            }}
          />
          <TextInput
            style={[styles.input, { marginTop: spacing.sm }]}
            value={new Date(endAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            onChangeText={(value) => {
              const parsed = new Date(value);
              if (!Number.isNaN(parsed.getTime())) setEndAt(parsed.toISOString());
            }}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Add amenities</Text>
          <View style={styles.amenityGrid}>
            {room.amenities.map((amenity) => {
              const active = selectedAmenities.includes(amenity.id);
              return (
                <TouchableOpacity
                  key={amenity.id}
                  style={[styles.amenityOption, active && styles.amenityOptionActive]}
                  onPress={() => toggleAmenity(amenity.id)}
                >
                  <Ionicons name={amenity.icon as any} size={16} color={active ? colors.onPrimary : colors.body} />
                  <Text style={[styles.amenityText, active && styles.amenityTextActive]}>{amenity.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Estimated cost</Text>
          <Text style={styles.footerPrice}>R 550</Text>
        </View>
        <Button title="Confirm booking" onPress={handleSubmit} loading={loading} style={styles.cta} />
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
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.section,
  },
  summaryCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  roomName: {
    ...typography.displaySm,
    color: colors.ink,
  },
  roomMeta: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: 4,
  },
  dateText: {
    ...typography.caption,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  section: { marginTop: spacing.lg },
  sectionLabel: {
    ...typography.titleMd,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
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
  amenityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  amenityOptionActive: {
    backgroundColor: colors.primary,
  },
  amenityText: {
    ...typography.captionSm,
    color: colors.body,
  },
  amenityTextActive: {
    color: colors.onPrimary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.base,
    borderTopWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.canvas,
  },
  footerLabel: {
    ...typography.captionSm,
    color: colors.muted,
  },
  footerPrice: {
    ...typography.titleMd,
    color: colors.ink,
  },
  cta: { minWidth: 170 },
});

export default BookingScreen;
