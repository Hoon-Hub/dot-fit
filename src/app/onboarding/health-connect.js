import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { openHealthConnectSettings } from 'react-native-health-connect';
import { Colors, Spacing, MaxContentWidth } from '../../constants/theme';
import {
  initializeHealthConnect,
  hasStepPermission,
  requestStepPermission,
} from '../../services/healthService';
import { getCharacter } from '../../services/storageService';

export default function HealthConnectScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] || Colors.light;

  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);

  const handleConnect = useCallback(async () => {
    try {
      setLoading(true);
      setDenied(false);

      const initOk = await initializeHealthConnect();
      if (!initOk) {
        setDenied(true);
        setLoading(false);
        return;
      }

      let hasPerm = await hasStepPermission();
      if (!hasPerm) {
        hasPerm = await requestStepPermission();
      }

      if (hasPerm) {
        const character = await getCharacter();
        if (character && character.name) {
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding/character');
        }
      } else {
        setDenied(true);
      }
    } catch (err) {
      console.error('Health Connect connection failed:', err);
      setDenied(true);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleOpenSettings = useCallback(() => {
    try {
      openHealthConnectSettings();
    } catch (err) {
      console.error('Failed to open Health Connect settings:', err);
    }
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        <View style={styles.headerArea}>
          <View style={[styles.pixelBadge, { backgroundColor: theme.todayHighlight, borderColor: theme.border }]}>
            <Text style={[styles.pixelBadgeText, { color: theme.primary }]}>DOT.FIT STEP 02</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>
            걸음수를 연결해주세요
          </Text>
        </View>

        {/* 메인 아이콘 및 설명 카드 */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: theme.todayHighlight }]}>
            <Text style={styles.iconEmoji}>👣</Text>
          </View>

          <Text style={[styles.description, { color: theme.textSecondary }]}>
            오늘의 걸음과 캐릭터의 활동 상태를 기록하기 위해 Health Connect의 걸음수 권한이 필요해요.
          </Text>

          {denied && (
            <View style={[styles.deniedCard, { backgroundColor: '#FFF2F2', borderColor: '#FFB8B8' }]}>
              <Text style={[styles.deniedTitle, { color: '#D32F2F' }]}>
                권한이 필요합니다
              </Text>
              <Text style={[styles.deniedText, { color: '#5C2C2C' }]}>
                걸음수가 측정되지 않으면 캐릭터 활동 상태 기록이 어렵습니다. 앱 설정이나 Health Connect에서 권한을 허용해 주세요.
              </Text>
            </View>
          )}
        </View>

        {/* 하단 버튼 영역 */}
        <View style={styles.footerArea}>
          {!denied ? (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={handleConnect}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Health Connect 연결</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.deniedButtonContainer}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                onPress={handleConnect}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>다시 시도</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.border, backgroundColor: theme.card }]}
                onPress={handleOpenSettings}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.text }]}>설정에서 허용</Text>
              </TouchableOpacity>
            </View>
          )}
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
  infoCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 2,
    padding: Spacing.lg,
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  iconEmoji: {
    fontSize: 40,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  deniedCard: {
    width: '100%',
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  deniedTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  deniedText: {
    fontSize: 13,
    lineHeight: 18,
  },
  footerArea: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  deniedButtonContainer: {
    width: '100%',
    gap: Spacing.sm,
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
  secondaryButton: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
