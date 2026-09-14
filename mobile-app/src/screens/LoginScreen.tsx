import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Button } from '../components/Button';
import api from '../api';
import { colors, spacing, typography, radii } from '../theme/tokens';

interface LoginScreenProps {
  onLogin: (user: any) => void;
  onNavigateToRegister?: () => void;
}

export function LoginScreen({ onLogin, onNavigateToRegister }: LoginScreenProps) {
  const [email, setEmail] = useState('alex.rivera@company.com');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      const body = await api.login(email, password);
      if (!body || !body.accessToken) {
        throw new Error('No access token returned from the server.');
      }

      const me = await api.getMe();
      onLogin(me);
    } catch (err: any) {
      console.error('Login failed', err);
      Alert.alert('Login failed', err?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>
      <Text style={styles.subtitle}>Welcome back — sign in to continue</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="name@company.com"
      />

      <Text style={[styles.label, { marginTop: spacing.md }]}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
      />

      <Button title="Sign in" onPress={handleLogin} loading={loading} style={{ marginTop: spacing.lg }} />

      {onNavigateToRegister && (
        <TouchableOpacity style={styles.switchLink} onPress={onNavigateToRegister}>
          <Text style={styles.switchText}>Need an account? Register</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.base,
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  title: {
    ...typography.displayLg,
    color: colors.ink,
    marginBottom: 6,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.muted,
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.captionSm,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E6E9EE',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
    marginTop: spacing.sm,
  },
  switchLink: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  switchText: {
    ...typography.caption,
    color: colors.primary,
  },
});

export default LoginScreen;
