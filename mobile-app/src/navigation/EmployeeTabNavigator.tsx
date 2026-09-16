import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeTabScreen } from '../tabs/HomeTabScreen';
import { MyBookingsTabScreen } from '../tabs/MyBookingsTabScreen';
import { FavoritesTabScreen } from '../tabs/FavoritesTabScreen';
import { ProfileTabScreen } from '../tabs/ProfileTabScreen';
import { Room, Booking, User } from '../types';
import { colors } from '../theme/tokens';
import {
  floatingTabBarLabelStyle,
  getFloatingTabBarStyle,
} from './floatingTabBar';

export type EmployeeTabParamList = {
  HomeTab: undefined;
  MyBookingsTab: undefined;
  FavoritesTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<EmployeeTabParamList>();

const TAB_LABELS: Record<keyof EmployeeTabParamList, string> = {
  HomeTab: 'Home',
  MyBookingsTab: 'My Bookings',
  FavoritesTab: 'Favorites',
  ProfileTab: 'Profile',
};

interface EmployeeTabNavigatorProps {
  user: User;
  onOpenRoom: (room: Room) => void;
  onOpenBookingDetail: (booking: Booking) => void;
  onBookRoom?: (room: Room) => void;
  onSignOut: () => void | Promise<void>;
  onOpenHistory: () => void;
}

export function EmployeeTabNavigator({
  user,
  onOpenRoom,
  onOpenBookingDetail,
  onBookRoom,
  onSignOut,
  onOpenHistory,
}: EmployeeTabNavigatorProps) {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'HomeTab':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'MyBookingsTab':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'FavoritesTab':
              iconName = focused ? 'heart' : 'heart-outline';
              break;
            case 'ProfileTab':
              iconName = focused ? 'person-circle' : 'person-circle-outline';
              break;
            default:
              iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarLabel: TAB_LABELS[route.name],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedSoft,
        tabBarStyle: getFloatingTabBarStyle(insets.bottom),
        tabBarLabelStyle: floatingTabBarLabelStyle,
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      })}
    >
      <Tab.Screen name="HomeTab">
        {() => <HomeTabScreen onOpenRoom={onOpenRoom} />}
      </Tab.Screen>
      <Tab.Screen name="MyBookingsTab">
        {() => <MyBookingsTabScreen onOpenBookingDetail={onOpenBookingDetail} />}
      </Tab.Screen>
      <Tab.Screen name="FavoritesTab">
        {() => (
          <FavoritesTabScreen onOpenRoom={onOpenRoom} onBookRoom={onBookRoom} />
        )}
      </Tab.Screen>
      <Tab.Screen name="ProfileTab">
        {({ navigation }) => (
          <ProfileTabScreen
            user={user}
            onSignOut={onSignOut}
            onOpenHistory={onOpenHistory}
            onOpenMyBookings={() => navigation.navigate('MyBookingsTab')}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
