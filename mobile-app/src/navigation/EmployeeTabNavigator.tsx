import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeTabScreen } from '../tabs/HomeTabScreen';
import { MyBookingsTabScreen } from '../tabs/MyBookingsTabScreen';
import { FavoritesTabScreen } from '../tabs/FavoritesTabScreen';
import { ProfileTabScreen } from '../tabs/ProfileTabScreen';
import { MessagesTabScreen } from '../tabs/MessagesTabScreen';
import { Room, Booking, User } from '../types';
import { colors } from '../theme/tokens';
import {
  FloatingTabIcon,
  floatingTabBarLabelStyle,
  getFloatingTabBarStyle,
  TabIconName,
} from './floatingTabBar';

export type EmployeeTabParamList = {
  HomeTab: undefined;
  MyBookingsTab: undefined;
  FavoritesTab: undefined;
  MessagesTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<EmployeeTabParamList>();

const TAB_LABELS: Record<keyof EmployeeTabParamList, string> = {
  HomeTab: 'Home',
  MyBookingsTab: 'My Bookings',
  FavoritesTab: 'Favorites',
  MessagesTab: 'Messages',
  ProfileTab: 'Profile',
};

function iconForRoute(name: keyof EmployeeTabParamList, focused: boolean): TabIconName {
  switch (name) {
    case 'HomeTab':
      return focused ? 'home' : 'home-outline';
    case 'MyBookingsTab':
      return focused ? 'calendar' : 'calendar-outline';
    case 'FavoritesTab':
      return focused ? 'heart' : 'heart-outline';
    case 'MessagesTab':
      return focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
    case 'ProfileTab':
      return focused ? 'person-circle' : 'person-circle-outline';
    default:
      return 'ellipse-outline';
  }
}

interface EmployeeTabNavigatorProps {
  user: User;
  onOpenRoom: (room: Room) => void;
  onBookRooms: (rooms: Room[]) => void;
  onOpenBookingDetail: (booking: Booking) => void;
  onBookRoom?: (room: Room) => void;
  onSignOut: () => void | Promise<void>;
  onOpenHistory: () => void;
}

export function EmployeeTabNavigator({
  user,
  onOpenRoom,
  onBookRooms,
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
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused, color }) => (
          <FloatingTabIcon
            name={iconForRoute(route.name, focused)}
            focused={focused}
            color={color}
          />
        ),
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
        {() => <HomeTabScreen onOpenRoom={onOpenRoom} onBookRooms={onBookRooms} />}
      </Tab.Screen>
      <Tab.Screen name="MyBookingsTab">
        {() => <MyBookingsTabScreen onOpenBookingDetail={onOpenBookingDetail} />}
      </Tab.Screen>
      <Tab.Screen name="FavoritesTab">
        {() => (
          <FavoritesTabScreen onOpenRoom={onOpenRoom} onBookRoom={onBookRoom} />
        )}
      </Tab.Screen>
      <Tab.Screen name="MessagesTab">
        {() => <MessagesTabScreen user={user} />}
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
