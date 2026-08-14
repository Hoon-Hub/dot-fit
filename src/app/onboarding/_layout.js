import React from 'react';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/theme';

export default function OnboardingLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] || Colors.light;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="intro" options={{ headerShown: false }} />
      <Stack.Screen name="health-connect" options={{ headerShown: false }} />
      <Stack.Screen name="character-type" options={{ headerShown: false }} />
      <Stack.Screen name="character" options={{ headerShown: false }} />
      <Stack.Screen name="step-goal" options={{ headerShown: false }} />
    </Stack>
  );
}
