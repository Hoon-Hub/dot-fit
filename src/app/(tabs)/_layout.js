import React from 'react';
import { Text, useColorScheme } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] || Colors.light;
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          height: 62 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>🏠</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: '기록',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>📊</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          title: '업적',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>🏆</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>⚙</Text>
          ),
        }}
      />
    </Tabs>
  );
}
