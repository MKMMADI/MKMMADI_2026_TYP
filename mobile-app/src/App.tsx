import 'react-native-gesture-handler';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import api from './api';
import { CURRENT_USER, MOCK_BOOKINGS } from './constants/mockData';
import { HomeScreen } from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import { RoomDetailScreen } from './screens/RoomDetailScreen';
import { BookingScreen } from './screens/BookingScreen';
import { BookingConfirmationScreen } from './screens/BookingConfirmationScreen';
import { EmployeeProfileScreen } from './screens/EmployeeProfileScreen';
import { BookingHistoryScreen } from './screens/BookingHistoryScreen';
import { Booking, Room, User } from './types';
import { colors, typography } from './theme/tokens';

const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();

function AuthNavigator({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
      <AuthStack.Screen name="Login">
        {({ navigation }) => (
          <LoginScreen
            onLogin={async (user) => {
              onAuthenticated(user);
              navigation.replace('Login');
            }}
            onNavigateToRegister={() => navigation.navigate('Register')}
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="Register">
        {({ navigation }) => (
          <RegisterScreen
            onRegister={(user) => {
              onAuthenticated(user);
              navigation.replace('Login');
            }}
            onNavigateToLogin={() => navigation.navigate('Login')}
          />
        )}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
}

function AppNavigator({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const bookings = useMemo<Booking[]>(() => MOCK_BOOKINGS, []);

  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Home">
      <AppStack.Screen name="Home">
        {({ navigation }) => (
          <HomeScreen
            onOpenRoom={(room: Room) => navigation.navigate('RoomDetail', { room })}
            onOpenProfile={() => navigation.navigate('Profile')}
            onOpenHistory={() => navigation.navigate('History')}
          />
        )}
      </AppStack.Screen>

      <AppStack.Screen name="RoomDetail">
        {({ navigation, route }: any) => (
          <RoomDetailScreen
            room={route.params?.room as Room}
            onBack={() => navigation.goBack()}
            onBook={() => navigation.navigate('Booking', { room: route.params?.room as Room })}
          />
        )}
      </AppStack.Screen>

      <AppStack.Screen name="Booking">
        {({ navigation, route }: any) => (
          <BookingScreen
            room={route.params?.room as Room}
            onBack={() => navigation.goBack()}
            onConfirm={async (payload) => {
              const result = await api.createBooking(payload);
              navigation.navigate('Confirmation', { booking: result });
            }}
          />
        )}
      </AppStack.Screen>

      <AppStack.Screen name="Confirmation">
        {({ navigation, route }: any) => (
          <BookingConfirmationScreen
            booking={route.params?.booking}
            onBackHome={() => navigation.navigate('Home')}
          />
        )}
      </AppStack.Screen>

      <AppStack.Screen name="Profile">
        {({ navigation }) => (
          <EmployeeProfileScreen
            user={user ?? CURRENT_USER}
            onBack={() => navigation.goBack()}
            onOpenHistory={() => navigation.navigate('History')}
            onLogout={async () => {
              await onSignOut();
              navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
            }}
          />
        )}
      </AppStack.Screen>

      <AppStack.Screen name="History">
        {({ navigation }) => (
          <BookingHistoryScreen bookings={bookings} onBack={() => navigation.goBack()} />
        )}
      </AppStack.Screen>
    </AppStack.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authState, setAuthState] = useState<'loading' | 'auth' | 'app'>('loading');

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const { accessToken } = await api.hydrateTokens();
        if (!accessToken) {
          if (mounted) setAuthState('auth');
          return;
        }

        const me = await api.getMe();
        if (mounted) {
          setUser(me);
          setAuthState('app');
        }
      } catch (error) {
        console.warn('Session validation failed', error);
        await api.signOut();
        if (mounted) setAuthState('auth');
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  const handleAuthenticated = async (nextUser: User) => {
    setUser(nextUser);
    setAuthState('app');
  };

  const handleSignOut = async () => {
    await api.signOut();
    setUser(null);
    setAuthState('auth');
  };

  if (authState === 'loading') {
    return (
      <View style={styles.loader}>
        <Text style={styles.loaderText}>Loading your workspace…</Text>
      </View>
    );
  }

  return (
    <>
      <NavigationContainer>
        {authState === 'app' && user ? (
          <AppNavigator user={user} onSignOut={handleSignOut} />
        ) : (
          <AuthNavigator onAuthenticated={handleAuthenticated} />
        )}
      </NavigationContainer>
      <StatusBar style="dark" />
    </>
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
