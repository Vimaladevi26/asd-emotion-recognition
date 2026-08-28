/** Quiz emotions — single source of truth (6 of 7 model classes; no disgust in v1). */
export const QUIZ_EMOTIONS = [
  { id: 'angry', label: 'Angry' },
  { id: 'fear', label: 'Fear' },
  { id: 'happy', label: 'Happy' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'sad', label: 'Sad' },
  { id: 'surprise', label: 'Surprise' },
]

export const QUIZ_EMOTION_IDS = QUIZ_EMOTIONS.map((emotion) => emotion.id)

export function getEmotionLabel(emotionId) {
  return QUIZ_EMOTIONS.find((emotion) => emotion.id === emotionId)?.label ?? emotionId
}
