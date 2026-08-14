import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, useColorScheme, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '../constants/theme';
import { checkAppState } from '../services/onboardingService';

export default function InitialScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] || Colors.light;

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const state = await checkAppState();
      if (isMounted) {
        router.replace(state.targetRoute);
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.logoContainer}>
        <Text style={[styles.logoText, { color: theme.primary }]}>.fit</Text>
        <ActivityIndicator size="large" color={theme.primary} style={styles.spinner} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 2,
  },
  spinner: {
    marginTop: Spacing.lg,
  },
});
