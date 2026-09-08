import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '../src/auth/AuthProvider';
import { colors, typography } from '../src/theme/tokens';

function RouteGuard() {
  const { state } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const group = segments[0];

  useEffect(() => {
    if (state === 'loading') return;
    if (state === 'app' && group !== '(app)') {
      router.replace('/');
    } else if (state === 'auth' && group !== '(auth)') {
      router.replace('/login');
    }
  }, [group, router, state]);

  if (state === 'loading') {
    return (
      <View style={styles.loader}>
        <Text style={styles.loaderText}>Loading your workspace...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="dark" />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RouteGuard />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.canvas,
  },
  loaderText: {
    ...typography.titleMd,
    color: colors.ink,
  },
});
