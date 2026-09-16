import 'react-native-gesture-handler';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import api from './api';
import { CURRENT_USER, MOCK_BOOKINGS } from './constants/mockData';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import { RoomDetailScreen } from './screens/RoomDetailScreen';
import { BookingScreen } from './screens/BookingScreen';
import { BookingConfirmationScreen } from './screens/BookingConfirmationScreen';
import { EmployeeProfileScreen } from './screens/EmployeeProfileScreen';
import { BookingHistoryScreen } from './screens/BookingHistoryScreen';
import { BookingDetailScreen } from './screens/BookingDetailScreen';
import { ClerkDashboardScreen } from './screens/ClerkDashboardScreen';
import { ClerkTabNavigator } from './navigation/ClerkTabNavigator';
import { EmployeeTabNavigator } from './navigation/EmployeeTabNavigator';
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


function mapHistoryBooking(item: any): Booking {
  return {
    id: String(item.id),
    employeeId: String(item.employee?.id ?? item.employeeId ?? 'unknown-user'),
    startAt: item.startAt,
    endAt: item.endAt,
    purpose: item.purpose ?? '',
    status: item.status,
    createdAt: item.createdAt ?? new Date().toISOString(),
    rooms:
      item.rooms?.map((r: any) => ({
        id: String(r.id ?? `${item.id}-room`),
        roomId: String(r.roomId ?? r.room?.id ?? 'unknown-room'),
        room: r.room
          ? {
              id: String(r.room.id),
              name: r.room.name ?? 'Room',
              description: r.room.description ?? '',
              capacity: r.room.capacity ?? 0,
              status: r.room.status ?? 'AVAILABLE',
              isActive: r.room.isActive ?? true,
              imageUrl: r.room.imageUrl ?? '',
              amenities: (r.room.amenities || []).map((a: any) =>
                a?.amenity
                  ? {
                      id: String(a.amenity.id),
                      name: a.amenity.name,
                      icon: a.amenity.icon ?? 'checkmark-circle-outline',
                      description: a.amenity.description,
                    }
                  : {
                      id: String(a.id),
                      name: a.name,
                      icon: a.icon ?? 'checkmark-circle-outline',
                      description: a.description,
                    },
              ),
              floor: r.room.floor,
              location: r.room.location,
            }
          : {
              id: 'unknown-room',
              name: 'Room',
              description: '',
              capacity: 0,
              status: 'AVAILABLE' as const,
              isActive: true,
              imageUrl: '',
              amenities: [],
            },
      })) ?? [],
    requestedAmenities:
      item.amenities?.map((a: any) => ({
        id: String(a.amenity?.id ?? a.id),
        name: a.amenity?.name ?? a.name ?? 'Amenity',
        icon: a.amenity?.icon ?? 'checkmark-circle-outline',
        description: a.amenity?.description ?? '',
      })) ?? [],
  };
}

function HistoryLoader({
  onBack,
  onOpenBooking,
  onBookAgain,
}: {
  onBack: () => void;
  onOpenBooking: (b: Booking) => void;
  onBookAgain: (r: Room) => void;
}) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getBookings();
        if (mounted && Array.isArray(res)) setBookings(res.map(mapHistoryBooking));
      } catch (e) {
        console.warn('Failed to load history', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  return (
    <BookingHistoryScreen
      bookings={bookings}
      onBack={onBack}
      onOpenBooking={onOpenBooking}
      onBookAgain={onBookAgain}
    />
  );
}

function AppNavigator({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const bookings = useMemo<Booking[]>(() => MOCK_BOOKINGS, []);

  const handleOpenRoom = (room: Room) => {
    // This will be handled by navigation prop in tab navigator
    console.log('Opening room:', room.name);
  };

  const handleOpenBookingDetail = (booking: Booking) => {
    console.log('Opening booking detail:', booking.id);
  };

  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }} initialRouteName={user.role === 'CLERK' ? 'ClerkDashboard' : 'EmployeeTabs'}>
     {user.role === 'CLERK' ? (
        <AppStack.Screen name="ClerkTabs">
          {() => <ClerkTabNavigator user={user} />}
        </AppStack.Screen>
      ) : (
        <AppStack.Screen name="EmployeeTabs">
          {({ navigation }) => (
            <EmployeeTabNavigator
              user={user}
              onOpenRoom={(room: Room) => navigation.navigate('RoomDetail', { room })}
              onOpenBookingDetail={(booking: Booking) => navigation.navigate('BookingDetail', { booking })}
            />
          )}
        </AppStack.Screen>
      )}

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
            onBackHome={() => navigation.navigate('EmployeeTabs')}
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
              navigation.reset({ index: 0, routes: [{ name: 'EmployeeTabs' }] });
            }}
          />
        )}
      </AppStack.Screen>

      <AppStack.Screen name="BookingDetail">
        {({ navigation, route }: any) => (
          <BookingDetailScreen
            booking={route.params?.booking as Booking}
            onBack={() => navigation.goBack()}
            onBookAgain={(room) => navigation.navigate('Booking', { room })}
            onCancelled={() => {
              /* list will refresh when user returns to My Bookings */
            }}
          />
        )}
      </AppStack.Screen>

      <AppStack.Screen name="History">
        {({ navigation }) => (
          <HistoryLoader
            onBack={() => navigation.goBack()}
            onOpenBooking={(booking) => navigation.navigate('BookingDetail', { booking })}
            onBookAgain={(room) => navigation.navigate('Booking', { room })}
          />
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
