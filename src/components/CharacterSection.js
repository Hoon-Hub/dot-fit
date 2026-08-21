import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  ACTIVITY_DATA_STATUS,
  ACTIVITY_STATE_LABELS,
} from "../constants/activity";
import { getCharacterImageSource } from "../constants/characterImages";
import { Colors, Spacing } from "../constants/theme";
import { getCharacter, getCharacterType } from "../services/storageService";
import PixelCharacter from "./PixelCharacter";

const CHARACTER_VISUAL_PADDING = Spacing.sm;

/**
 * CharacterSection Component
 *
 * 메인 사람 캐릭터 표시 영역입니다.
 * 화면 높이에 맞춘 캐릭터와 이름, 활동 상태를 표시합니다.
 * 사용자의 생성 캐릭터 이름과 외형 공간을 제공합니다.
 */
export default function CharacterSection({
  activityDataStatus,
  activityState,
  colorScheme = "light",
}) {
  const router = useRouter();
  const theme = Colors[colorScheme] || Colors.light;
  const {
    width: screenWidth,
    height: screenHeight,
  } = useWindowDimensions();
  const [characterName, setCharacterName] = useState("");
  const [characterType, setCharacterType] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function loadChar() {
        const [char, storedType] = await Promise.all([
          getCharacter(),
          getCharacterType(),
        ]);
        if (!isMounted) return;

        if (!storedType) {
          router.replace("/onboarding/character-type");
          return;
        }

        setCharacterType(storedType);
        if (isMounted && char && char.name) {
          setCharacterName(char.name);
        }
      }

      loadChar();

      return () => {
        isMounted = false;
      };
    }, [router]),
  );

  const characterHeight = Math.min(
    Math.max(screenHeight * 0.32, 240),
    320,
  );
  const characterImageSource = getCharacterImageSource({
    characterType,
    activityDataStatus,
    activityState,
  });
  const characterImageDimensions = characterImageSource
    ? Image.resolveAssetSource(characterImageSource)
    : null;
  const calculatedWidth = characterImageDimensions
    ? characterHeight *
      (characterImageDimensions.width / characterImageDimensions.height)
    : characterHeight;
  const characterWidth = Math.min(calculatedWidth, screenWidth * 0.7, 300);
  const characterVisualWidth = characterWidth + CHARACTER_VISUAL_PADDING * 2;
  const characterVisualHeight = characterHeight + CHARACTER_VISUAL_PADDING * 2;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.characterBox,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        {/* 사람 캐릭터 Visual Placeholder Container */}
        <View style={styles.characterContent}>
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

          <View
            style={[
              styles.characterVisual,
              {
                width: characterVisualWidth,
                height: characterVisualHeight,
              },
            ]}
          >
            {characterImageSource ? (
              <Image
                source={characterImageSource}
                style={{ width: characterWidth, height: characterHeight }}
                resizeMode="contain"
                accessibilityLabel={`누티 ${ACTIVITY_STATE_LABELS[activityState]} 상태 캐릭터`}
              />
            ) : (
              <PixelCharacter type={characterType} size="large" />
            )}
          </View>

          {/* 은은한 캐릭터 상태 메시지 */}
          <Text
            style={[styles.characterStatusText, { color: theme.textSecondary }]}
          >
            {activityDataStatus === ACTIVITY_DATA_STATUS.COLLECTING
              ? "활동 데이터를 모으고 있어요"
              : ACTIVITY_STATE_LABELS[activityState]
                ? `활동 상태: ${ACTIVITY_STATE_LABELS[activityState]}`
                : characterName
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  characterContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  characterStatusText: {
    fontSize: 13,
    fontWeight: "500",
    fontStyle: "italic",
    lineHeight: 18,
    textAlign: "center",
  },
  characterVisual: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  nameBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  nameBadgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
