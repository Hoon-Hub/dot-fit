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
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, MaxContentWidth, Spacing } from '../../constants/theme';
import {
  CHARACTER_TYPES,
  CHARACTER_TYPE_OPTIONS,
} from '../../constants/profile';
import { getCharacterType } from '../../services/storageService';
import { completeCharacterTypeSelection } from '../../services/onboardingService';
import PixelCharacter from '../../components/PixelCharacter';

const BUTTON_LABELS = {
  [CHARACTER_TYPES.NUTI]: '누티로 할게요',
  [CHARACTER_TYPES.LUTI]: '루티로 할게요',
};

export default function CharacterTypeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] || Colors.light;
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      getCharacterType().then((storedType) => {
        if (isActive && storedType) setSelectedCharacter(storedType);
      });

      return () => {
        isActive = false;
      };
    }, []),
  );

  const handleContinue = useCallback(async () => {
    if (!selectedCharacter || submitting) return;

    try {
      setSubmitting(true);
      setErrorMessage('');
      const targetRoute = await completeCharacterTypeSelection(selectedCharacter);
      if (targetRoute === '/onboarding/character') {
        router.push(targetRoute);
      } else {
        router.replace(targetRoute);
      }
    } catch (err) {
      console.error('Failed to complete character type selection:', err);
      setErrorMessage('캐릭터 타입 저장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }, [router, selectedCharacter, submitting]);

  const buttonLabel = selectedCharacter
    ? BUTTON_LABELS[selectedCharacter]
    : '선택 후 계속하기';

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
              <Text style={[styles.pixelBadgeText, { color: theme.primary }]}>DOT.FIT STEP 03</Text>
            </View>
          </View>

          <View
            style={[
              styles.previewCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            accessible
            accessibilityLabel={
              selectedCharacter
                ? `${BUTTON_LABELS[selectedCharacter].replace('로 할게요', '')} 캐릭터 미리보기`
                : '선택되지 않은 캐릭터 미리보기'
            }
          >
            <PixelCharacter
              type={selectedCharacter}
              size="large"
              muted={!selectedCharacter}
              decorative
            />
          </View>

          <View
            style={styles.selectionGroup}
            accessibilityRole="radiogroup"
            accessibilityLabel="캐릭터 타입 선택"
          >
            {CHARACTER_TYPE_OPTIONS.map((option) => {
              const selected = selectedCharacter === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: selected ? theme.primaryLight : theme.card,
                      borderColor: selected ? theme.todayBorder : 'transparent',
                    },
                  ]}
                  onPress={() => setSelectedCharacter(option.id)}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityLabel={`${option.label}, ${option.description}`}
                  accessibilityHint="이 캐릭터 타입을 선택합니다"
                  accessibilityState={{ checked: selected }}
                >
                  <View style={styles.cardCharacter} accessible={false}>
                    <PixelCharacter type={option.id} size="small" decorative />
                  </View>
                  <Text style={[styles.typeLabel, { color: theme.text }]}>{option.label}</Text>
                  <View
                    style={[
                      styles.checkMark,
                      {
                        backgroundColor: selected ? theme.primary : 'transparent',
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}
                    accessible={false}
                  >
                    {selected && <Text style={[styles.checkText, { color: theme.textInverse }]}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.footerArea}>
            {Boolean(errorMessage) && <Text style={styles.errorText}>{errorMessage}</Text>}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  backgroundColor: theme.primary,
                  opacity: selectedCharacter && !submitting ? 1 : 0.4,
                },
              ]}
              onPress={handleContinue}
              disabled={!selectedCharacter || submitting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={
                selectedCharacter
                  ? `${buttonLabel}, 캐릭터 이름 설정으로 이동`
                  : '캐릭터 타입을 선택한 후 계속하기'
              }
              accessibilityState={{ disabled: !selectedCharacter || submitting }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={theme.textInverse} />
              ) : (
                <Text style={[styles.primaryButtonText, { color: theme.textInverse }]}>{buttonLabel}</Text>
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
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  headerArea: { width: '100%', marginTop: Spacing.md },
  pixelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  pixelBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  previewCard: {
    width: '100%',
    minHeight: 220,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionGroup: { width: '100%', flexDirection: 'row', gap: Spacing.sm },
  typeCard: {
    flex: 1,
    minHeight: 126,
    borderRadius: 16,
    borderWidth: 2,
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardCharacter: { height: 70, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { marginTop: Spacing.xs, fontSize: 15, fontWeight: '700' },
  checkMark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { fontSize: 13, fontWeight: '800', lineHeight: 16 },
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
