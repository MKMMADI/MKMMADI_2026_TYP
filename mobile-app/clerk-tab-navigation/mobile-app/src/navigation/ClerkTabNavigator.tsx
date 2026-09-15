import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { DashboardTabScreen } from '../tabs/DashboardTabScreen';
import { QueueTabScreen } from '../tabs/QueueTabScreen';
import { RoomsTabScreen } from '../tabs/RoomsTabScreen';
import { ClerkProfileTabScreen } from '../tabs/ClerkProfileTabScreen';
import { User } from '../types';

export type ClerkTabParamList = {
  DashboardTab: undefined;
  QueueTab: undefined;
  RoomsTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<ClerkTabParamList>();

interface ClerkTabNavigatorProps {
  user: User;
}

export function ClerkTabNavigator({ user }: ClerkTabNavigatorProps) {
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
        tabBarActiveTintColor: '#3E49A6',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
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
        {() => <DashboardTabScreen />}
      </Tab.Screen>
      <Tab.Screen name="QueueTab">
        {() => <QueueTabScreen />}
      </Tab.Screen>
      <Tab.Screen name="RoomsTab">
        {() => <RoomsTabScreen />}
      </Tab.Screen>
      <Tab.Screen name="ProfileTab">
        {() => <ClerkProfileTabScreen user={user} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
