import { QUIZ_EMOTION_IDS } from '../constants/emotions'

const MANIFEST_URL = '/quiz/manifest.json'

let manifestCache = null

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)]
}

/** Fetch and cache public/quiz/manifest.json. */
export async function loadQuizManifest() {
  if (manifestCache) {
    return manifestCache
  }

  const response = await fetch(MANIFEST_URL)
  if (!response.ok) {
    throw new Error(`Could not load quiz manifest (${response.status})`)
  }

  manifestCache = await response.json()
  return manifestCache
}

/** Pick a random image path for one emotion, e.g. "/quiz/happy.png". */
export function getRandomImageForEmotion(manifest, emotionId) {
  const filenames = manifest[emotionId]
  if (!filenames?.length) {
    throw new Error(`No quiz images for emotion: ${emotionId}`)
  }

  const filename = pickRandom(filenames)
  return `/quiz/${filename}`
}

/** Pick a random emotion and one of its reference images for a new question. */
export function pickRandomQuestion(manifest) {
  const availableEmotions = QUIZ_EMOTION_IDS.filter((id) => manifest[id]?.length)

  if (availableEmotions.length === 0) {
    throw new Error('No quiz images available for any emotion')
  }

  const emotion = pickRandom(availableEmotions)
  const imageSrc = getRandomImageForEmotion(manifest, emotion)

  return { emotion, imageSrc }
}
