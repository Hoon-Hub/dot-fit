import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import StepGoalSelector from '../../components/StepGoalSelector';
import { MAX_CHARACTER_NAME_LENGTH } from '../../constants/profile';
import { Colors, MaxContentWidth, Spacing } from '../../constants/theme';
import { formatNumber, getTodayDateString } from '../../utils/dateUtils';
import { getGoalState, scheduleGoalChange } from '../../services/goalService';
import { getCharacter, saveCharacter } from '../../services/storageService';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] || Colors.light;
  const [character, setCharacter] = useState(null);
  const [name, setName] = useState('');
  const [goalState, setGoalState] = useState(null);
  const [selectedGoalSteps, setSelectedGoalSteps] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [nameMessage, setNameMessage] = useState('');
  const [goalMessage, setGoalMessage] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      Promise.all([getCharacter(), getGoalState()])
        .then(([storedCharacter, storedGoalState]) => {
          if (!isActive) return;
          setCharacter(storedCharacter);
          setName(storedCharacter?.name ?? '');
          setGoalState(storedGoalState);
          setSelectedGoalSteps(null);
        })
        .catch((err) => {
          console.error('Failed to load settings:', err);
          if (isActive) setGoalMessage('설정을 불러오지 못했습니다.');
        })
        .finally(() => {
          if (isActive) setLoading(false);
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  const handleSaveName = useCallback(async () => {
    const trimmedName = name.trim();
    setNameMessage('');

    if (!trimmedName) {
      setNameMessage('공백이 아닌 이름을 입력해 주세요.');
      return;
    }
    if (trimmedName.length > MAX_CHARACTER_NAME_LENGTH) {
      setNameMessage(`이름은 최대 ${MAX_CHARACTER_NAME_LENGTH}자까지 입력할 수 있습니다.`);
      return;
    }
    if (!character || trimmedName === character.name) {
      setNameMessage('변경할 이름을 입력해 주세요.');
      return;
    }

    try {
      setSavingName(true);
      const updatedCharacter = { ...character, name: trimmedName };
      if (!(await saveCharacter(updatedCharacter))) throw new Error('Failed to save character.');
      setCharacter(updatedCharacter);
      setName(trimmedName);
      setNameMessage('이름을 변경했습니다.');
    } catch (err) {
      console.error('Failed to update character name:', err);
      setNameMessage('이름 저장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSavingName(false);
    }
  }, [character, name]);

  const handleSaveGoal = useCallback(async () => {
    if (!selectedGoalSteps || savingGoal) return;

    try {
      setSavingGoal(true);
      setGoalMessage('');
      const updatedGoalState = await scheduleGoalChange(selectedGoalSteps);
      setGoalState(updatedGoalState);
      setSelectedGoalSteps(null);
      setGoalMessage(
        `${updatedGoalState.pendingEffectiveDate}부터 ${formatNumber(updatedGoalState.pendingGoalSteps)}걸음이 적용됩니다.`,
      );
    } catch (err) {
      console.error('Failed to schedule step goal:', err);
      setGoalMessage(err.message || '목표 저장에 실패했습니다.');
    } finally {
      setSavingGoal(false);
    }
  }, [savingGoal, selectedGoalSteps]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const changedToday = goalState?.lastGoalChangedDate === getTodayDateString();
  const goalEditingDisabled = changedToday || Boolean(goalState?.pendingGoalSteps);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <Text style={[styles.screenTitle, { color: theme.text }]}>설정</Text>

          <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>이름</Text>
            <Text style={[styles.currentText, { color: theme.textSecondary }]}>
              현재 이름: {character?.name ?? '-'}
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={name}
              onChangeText={(value) => {
                setName(value);
                setNameMessage('');
              }}
              maxLength={MAX_CHARACTER_NAME_LENGTH}
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
              accessibilityLabel="캐릭터 이름"
            />
            <Text style={[styles.counter, { color: theme.textSecondary }]}>
              {name.trim().length}/{MAX_CHARACTER_NAME_LENGTH}
            </Text>
            {Boolean(nameMessage) && (
              <Text style={[styles.message, { color: theme.textSecondary }]}>{nameMessage}</Text>
            )}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primary, opacity: savingName ? 0.5 : 1 }]}
              onPress={handleSaveName}
              disabled={savingName}
              accessibilityRole="button"
            >
              {savingName ? (
                <ActivityIndicator size="small" color={theme.textInverse} />
              ) : (
                <Text style={[styles.buttonText, { color: theme.textInverse }]}>이름 저장</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>목표 걸음 수</Text>
            <Text style={[styles.currentGoal, { color: theme.text }]}>
              현재 목표 {formatNumber(goalState?.activeGoalSteps)}걸음
            </Text>
            <Text style={[styles.guideText, { color: theme.textSecondary }]}>
              목표 변경은 하루에 한 번 가능하며, 변경한 목표는 다음 날 00:00부터 적용됩니다.
            </Text>

            {goalState?.pendingGoalSteps ? (
              <View style={[styles.pendingCard, { backgroundColor: theme.todayHighlight, borderColor: theme.border }]}>
                <Text style={[styles.pendingTitle, { color: theme.text }]}>예약된 목표</Text>
                <Text style={[styles.pendingText, { color: theme.textSecondary }]}>
                  {goalState.pendingEffectiveDate}부터 {formatNumber(goalState.pendingGoalSteps)}걸음
                </Text>
              </View>
            ) : null}

            <StepGoalSelector
              selectedGoalSteps={selectedGoalSteps}
              onSelect={(value) => {
                setSelectedGoalSteps(value);
                setGoalMessage('');
              }}
              colorScheme={colorScheme}
              disabled={goalEditingDisabled || savingGoal}
              disabledGoalSteps={[goalState?.activeGoalSteps]}
            />

            {goalEditingDisabled && (
              <Text style={[styles.message, { color: theme.textSecondary }]}>
                오늘은 이미 목표를 변경했습니다. 내일 다시 변경할 수 있어요.
              </Text>
            )}
            {Boolean(goalMessage) && (
              <Text style={[styles.message, { color: theme.textSecondary }]}>{goalMessage}</Text>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: theme.primary,
                  opacity: selectedGoalSteps && !goalEditingDisabled && !savingGoal ? 1 : 0.4,
                },
              ]}
              onPress={handleSaveGoal}
              disabled={!selectedGoalSteps || goalEditingDisabled || savingGoal}
              accessibilityRole="button"
            >
              {savingGoal ? (
                <ActivityIndicator size="small" color={theme.textInverse} />
              ) : (
                <Text style={[styles.buttonText, { color: theme.textInverse }]}>목표 변경</Text>
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
  scrollContent: { alignItems: 'center', paddingBottom: Spacing.xl },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { fontSize: 28, fontWeight: '800', marginVertical: Spacing.md },
  section: { borderWidth: 1, borderRadius: 18, padding: Spacing.md, gap: Spacing.sm },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  currentText: { fontSize: 13 },
  input: { height: 50, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, fontSize: 16 },
  counter: { fontSize: 12, textAlign: 'right' },
  currentGoal: { fontSize: 17, fontWeight: '700' },
  guideText: { fontSize: 13, lineHeight: 19, marginBottom: Spacing.xs },
  pendingCard: { borderWidth: 1, borderRadius: 12, padding: Spacing.sm },
  pendingTitle: { fontSize: 13, fontWeight: '700' },
  pendingText: { fontSize: 13, marginTop: 3 },
  message: { fontSize: 13, lineHeight: 18 },
  button: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xs },
  buttonText: { fontSize: 15, fontWeight: '700' },
});
