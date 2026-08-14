import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, MaxContentWidth } from '../../constants/theme';
import { saveCharacter, setOnboardingVersion } from '../../services/storageService';

const MAX_NAME_LENGTH = 10;

export default function CharacterCreationScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] || Colors.light;

  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleTextChange = (text) => {
    setErrorMsg('');
    setName(text);
  };

  const handleCreateCharacter = useCallback(async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setErrorMsg('캐릭터 이름을 입력해 주세요.');
      return;
    }

    if (trimmedName.length > MAX_NAME_LENGTH) {
      setErrorMsg(`이름은 최대 ${MAX_NAME_LENGTH}자까지 입력할 수 있습니다.`);
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const characterData = {
        id: `char_${Date.now()}`,
        name: trimmedName,
        createdAt: new Date().toISOString(),
        activityState: 'learning',
      };

      const charSaved = await saveCharacter(characterData);
      const versionSaved = await setOnboardingVersion(1);

      if (charSaved && versionSaved) {
        router.replace('/(tabs)');
      } else {
        setErrorMsg('캐릭터 저장에 실패했습니다. 다시 시도해 주세요.');
      }
    } catch (err) {
      console.error('Failed to create character:', err);
      setErrorMsg('캐릭터 생성을 처리하는 도중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }, [name, router]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.container}>
              {/* 헤더 타이틀 */}
              <View style={styles.headerArea}>
                <View style={[styles.pixelBadge, { backgroundColor: theme.todayHighlight, borderColor: theme.border }]}>
                  <Text style={[styles.pixelBadgeText, { color: theme.primary }]}>DOT.FIT STEP 03</Text>
                </View>
                <Text style={[styles.title, { color: theme.text }]}>
                  캐릭터 생성
                </Text>
              </View>

              {/* 사람 캐릭터 미리보기 카드 */}
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={[styles.avatarCircle, { backgroundColor: theme.todayHighlight }]}>
                  <Text style={styles.characterEmoji}>🏃</Text>
                </View>

                {/* 중립적 상태 표시 */}
                <View style={[styles.statusBadge, { backgroundColor: theme.todayHighlight }]}>
                  <Text style={[styles.statusBadgeText, { color: theme.textSecondary }]}>
                    함께 알아가는 중
                  </Text>
                </View>
              </View>

              {/* 캐릭터 이름 입력 영역 */}
              <View style={styles.inputArea}>
                <View style={styles.labelRow}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>캐릭터 이름</Text>
                  <Text style={[styles.counterText, { color: theme.textSecondary }]}>
                    {name.trim().length}/{MAX_NAME_LENGTH}
                  </Text>
                </View>

                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.card,
                      borderColor: errorMsg ? '#D32F2F' : theme.border,
                      color: theme.text,
                    },
                  ]}
                  placeholder="예: 또박이 (최대 10자)"
                  placeholderTextColor={theme.textSecondary}
                  value={name}
                  onChangeText={handleTextChange}
                  maxLength={MAX_NAME_LENGTH}
                  returnKeyType="done"
                  onSubmitEditing={handleCreateCharacter}
                  autoCorrect={false}
                />

                {Boolean(errorMsg) && (
                  <Text style={styles.errorText}>{errorMsg}</Text>
                )}
              </View>

              {/* 하단 생성 버튼 */}
              <View style={styles.footerArea}>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                  onPress={handleCreateCharacter}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>캐릭터 만들기</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  headerArea: {
    width: '100%',
    marginTop: Spacing.md,
    alignItems: 'flex-start',
  },
  pixelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  pixelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 34,
  },
  previewCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 2,
    padding: Spacing.lg,
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  characterEmoji: {
    fontSize: 50,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputArea: {
    width: '100%',
    marginVertical: Spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  counterText: {
    fontSize: 12,
  },
  textInput: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 13,
    marginTop: 6,
  },
  footerArea: {
    width: '100%',
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  primaryButton: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
