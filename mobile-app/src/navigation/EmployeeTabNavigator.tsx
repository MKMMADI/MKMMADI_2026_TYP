import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { HomeTabScreen } from '../tabs/HomeTabScreen';
import { MyBookingsTabScreen } from '../tabs/MyBookingsTabScreen';
import { FavoritesTabScreen } from '../tabs/FavoritesTabScreen';
import { ProfileTabScreen } from '../tabs/ProfileTabScreen';
import { Room, Booking, User } from '../types';

export type EmployeeTabParamList = {
  HomeTab: undefined;
  MyBookingsTab: undefined;
  FavoritesTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<EmployeeTabParamList>();

interface EmployeeTabNavigatorProps {
  user: User;
  onOpenRoom: (room: Room) => void;
  onOpenBookingDetail: (booking: Booking) => void;
}

export function EmployeeTabNavigator({ user, onOpenRoom, onOpenBookingDetail }: EmployeeTabNavigatorProps) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MyBookingsTab') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'FavoritesTab') {
            iconName = focused ? 'heart' : 'heart-outline';
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
      <Tab.Screen name="HomeTab">
        {() => <HomeTabScreen onOpenRoom={onOpenRoom} />}
      </Tab.Screen>
      <Tab.Screen name="MyBookingsTab">
        {() => <MyBookingsTabScreen onOpenBookingDetail={onOpenBookingDetail} />}
      </Tab.Screen>
      <Tab.Screen name="FavoritesTab">
        {() => <FavoritesTabScreen onOpenRoom={onOpenRoom} />}
      </Tab.Screen>
      <Tab.Screen name="ProfileTab">
        {() => <ProfileTabScreen user={user} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
