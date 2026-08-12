import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] || Colors.light;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>📊</Text>
        <Text style={[styles.title, { color: theme.text }]}>활동 기록</Text>
        <Text style={[styles.subtext, { color: theme.textSecondary }]}>
          추후 전체 활동 히스토리 및 통계 기능이 구현될 예정입니다.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  subtext: { fontSize: 14, textAlign: 'center' },
});
