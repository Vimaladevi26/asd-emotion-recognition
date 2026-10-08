import { useEffect, useRef, useState } from 'react'

import SessionSummary from '../components/SessionSummary'
import { QUIZ_EMOTIONS, getEmotionLabel } from '../constants/emotions'
import { loadQuizManifest, pickQuestionForEmotion, pickRandomQuestion } from '../data/quizImages'
import {
  endSession,
  ensureChildAndSession,
  getNextExercise,
  getStoredChildId,
  postAttempt,
} from '../api/tracking'
import './QuizSession.css'

const FEEDBACK_DELAY_MS = 1750
const QUESTIONS_PER_SESSION = 5

export default function QuizSession() {
  const advanceTimeoutRef = useRef(null)
  const sessionIdRef = useRef(null)
  const answeredRef = useRef(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [manifest, setManifest] = useState(null)
  const [question, setQuestion] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [answered, setAnswered] = useState(0)
  const [summary, setSummary] = useState(null)
  const [ending, setEnding] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function initQuiz() {
      try {
        const loadedManifest = await loadQuizManifest()
        if (cancelled) {
          return
        }

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

  async function finishSession() {
    if (!sessionIdRef.current) {
      setSummary({
        correct: 0,
        total: answered,
        accuracy: null,
        by_emotion: [],
        hardest_emotion: null,
      })
      return
    }
    setEnding(true)
    try {
      const payload = await endSession(sessionIdRef.current)
      setSummary(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not end session.')
    } finally {
      setEnding(false)
    }
  }

  async function showNextQuestion() {
    if (!manifest) {
      return
    }

    advanceTimeoutRef.current = null

    if (answeredRef.current >= QUESTIONS_PER_SESSION) {
      await finishSession()
      return
    }

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
    if (feedback || !question || summary) {
      return
    }

    const isCorrect = emotionId === question.emotion
    const correctLabel = getEmotionLabel(question.emotion)

    setFeedback({
      isCorrect,
      message: isCorrect ? 'Great job!' : `Good try! That was ${correctLabel}.`,
    })
    answeredRef.current += 1
    setAnswered(answeredRef.current)

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

    advanceTimeoutRef.current = setTimeout(() => {
      showNextQuestion()
    }, FEEDBACK_DELAY_MS)
  }

  async function restartQuiz() {
    setSummary(null)
    answeredRef.current = 0
    setAnswered(0)
    setFeedback(null)
    setLoading(true)
    try {
      const tracking = await ensureChildAndSession('quiz')
      sessionIdRef.current = tracking.sessionId
      let nextQuestion = pickRandomQuestion(manifest)
      try {
        const next = await getNextExercise(tracking.childId)
        nextQuestion = pickQuestionForEmotion(manifest, next.emotion)
      } catch {
        // ignore
      }
      setQuestion(nextQuestion)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not restart quiz.')
    } finally {
      setLoading(false)
    }
  }

  const choicesDisabled = Boolean(feedback) || Boolean(summary)

  return (
    <main className="quiz-session">
      <div className="quiz-session__top">
        <h1 className="quiz-session__title">Emotion Quiz</h1>
        {!summary && (
          <p className="quiz-session__progress">
            Question {Math.min(answered + 1, QUESTIONS_PER_SESSION)} of {QUESTIONS_PER_SESSION}
          </p>
        )}
      </div>

      {loading && <p className="quiz-session__status">Loading quiz…</p>}

      {!loading && error && (
        <p className="quiz-session__error" role="alert">
          {error}
        </p>
      )}

      {summary && (
        <SessionSummary
          summary={summary}
          modeLabel="Quiz"
          onContinue={restartQuiz}
        />
      )}

      {!loading && !error && !summary && question && (
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

          <button
            type="button"
            className="quiz-session__end"
            onClick={finishSession}
            disabled={ending || answered === 0}
          >
            End session
          </button>
        </>
      )}
    </main>
  )
}
