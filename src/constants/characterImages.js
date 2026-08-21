import { ACTIVITY_DATA_STATUS, ACTIVITY_STATE } from './activity';
import { CHARACTER_TYPES } from './profile';

export const NUTI_ACTIVITY_STATE_IMAGES = Object.freeze({
  [ACTIVITY_STATE.DROWSY]: require('../../assets/images/characters/nuti/drowsy.png'),
  [ACTIVITY_STATE.SPRY]: require('../../assets/images/characters/nuti/spry.png'),
  [ACTIVITY_STATE.ENERGETIC]: require('../../assets/images/characters/nuti/energetic.png'),
  [ACTIVITY_STATE.VIGOROUS]: require('../../assets/images/characters/nuti/vigorous.png'),
});

export function getCharacterImageSource({
  characterType,
  activityDataStatus,
  activityState,
}) {
  if (
    characterType !== CHARACTER_TYPES.NUTI ||
    activityDataStatus !== ACTIVITY_DATA_STATUS.READY
  ) {
    return null;
  }

  return NUTI_ACTIVITY_STATE_IMAGES[activityState] ?? null;
}
