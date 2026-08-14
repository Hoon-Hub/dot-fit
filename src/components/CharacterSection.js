import { useEffect, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Colors, Spacing } from "../constants/theme";
import { getCharacter } from "../services/storageService";

/**
 * CharacterSection Component
 *
 * 메인 사람 캐릭터 표시 영역입니다.
 * 화면 높이의 약 30%를 점유하며 (min 200px, max 320px),
 * 사용자의 생성 캐릭터 이름과 외형 공간을 제공합니다.
 */
export default function CharacterSection({ colorScheme = "light" }) {
  const theme = Colors[colorScheme] || Colors.light;
  const { height: screenHeight } = useWindowDimensions();
  const [characterName, setCharacterName] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadChar() {
      const char = await getCharacter();
      if (isMounted && char && char.name) {
        setCharacterName(char.name);
      }
    }
    loadChar();
    return () => {
      isMounted = false;
    };
  }, []);

  // 화면 높이의 약 30% 계산 (적정 min/max 제약 적용)
  const containerHeight = Math.min(
    320,
    Math.max(200, Math.round(screenHeight * 0.3)),
  );

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.characterBox,
          {
            height: containerHeight,
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        {/* 사람 캐릭터 Visual Placeholder Container */}
        <View style={styles.characterContent}>
          <View
            style={[
              styles.avatarContainer,
              { backgroundColor: theme.todayHighlight },
            ]}
          >
            {/* 사람 캐릭터 Silhouette / Avatar Figure */}
            <Text style={styles.characterEmoji}>🏃</Text>
          </View>

          {Boolean(characterName) && (
            <View
              style={[
                styles.nameBadge,
                { backgroundColor: theme.todayHighlight },
              ]}
            >
              <Text style={[styles.nameBadgeText, { color: theme.primary }]}>
                {characterName}
              </Text>
            </View>
          )}

          {/* 은은한 캐릭터 상태 메시지 */}
          <Text
            style={[styles.characterStatusText, { color: theme.textSecondary }]}
          >
            {characterName
              ? `"${characterName}님 안녕하세요!"`
              : '"오늘도 활기차게 함께 걸어요!"'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    marginVertical: Spacing.sm,
  },
  characterBox: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
  },
  characterContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  characterEmoji: {
    fontSize: 56,
  },
  characterStatusText: {
    fontSize: 13,
    fontWeight: "500",
    fontStyle: "italic",
    marginTop: 4,
  },
  nameBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 2,
  },
  nameBadgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
