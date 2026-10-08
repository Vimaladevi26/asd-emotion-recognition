import { useCallback, useEffect, useRef, useState } from 'react'
import Webcam from 'react-webcam'

import SessionSummary from '../components/SessionSummary'
import { postPredict } from '../api/predict'
import {
  endSession,
  ensureChildAndSession,
  getNextExercise,
  getStoredChildId,
  postAttempt,
} from '../api/tracking'
import { QUIZ_EMOTIONS, getEmotionLabel } from '../constants/emotions'
import './PracticeSession.css'

function toPercent(value) {
  if (value == null || Number.isNaN(value)) return 0
  return Math.round(value * 100)
}

function scoreRows(allScores) {
  if (!allScores || typeof allScores !== 'object') return []
  return QUIZ_EMOTIONS.map((emotion) => ({
    id: emotion.id,
    label: emotion.label,
    score: toPercent(allScores[emotion.id]),
  })).sort((a, b) => b.score - a.score)
}

const IDLE_TIMEOUT_MS = 45_000
const COUNTDOWN_TICK_MS = 1000
const MIN_CONFIDENCE = 0.4
const ROUNDS_PER_SESSION = 5

const webcamVideoConstraints = {
  width: 640,
  height: 480,
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
  const finishSessionRef = useRef(async () => {})
  const scoredRef = useRef(0)
  const startedRef = useRef(false)

  const [targetEmotion, setTargetEmotion] = useState(null)
  const [phase, setPhase] = useState('ready')
  const [countdown, setCountdown] = useState(null)
  const [result, setResult] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [error, setError] = useState(null)
  const [scored, setScored] = useState(0)
  const [summary, setSummary] = useState(null)
  const [ending, setEnding] = useState(false)
  const [camReady, setCamReady] = useState(false)

  const clearIdleTimeout = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current)
      idleTimeoutRef.current = null
    }
  }, [])

  const clearAdvanceTimeout = useCallback(() => {
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current)
      advanceTimeoutRef.current = null
    }
  }, [])

  const armIdleSkip = useCallback(() => {
    clearIdleTimeout()
    idleTimeoutRef.current = setTimeout(() => {
      loadNextPromptRef.current()
    }, IDLE_TIMEOUT_MS)
  }, [clearIdleTimeout])

  const finishSession = useCallback(async () => {
    clearIdleTimeout()
    clearAdvanceTimeout()
    if (!sessionIdRef.current) {
      setSummary({
        correct: 0,
        total: scoredRef.current,
        accuracy: null,
        by_emotion: [],
        hardest_emotion: null,
      })
      setPhase('summary')
      return
    }
    setEnding(true)
    try {
      const payload = await endSession(sessionIdRef.current)
      setSummary(payload)
      setPhase('summary')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not end session.')
    } finally {
      setEnding(false)
    }
  }, [clearAdvanceTimeout, clearIdleTimeout])

  finishSessionRef.current = finishSession

  const captureOnce = useCallback(async () => {
    if (inFlightRef.current || !targetRef.current || summary) {
      return
    }

    const screenshot = webcamRef.current?.getScreenshot()
    if (!screenshot) {
      setError('Camera not ready yet. Allow camera access, then try again.')
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

      if (!data.face_found) {
        setError('No face found. Face the camera and try again.')
        setPhase('retry')
        armIdleSkip()
        return
      }

      if (data.confidence == null || data.confidence < MIN_CONFIDENCE) {
        setError('Could not read your expression clearly. Try again.')
        setPhase('retry')
        armIdleSkip()
        return
      }

      const isCorrect = data.emotion === targetRef.current
      const targetLabel = getEmotionLabel(targetRef.current)
      const predictedLabel = getEmotionLabel(data.emotion)

      setFeedback({
        isCorrect,
        message: isCorrect
          ? `Great job! That looked like ${targetLabel}.`
          : `Good try! We saw ${predictedLabel}. Show ${targetLabel} next time.`,
        confidence: data.confidence,
        predicted: data.emotion,
      })
      setPhase('feedback')
      scoredRef.current += 1
      setScored(scoredRef.current)
      clearIdleTimeout()

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
    } catch (err) {
      if (!cancelledRef.current) {
        setError(err instanceof Error ? err.message : 'Could not reach the server.')
        setPhase('retry')
        armIdleSkip()
      }
    } finally {
      inFlightRef.current = false
    }
  }, [armIdleSkip, clearIdleTimeout, summary])

  const loadNextPrompt = useCallback(async () => {
    clearIdleTimeout()
    clearAdvanceTimeout()

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
  }, [armIdleSkip, clearAdvanceTimeout, clearIdleTimeout])

  loadNextPromptRef.current = loadNextPrompt

  useEffect(() => {
    cancelledRef.current = false

    if (startedRef.current) {
      return undefined
    }
    startedRef.current = true

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
        await loadNextPromptRef.current()
      }
    }

    startPractice()

    return () => {
      cancelledRef.current = true
      startedRef.current = false
      clearIdleTimeout()
      clearAdvanceTimeout()
    }
  }, [clearAdvanceTimeout, clearIdleTimeout])

  async function handleReadyClick() {
    if ((phase !== 'ready' && phase !== 'retry') || summary) {
      return
    }

    clearIdleTimeout()
    setError(null)

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

  async function restartPractice() {
    setSummary(null)
    scoredRef.current = 0
    setScored(0)
    setResult(null)
    setFeedback(null)
    setError(null)
    setPhase('ready')
    try {
      const tracking = await ensureChildAndSession('practice')
      sessionIdRef.current = tracking.sessionId
    } catch {
      sessionIdRef.current = null
    }
    await loadNextPrompt()
  }

  function continueAfterFeedback() {
    if (scoredRef.current >= ROUNDS_PER_SESSION) {
      finishSession()
    } else {
      loadNextPrompt()
    }
  }

  const promptLabel = targetEmotion ? getEmotionLabel(targetEmotion) : null
  const showReadyButton = !summary && (phase === 'ready' || phase === 'retry')
  const heatmapSrc =
    phase === 'feedback' && result?.heatmap_base64
      ? result.heatmap_base64.startsWith('data:')
        ? result.heatmap_base64
        : `data:image/png;base64,${result.heatmap_base64}`
      : null
  const scores = phase === 'feedback' ? scoreRows(result?.all_scores) : []

  return (
    <main className="practice-session">
      <div className="practice-session__top">
        <h1 className="practice-session__title">Therapy Session</h1>
        {!summary && (
          <p className="practice-session__progress">
            Round {Math.min(scored + 1, ROUNDS_PER_SESSION)} of {ROUNDS_PER_SESSION}
          </p>
        )}
      </div>

      {summary && (
        <SessionSummary
          summary={summary}
          modeLabel="Therapy"
          onContinue={restartPractice}
        />
      )}

      {!summary && (
        <div className="practice-session__board">
          {promptLabel && (
            <p className="practice-session__prompt" aria-live="polite">
              Show me <strong>{promptLabel}</strong>
            </p>
          )}

          <div className="practice-session__webcam-wrap">
            <Webcam
              ref={webcamRef}
              audio={false}
              mirrored
              screenshotFormat="image/jpeg"
              videoConstraints={webcamVideoConstraints}
              onUserMedia={() => setCamReady(true)}
              onUserMediaError={() => {
                setCamReady(false)
                setError('Camera access blocked. Allow the camera and refresh.')
              }}
            />
            {phase === 'countdown' && countdown !== null && (
              <p className="practice-session__countdown" aria-live="assertive">
                {countdown}
              </p>
            )}
            {!camReady && !error && (
              <p className="practice-session__cam-wait">Starting camera…</p>
            )}
          </div>

          <div className="practice-session__actions">
            {showReadyButton && (
              <button
                type="button"
                className="practice-session__ready"
                onClick={handleReadyClick}
                disabled={!camReady}
              >
                I&apos;m Ready
              </button>
            )}

            <button
              type="button"
              className="practice-session__end"
              onClick={finishSession}
              disabled={ending || scored === 0 || phase === 'countdown' || phase === 'capturing'}
            >
              End session
            </button>
          </div>

          <div className="practice-session__result" aria-live="polite">
            {error && <p className="practice-session__error">{error}</p>}

            {phase === 'capturing' && (
              <p className="practice-session__waiting">Looking at your face…</p>
            )}

            {phase === 'retry' && !error && (
              <p className="practice-session__retry">Let&apos;s try again</p>
            )}

            {phase === 'feedback' && feedback && (
              <div className="practice-session__feedback-block">
                <p
                  className={`practice-session__feedback ${
                    feedback.isCorrect
                      ? 'practice-session__feedback--correct'
                      : 'practice-session__feedback--encourage'
                  }`}
                >
                  {feedback.message}
                </p>

                <p className="practice-session__confidence">
                  Model score: {toPercent(feedback.confidence)}% for{' '}
                  <strong>{getEmotionLabel(feedback.predicted)}</strong>
                </p>

                <div className="practice-session__explain">
                  {heatmapSrc ? (
                    <figure className="practice-session__why">
                      <img
                        className="practice-session__why-image"
                        src={heatmapSrc}
                        alt="Heatmap of face regions used for this prediction"
                      />
                      <figcaption>Heatmap</figcaption>
                    </figure>
                  ) : (
                    <p className="practice-session__retry">Heatmap unavailable for this frame.</p>
                  )}

                  {scores.length > 0 && (
                    <ul className="practice-session__scores" aria-label="Emotion scores">
                      {scores.map((row) => (
                        <li key={row.id} className={row.id === feedback.predicted ? 'is-top' : undefined}>
                          <span>{row.label}</span>
                          <span className="practice-session__bar">
                            <i style={{ width: `${row.score}%` }} />
                          </span>
                          <strong>{row.score}%</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button
                  type="button"
                  className="practice-session__continue"
                  onClick={continueAfterFeedback}
                >
                  {scored >= ROUNDS_PER_SESSION ? 'See summary' : 'Next round'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
