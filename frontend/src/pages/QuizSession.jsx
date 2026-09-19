import { useEffect, useRef, useState } from 'react'

import { QUIZ_EMOTIONS, getEmotionLabel } from '../constants/emotions'
import { loadQuizManifest, pickQuestionForEmotion, pickRandomQuestion } from '../data/quizImages'
import { ensureChildAndSession, getNextExercise, getStoredChildId, postAttempt } from '../api/tracking'
import './QuizSession.css'

const FEEDBACK_DELAY_MS = 1750

export default function QuizSession() {
  const advanceTimeoutRef = useRef(null)
  const sessionIdRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [manifest, setManifest] = useState(null)
  const [question, setQuestion] = useState(null)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function initQuiz() {
      try {
        const loadedManifest = await loadQuizManifest()
        let firstQuestion = pickRandomQuestion(loadedManifest)

        try {
          const tracking = await ensureChildAndSession('quiz')
          if (!cancelled) {
            sessionIdRef.current = tracking.sessionId
          }
          try {
            const next = await getNextExercise(tracking.childId)
            firstQuestion = pickQuestionForEmotion(loadedManifest, next.emotion)
          } catch {
            // Keep uniform random if personalization is unavailable.
          }
        } catch {
          // Quiz still works if the tracking API is down.
        }

        if (!cancelled) {
          setManifest(loadedManifest)
          setQuestion(firstQuestion)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load quiz images.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    initQuiz()

    return () => {
      cancelled = true
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current)
      }
    }
  }, [])

  async function showNextQuestion() {
    if (!manifest) {
      return
    }

    advanceTimeoutRef.current = null
    let nextQuestion = pickRandomQuestion(manifest)
    const childId = getStoredChildId()
    if (childId) {
      try {
        const next = await getNextExercise(Number(childId))
        nextQuestion = pickQuestionForEmotion(manifest, next.emotion)
      } catch {
        // Fall back to uniform random.
      }
    }
    setQuestion(nextQuestion)
    setFeedback(null)
  }

  function handleAnswerClick(emotionId) {
    if (feedback || !question) {
      return
    }

    const isCorrect = emotionId === question.emotion
    const correctLabel = getEmotionLabel(question.emotion)

    setFeedback({
      isCorrect,
      message: isCorrect ? 'Great job! 🎉' : `Good try! That was ${correctLabel}.`,
    })

    if (sessionIdRef.current) {
      postAttempt(sessionIdRef.current, {
        target_emotion: question.emotion,
        child_choice: emotionId,
        predicted_emotion: null,
        confidence: null,
        correct: isCorrect,
        source: 'quiz',
      }).catch(() => {
        // Keep the quiz playable if logging fails.
      })
    }

    advanceTimeoutRef.current = setTimeout(showNextQuestion, FEEDBACK_DELAY_MS)
  }

  const choicesDisabled = Boolean(feedback)

  return (
    <main className="quiz-session">
      <h1 className="quiz-session__title">What&apos;s This?</h1>

      {loading && <p className="quiz-session__status">Loading quiz…</p>}

      {!loading && error && (
        <p className="quiz-session__error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && question && (
        <>
          <figure className="quiz-session__figure">
            <img
              className="quiz-session__image"
              src={question.imageSrc}
              alt="Emotion face to identify"
            />
          </figure>

          {feedback ? (
            <p
              className={`quiz-session__feedback ${
                feedback.isCorrect
                  ? 'quiz-session__feedback--correct'
                  : 'quiz-session__feedback--encourage'
              }`}
              role="status"
              aria-live="polite"
            >
              {feedback.message}
            </p>
          ) : (
            <p className="quiz-session__prompt">What emotion is this?</p>
          )}

          <div
            className={`quiz-session__choices${choicesDisabled ? ' quiz-session__choices--disabled' : ''}`}
            role="group"
            aria-label="Emotion choices"
          >
            {QUIZ_EMOTIONS.map((emotion) => (
              <button
                key={emotion.id}
                type="button"
                className="quiz-session__choice"
                disabled={choicesDisabled}
                onClick={() => handleAnswerClick(emotion.id)}
              >
                {emotion.label}
              </button>
            ))}
          </div>
        </>
      )}
    </main>
  )
}
