import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { DashboardTabScreen } from '../tabs/DashboardTabScreen';
import { QueueTabScreen } from '../tabs/QueueTabScreen';
import { RoomsTabScreen } from '../tabs/RoomsTabScreen';
import { ClerkProfileTabScreen } from '../tabs/ClerkProfileTabScreen';
import { BookingStatus, User } from '../types';
import { colors } from '../theme/tokens';

export type ClerkTabParamList = {
  DashboardTab: undefined;
  QueueTab: { statusFilter?: BookingStatus | 'ALL' } | undefined;
  RoomsTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<ClerkTabParamList>();

interface ClerkTabNavigatorProps {
  user: User;
  onSignOut: () => void | Promise<void>;
}

export function ClerkTabNavigator({ user, onSignOut }: ClerkTabNavigatorProps) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'DashboardTab') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'QueueTab') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'RoomsTab') {
            iconName = focused ? 'business' : 'business-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          } else {
            iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarLabel:
          route.name === 'DashboardTab'
            ? 'Dashboard'
            : route.name === 'QueueTab'
              ? 'Queue'
              : route.name === 'RoomsTab'
                ? 'Rooms'
                : route.name === 'ProfileTab'
                  ? 'Profile'
                  : route.name.replace(/Tab$/, ''),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedSoft,
        tabBarStyle: {
          backgroundColor: colors.canvas,
          borderTopWidth: 1,
          borderTopColor: colors.hairlineSoft,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
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
