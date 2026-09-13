import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { HomeScreen } from '../../src/screens/HomeScreen';
import { ClerkQueueScreen } from '../../src/screens/ClerkQueueScreen';
import { useAuth } from '../../src/auth/AuthProvider';
import { Room } from '../../src/types';
import { colors, typography, spacing } from '../../src/theme/tokens';

export default function HomeRoute() {
  const router = useRouter();
  const { user, state } = useAuth();

  // Managers use the web app — keep mobile focused on employee + clerk
  useEffect(() => {
    if (state === 'app' && user?.role === 'MANAGER') {
      // Still allow manager to open app; they land on employee home as fallback
    }
  }, [state, user]);

  if (state === 'loading' || !user) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loaderText}>Loading workspace…</Text>
      </View>
    );
  }

  if (user.role === 'CLERK') {
    return (
      <ClerkQueueScreen
        onOpenProfile={() => router.push('/profile')}
        onOpenStock={() => router.push('/stock')}
      />
    );
  }

  return (
    <HomeScreen
      onOpenRoom={(room: Room) =>
        router.push({ pathname: '/room/[room]', params: { room: JSON.stringify(room) } })
      }
      onOpenProfile={() => router.push('/profile')}
      onOpenHistory={() => router.push('/history')}
    />
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.canvas,
    gap: spacing.sm,
  },
  loaderText: {
    ...typography.bodySm,
    color: colors.muted,
  },
});
