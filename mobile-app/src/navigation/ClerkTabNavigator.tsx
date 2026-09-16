import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashboardTabScreen } from '../tabs/DashboardTabScreen';
import { QueueTabScreen } from '../tabs/QueueTabScreen';
import { RoomsTabScreen } from '../tabs/RoomsTabScreen';
import { ClerkProfileTabScreen } from '../tabs/ClerkProfileTabScreen';
import { BookingStatus, User } from '../types';
import { colors } from '../theme/tokens';
import {
  FloatingTabIcon,
  floatingTabBarLabelStyle,
  getFloatingTabBarStyle,
  TabIconName,
} from './floatingTabBar';

export type ClerkTabParamList = {
  DashboardTab: undefined;
  QueueTab: { statusFilter?: BookingStatus | 'ALL' } | undefined;
  RoomsTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<ClerkTabParamList>();

const TAB_LABELS: Record<keyof ClerkTabParamList, string> = {
  DashboardTab: 'Dashboard',
  QueueTab: 'Queue',
  RoomsTab: 'Rooms',
  ProfileTab: 'Profile',
};

function iconForRoute(name: keyof ClerkTabParamList, focused: boolean): TabIconName {
  switch (name) {
    case 'DashboardTab':
      return focused ? 'stats-chart' : 'stats-chart-outline';
    case 'QueueTab':
      return focused ? 'list' : 'list-outline';
    case 'RoomsTab':
      return focused ? 'business' : 'business-outline';
    case 'ProfileTab':
      return focused ? 'person-circle' : 'person-circle-outline';
    default:
      return 'ellipse-outline';
  }
}

interface ClerkTabNavigatorProps {
  user: User;
  onSignOut: () => void | Promise<void>;
}

export function ClerkTabNavigator({ user, onSignOut }: ClerkTabNavigatorProps) {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
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
      <Tab.Screen name="DashboardTab">
        {({ navigation }) => (
          <DashboardTabScreen
            user={user}
            onOpenQueue={(status) =>
              navigation.navigate('QueueTab', {
                statusFilter: status ?? 'ALL',
              })
            }
            onOpenRooms={() => navigation.navigate('RoomsTab')}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="QueueTab">
        {({ route }) => (
          <QueueTabScreen initialStatus={route.params?.statusFilter ?? 'ALL'} />
        )}
      </Tab.Screen>
      <Tab.Screen name="RoomsTab">
        {() => <RoomsTabScreen />}
      </Tab.Screen>
      <Tab.Screen name="ProfileTab">
        {() => <ClerkProfileTabScreen user={user} onSignOut={onSignOut} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
