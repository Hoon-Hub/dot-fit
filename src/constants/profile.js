export const MAX_CHARACTER_NAME_LENGTH = 10;

export const CHARACTER_TYPES = {
  NUTI: 'nuti',
  LUTI: 'luti',
};

export const CHARACTER_TYPE_OPTIONS = [
  {
    id: CHARACTER_TYPES.NUTI,
    label: '누티 타입',
    description: '남성형 외모의 도트 캐릭터',
  },
  {
    id: CHARACTER_TYPES.LUTI,
    label: '루티 타입',
    description: '여성형 외모의 도트 캐릭터',
  },
];

export function isCharacterType(value) {
  return Object.values(CHARACTER_TYPES).includes(value);
}
