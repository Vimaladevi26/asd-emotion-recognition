import { useCallback, useEffect, useRef, useState } from 'react'
import Webcam from 'react-webcam'

import { postPredict } from '../api/predict'
import {
  ensureChildAndSession,
  getNextExercise,
  getStoredChildId,
  postAttempt,
} from '../api/tracking'
import { getEmotionLabel } from '../constants/emotions'
import './PracticeSession.css'

const FEEDBACK_DELAY_MS = 1750
const IDLE_TIMEOUT_MS = 45_000
const COUNTDOWN_TICK_MS = 1000
const MIN_CONFIDENCE = 0.4

const webcamVideoConstraints = {
  width: 480,
  height: 360,
  facingMode: 'user',
}

const FALLBACK_EMOTIONS = ['angry', 'fear', 'happy', 'neutral', 'sad', 'surprise']

function pickFallbackEmotion() {
  return FALLBACK_EMOTIONS[Math.floor(Math.random() * FALLBACK_EMOTIONS.length)]
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export default function PracticeSession() {
  const webcamRef = useRef(null)
  const inFlightRef = useRef(false)
  const sessionIdRef = useRef(null)
  const targetRef = useRef(null)
  const cancelledRef = useRef(false)
  const advanceTimeoutRef = useRef(null)
  const idleTimeoutRef = useRef(null)
  const loadNextPromptRef = useRef(async () => {})

  const [targetEmotion, setTargetEmotion] = useState(null)
  const [phase, setPhase] = useState('ready')
  const [countdown, setCountdown] = useState(null)
  const [result, setResult] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [error, setError] = useState(null)

  const clearIdleTimeout = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current)
      idleTimeoutRef.current = null
    }
  }, [])

  const armIdleSkip = useCallback(() => {
    clearIdleTimeout()
    idleTimeoutRef.current = setTimeout(() => {
      loadNextPromptRef.current()
    }, IDLE_TIMEOUT_MS)
  }, [clearIdleTimeout])

  const captureOnce = useCallback(async () => {
    if (inFlightRef.current || !targetRef.current) {
      return
    }

    const screenshot = webcamRef.current?.getScreenshot()
    if (!screenshot) {
      setPhase('retry')
      armIdleSkip()
      return
    }

    inFlightRef.current = true
    setPhase('capturing')
    setError(null)

    try {
      const data = await postPredict(screenshot)
      if (cancelledRef.current) {
        return
      }

      setResult(data)

      if (!data.face_found || data.confidence < MIN_CONFIDENCE) {
        setPhase('retry')
        armIdleSkip()
        return
      }

      const isCorrect = data.emotion === targetRef.current
      const label = getEmotionLabel(targetRef.current)

      setFeedback({
        isCorrect,
        message: isCorrect ? 'Great job!' : `Good try! Show me ${label} next time.`,
      })
      setPhase('feedback')

      if (sessionIdRef.current) {
        postAttempt(sessionIdRef.current, {
          target_emotion: targetRef.current,
          predicted_emotion: data.emotion,
          child_choice: null,
          confidence: data.confidence,
          correct: isCorrect,
          source: 'show_me',
        }).catch(() => {})
      }

      advanceTimeoutRef.current = setTimeout(() => {
        loadNextPromptRef.current()
      }, FEEDBACK_DELAY_MS)
    } catch (err) {
      if (!cancelledRef.current) {
        setError(err instanceof Error ? err.message : 'Could not reach the server.')
        setPhase('retry')
        armIdleSkip()
      }
    } finally {
      inFlightRef.current = false
    }
  }, [armIdleSkip])

  const loadNextPrompt = useCallback(async () => {
    clearIdleTimeout()
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current)
      advanceTimeoutRef.current = null
    }

    setResult(null)
    setFeedback(null)
    setError(null)
    setCountdown(null)
    setPhase('ready')

    let emotion = pickFallbackEmotion()
    const childId = getStoredChildId()
    if (childId) {
      try {
        const next = await getNextExercise(Number(childId))
        emotion = next.emotion
      } catch {
        // Keep a random prompt if personalization is down.
      }
    }

    if (cancelledRef.current) {
      return
    }

    targetRef.current = emotion
    setTargetEmotion(emotion)
    armIdleSkip()
  }, [armIdleSkip, clearIdleTimeout])

  loadNextPromptRef.current = loadNextPrompt

  useEffect(() => {
    cancelledRef.current = false

    async function startPractice() {
      try {
        const tracking = await ensureChildAndSession('practice')
        if (!cancelledRef.current) {
          sessionIdRef.current = tracking.sessionId
        }
      } catch {
        // Practice still works without persistence.
      }
      if (!cancelledRef.current) {
        await loadNextPrompt()
      }
    }

    startPractice()

    return () => {
      cancelledRef.current = true
      clearIdleTimeout()
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current)
      }
    }
  }, [clearIdleTimeout, loadNextPrompt])

  async function handleReadyClick() {
    if (phase !== 'ready' && phase !== 'retry') {
      return
    }

    clearIdleTimeout()
    setError(null)
    setResult(null)

    for (const tick of [3, 2, 1]) {
      if (cancelledRef.current) {
        return
      }
      setPhase('countdown')
      setCountdown(tick)
      await sleep(COUNTDOWN_TICK_MS)
    }

    if (cancelledRef.current) {
      return
    }

    setCountdown(null)
    await captureOnce()
  }

  const promptLabel = targetEmotion ? getEmotionLabel(targetEmotion) : null
  const showReadyButton = phase === 'ready' || phase === 'retry'
  const heatmapSrc =
    phase === 'feedback' && result?.heatmap_base64
      ? result.heatmap_base64.startsWith('data:')
        ? result.heatmap_base64
        : `data:image/png;base64,${result.heatmap_base64}`
      : null

  return (
    <main className="practice-session">
      <h1 className="practice-session__title">Emotion Practice</h1>

      {promptLabel && (
        <p className="practice-session__prompt" aria-live="polite">
          Show me {promptLabel}
        </p>
      )}

      <div className="practice-session__webcam-wrap">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={webcamVideoConstraints}
        />
        {phase === 'countdown' && countdown !== null && (
          <p className="practice-session__countdown" aria-live="assertive">
            {countdown}
          </p>
        )}
      </div>

      {showReadyButton && (
        <button
          type="button"
          className="practice-session__ready"
          onClick={handleReadyClick}
        >
          I&apos;m Ready
        </button>
      )}

      <div className="practice-session__result" aria-live="polite">
        {error && <p className="practice-session__error">{error}</p>}

        {phase === 'capturing' && (
          <p className="practice-session__waiting">Looking at your face…</p>
        )}

        {phase === 'retry' && !error && (
          <p className="practice-session__retry">Let&apos;s try again</p>
        )}

        {phase === 'feedback' && feedback && (
          <>
            <p
              className={`practice-session__feedback ${
                feedback.isCorrect
                  ? 'practice-session__feedback--correct'
                  : 'practice-session__feedback--encourage'
              }`}
            >
              {feedback.message}
            </p>
            {heatmapSrc && (
              <figure className="practice-session__why">
                <img
                  className="practice-session__why-image"
                  src={heatmapSrc}
                  alt="Face regions that most influenced this prediction"
                />
                <figcaption className="practice-session__why-caption">Why?</figcaption>
              </figure>
            )}
          </>
        )}
      </div>
    </main>
  )
}
