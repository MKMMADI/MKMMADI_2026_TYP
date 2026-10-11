import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useAppTheme } from '../theme/AppTheme';
import { lightColors, radii, spacing, typography } from '../theme/tokens';
import type { ColorPalette } from '../theme/tokens';

interface NativeDateTimePickerProps {
  label: string;
  value: Date;
  mode: 'date' | 'time';
  onChange: (value: Date) => void;
  minimumDate?: Date;
}

export function NativeDateTimePicker({
  label,
  value,
  mode,
  onChange,
  minimumDate,
}: NativeDateTimePickerProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(value);

  function openPicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode,
        minimumDate,
        is24Hour: false,
        onChange: (event, selectedDate) => {
          if (event.type === 'set' && selectedDate) onChange(selectedDate);
        },
      });
      return;
    }

    setDraft(value);
    setVisible(true);
  }

  return (
    <>
      <TouchableOpacity
        style={styles.field}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Ionicons
          name={mode === 'date' ? 'calendar-outline' : 'time-outline'}
          size={18}
          color={colors.primary}
        />
        <Text style={styles.value}>
          {mode === 'date' ? format(value, 'EEEE, d MMMM yyyy') : format(value, 'h:mm a')}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.muted} />
      </TouchableOpacity>

      {Platform.OS === 'ios' ? (
        <Modal
          visible={visible}
          animationType="slide"
          transparent
          onRequestClose={() => setVisible(false)}
        >
          <Pressable style={styles.backdrop} onPress={() => setVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setVisible(false)} accessibilityRole="button">
                <Text style={styles.action}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.title}>{mode === 'date' ? 'Select date' : 'Select time'}</Text>
              <TouchableOpacity
                onPress={() => {
                  onChange(draft);
                  setVisible(false);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.action}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerContainer}>
              <DateTimePicker
                style={styles.picker}
                value={draft}
                mode={mode}
                display="spinner"
                themeVariant="light"
                textColor={lightColors.ink}
                accentColor={lightColors.primary}
                minimumDate={minimumDate}
                onChange={(_, selectedDate) => {
                  if (selectedDate) setDraft(selectedDate);
                }}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    field: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.canvas,
    },
    value: {
      ...typography.bodyMd,
      color: colors.ink,
      flex: 1,
      textAlign: 'center',
    },
    pickerContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    picker: {
      alignSelf: 'center',
      width: '100%',
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(16,42,67,0.35)',
    },
    sheet: {
      backgroundColor: lightColors.canvas,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      paddingBottom: spacing.xl,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: lightColors.hairline,
    },
    title: {
      ...typography.titleMd,
      color: lightColors.ink,
    },
    action: {
      ...typography.buttonSm,
      color: lightColors.primary,
    },
  });
}
