import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, MaxContentWidth } from '../../constants/theme';
import { CHARACTER_TYPES } from '../../constants/profile';
import { setIntroSeen } from '../../services/storageService';
import PixelCharacter from '../../components/PixelCharacter';

export default function IntroScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] || Colors.light;
  const { height: screenHeight } = useWindowDimensions();

  const handleStart = useCallback(async () => {
    await setIntroSeen(true);
    router.replace('/onboarding/health-connect');
  }, [router]);

  const characterCardHeight = Math.min(280, Math.max(180, Math.round(screenHeight * 0.28)));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        <View style={styles.headerArea}>
          {/* 도트 장식 배지 */}
          <View style={[styles.pixelBadge, { backgroundColor: theme.todayHighlight, borderColor: theme.border }]}>
            <Text style={[styles.pixelBadgeText, { color: theme.primary }]}>DOT.FIT STEP 01</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>
            걸음이 캐릭터를{'\n'}변화시켜요
          </Text>
        </View>

        {/* 사람 캐릭터 Visual Card */}
        <View
          style={[
            styles.characterBox,
            {
              height: characterCardHeight,
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <PixelCharacter type={CHARACTER_TYPES.LUTI} size="large" />
          <View style={[styles.pixelDecorDot, { backgroundColor: theme.primary }]} />
        </View>

        {/* 설명 문구 */}
        <View style={styles.descriptionArea}>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            매일의 걸음을 기록하고나만의 캐릭터와 함께 성장해보세요.
          </Text>
        </View>

        {/* 하단 시작하기 버튼 */}
        <View style={styles.footerArea}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={handleStart}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>시작하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
  characterBox: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: Spacing.md,
  },
  pixelDecorDot: {
    position: 'absolute',
    bottom: 16,
    right: 20,
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  descriptionArea: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  footerArea: {
    width: '100%',
    marginBottom: Spacing.md,
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
