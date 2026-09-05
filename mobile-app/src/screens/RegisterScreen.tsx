import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Button } from '../components/Button';
import api from '../api';
import { colors, spacing, typography, radii } from '../theme/tokens';

interface RegisterScreenProps {
  onRegister: (user: any) => void;
  onNavigateToLogin?: () => void;
}

export function RegisterScreen({ onRegister, onNavigateToLogin }: RegisterScreenProps) {
  const [name, setName] = useState('Alex Rivera');
  const [email, setEmail] = useState('alex.rivera@company.com');
  const [password, setPassword] = useState('password');
  const [department, setDepartment] = useState('Product Design');
  const [contactNumber, setContactNumber] = useState('+27 82 555 0192');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setLoading(true);
    try {
      const body = await api.register({
        name,
        email,
        password,
        role: 'EMPLOYEE',
        department,
        contactNumber,
      });

      if (!body || !body.accessToken) {
        throw new Error('No access token returned from the registration endpoint.');
      }

      const me = await api.getMe();
      onRegister(me);
    } catch (err: any) {
      console.error('Register failed', err);
      Alert.alert('Registration failed', err?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Set up your employee workspace access</Text>

      <Text style={styles.label}>Full name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Jane Doe" />

      <Text style={[styles.label, { marginTop: spacing.md }]}>Email</Text>
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
      <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />

      <Text style={[styles.label, { marginTop: spacing.md }]}>Department</Text>
      <TextInput style={styles.input} value={department} onChangeText={setDepartment} placeholder="Engineering" />

      <Text style={[styles.label, { marginTop: spacing.md }]}>Contact number</Text>
      <TextInput style={styles.input} value={contactNumber} onChangeText={setContactNumber} placeholder="+27 82 555 0192" />

      <Button title="Register" onPress={handleRegister} loading={loading} style={{ marginTop: spacing.lg }} />

      {onNavigateToLogin && (
        <TouchableOpacity style={styles.switchLink} onPress={onNavigateToLogin}>
          <Text style={styles.switchText}>Already have an account? Sign in</Text>
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

export default RegisterScreen;
