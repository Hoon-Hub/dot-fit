import { StyleSheet, Text, View } from 'react-native';
import { CHARACTER_TYPES, isCharacterType } from '../constants/profile';

const BASE_WIDTH = 108;
const BASE_HEIGHT = 154;

const CHARACTER_SIZES = {
  small: 0.43,
  medium: 0.75,
  large: 1,
};

const CHARACTER_APPEARANCES = {
  [CHARACTER_TYPES.NUTI]: {
    hair: '#3A302B',
    skin: '#EAB486',
    clothes: '#4F86C6',
    hasSideHair: false,
  },
  [CHARACTER_TYPES.LUTI]: {
    hair: '#5B3A29',
    skin: '#F1BE8F',
    clothes: '#E8759A',
    hasSideHair: true,
  },
};

const PLACEHOLDER_APPEARANCE = {
  hair: '#8E8E93',
  skin: '#AEAEB2',
  clothes: '#8E8E93',
  hasSideHair: false,
};

const ACCESSIBILITY_LABELS = {
  [CHARACTER_TYPES.NUTI]: '누티 타입 도트 캐릭터',
  [CHARACTER_TYPES.LUTI]: '루티 타입 도트 캐릭터',
};

export default function PixelCharacter({
  type,
  size = 'medium',
  muted = false,
  decorative = false,
  accessibilityLabel,
}) {
  const validType = isCharacterType(type);
  const isPlaceholder = muted || !validType;
  const appearance = isPlaceholder
    ? PLACEHOLDER_APPEARANCE
    : CHARACTER_APPEARANCES[type];
  const scale = CHARACTER_SIZES[size] || CHARACTER_SIZES.medium;
  const frameWidth = Math.round(BASE_WIDTH * scale);
  const frameHeight = Math.round(BASE_HEIGHT * scale);

  return (
    <View
      style={{ width: frameWidth, height: frameHeight }}
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={
        decorative
          ? undefined
          : accessibilityLabel || ACCESSIBILITY_LABELS[type] || '선택되지 않은 도트 캐릭터'
      }
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
    >
      <View
        style={[
          styles.pixelCharacter,
          {
            left: (frameWidth - BASE_WIDTH) / 2,
            top: (frameHeight - BASE_HEIGHT) / 2,
            transform: [{ scale }],
          },
          isPlaceholder && styles.mutedCharacter,
        ]}
      >
        <View style={[styles.pixelHair, { backgroundColor: appearance.hair }]} />
        <View style={[styles.pixelHead, { backgroundColor: appearance.skin }]}>
          <View style={styles.pixelEyes}>
            <View style={styles.pixelEye} />
            <View style={styles.pixelEye} />
          </View>
        </View>
        {appearance.hasSideHair && (
          <>
            <View
              style={[
                styles.sideHair,
                styles.sideHairLeft,
                { backgroundColor: appearance.hair },
              ]}
            />
            <View
              style={[
                styles.sideHair,
                styles.sideHairRight,
                { backgroundColor: appearance.hair },
              ]}
            />
          </>
        )}
        <View style={[styles.pixelBody, { backgroundColor: appearance.clothes }]} />
        <View style={styles.pixelLegs}>
          <View style={[styles.pixelLeg, { backgroundColor: appearance.hair }]} />
          <View style={[styles.pixelLeg, { backgroundColor: appearance.hair }]} />
        </View>
        {isPlaceholder && <Text style={styles.questionMark}>?</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pixelCharacter: {
    position: 'absolute',
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
    alignItems: 'center',
  },
  mutedCharacter: { opacity: 0.52 },
  pixelHair: { width: 68, height: 20, borderRadius: 4 },
  pixelHead: { width: 60, height: 56, alignItems: 'center', justifyContent: 'center' },
  pixelEyes: { width: 34, flexDirection: 'row', justifyContent: 'space-between' },
  pixelEye: { width: 6, height: 6, backgroundColor: '#292929' },
  sideHair: { position: 'absolute', top: 18, width: 10, height: 54 },
  sideHairLeft: { left: 14 },
  sideHairRight: { right: 14 },
  pixelBody: { width: 78, height: 54, marginTop: 4, borderRadius: 3 },
  pixelLegs: { flexDirection: 'row', gap: 12 },
  pixelLeg: { width: 22, height: 20 },
  questionMark: {
    position: 'absolute',
    top: 36,
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
  },
});
