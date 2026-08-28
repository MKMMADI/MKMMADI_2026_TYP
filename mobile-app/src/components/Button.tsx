import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, radii, typography } from '../theme/tokens';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'pill';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'tertiary' && styles.tertiary,
        variant === 'pill' && styles.pill,
        isDisabled && variant === 'primary' && styles.primaryDisabled,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'pill' ? colors.onPrimary : colors.ink}
        />
      ) : (
        <Text
          style={[
            styles.text,
            variant === 'primary' && styles.primaryText,
            variant === 'secondary' && styles.secondaryText,
            variant === 'tertiary' && styles.tertiaryText,
            variant === 'pill' && styles.pillText,
            isDisabled && styles.disabledText,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { width: '100%' },
  primary: { backgroundColor: colors.primary },
  primaryDisabled: { backgroundColor: colors.primaryDisabled },
  secondary: {
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  tertiary: { backgroundColor: 'transparent', height: 40 },
  pill: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    height: 40,
    paddingHorizontal: 20,
  },
  text: { ...typography.buttonMd },
  primaryText: { color: colors.onPrimary },
  secondaryText: { color: colors.ink },
  tertiaryText: { color: colors.ink, textDecorationLine: 'underline' },
  pillText: { ...typography.buttonSm, color: colors.onPrimary },
  disabledText: { opacity: 0.7 },
});
