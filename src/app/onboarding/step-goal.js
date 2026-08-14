import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import StepGoalSelector from '../../components/StepGoalSelector';
import { Colors, MaxContentWidth, Spacing } from '../../constants/theme';
import { createInitialGoal } from '../../services/goalService';
import { CURRENT_ONBOARDING_VERSION } from '../../services/onboardingService';
import { setOnboardingVersion } from '../../services/storageService';

export default function StepGoalOnboardingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] || Colors.light;
  const [selectedGoalSteps, setSelectedGoalSteps] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleComplete = useCallback(async () => {
    if (!selectedGoalSteps || submitting) return;

    try {
      setSubmitting(true);
      setErrorMessage('');
      await createInitialGoal(selectedGoalSteps);
      if (!(await setOnboardingVersion(CURRENT_ONBOARDING_VERSION))) {
        throw new Error('Failed to save onboarding version.');
      }
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Failed to complete step goal onboarding:', err);
      setErrorMessage('목표 저장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }, [router, selectedGoalSteps, submitting]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.headerArea}>
            <View
              style={[
                styles.pixelBadge,
                { backgroundColor: theme.todayHighlight, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.pixelBadgeText, { color: theme.primary }]}>
                DOT.FIT STEP 04
              </Text>
            </View>
            <Text style={[styles.title, { color: theme.text }]}>하루 목표를 선택해 주세요</Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              선택한 목표는 오늘부터 적용되며, 달성하면 표시된 코인을 받아요.
            </Text>
          </View>

          <StepGoalSelector
            selectedGoalSteps={selectedGoalSteps}
            onSelect={setSelectedGoalSteps}
            colorScheme={colorScheme}
            disabled={submitting}
          />

          <View style={styles.footerArea}>
            {Boolean(errorMessage) && <Text style={styles.errorText}>{errorMessage}</Text>}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  backgroundColor: theme.primary,
                  opacity: selectedGoalSteps && !submitting ? 1 : 0.4,
                },
              ]}
              onPress={handleComplete}
              disabled={!selectedGoalSteps || submitting}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              {submitting ? (
                <ActivityIndicator size="small" color={theme.textInverse} />
              ) : (
                <Text style={[styles.primaryButtonText, { color: theme.textInverse }]}>완료</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  headerArea: { width: '100%', marginTop: Spacing.md },
  pixelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  pixelBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: '800', lineHeight: 34 },
  description: { fontSize: 14, lineHeight: 21, marginTop: Spacing.sm },
  footerArea: { width: '100%', marginBottom: Spacing.md },
  errorText: { color: '#D32F2F', fontSize: 13, marginBottom: Spacing.sm },
  primaryButton: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { fontSize: 17, fontWeight: '700' },
});
