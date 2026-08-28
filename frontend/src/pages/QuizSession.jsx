import { useEffect, useState } from 'react'

import { QUIZ_EMOTIONS } from '../constants/emotions'
import { loadQuizManifest, pickRandomQuestion } from '../data/quizImages'
import './QuizSession.css'

export default function QuizSession() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [question, setQuestion] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function initQuestion() {
      try {
        const manifest = await loadQuizManifest()
        const nextQuestion = pickRandomQuestion(manifest)

        if (!cancelled) {
          setQuestion(nextQuestion)
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

    initQuestion()

    return () => {
      cancelled = true
    }
  }, [])

  function handleAnswerClick(emotionId) {
    console.log('Quiz answer selected:', {
      selected: emotionId,
      correct: question?.emotion,
    })
  }

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

          <p className="quiz-session__prompt">What emotion is this?</p>

          <div className="quiz-session__choices" role="group" aria-label="Emotion choices">
            {QUIZ_EMOTIONS.map((emotion) => (
              <button
                key={emotion.id}
                type="button"
                className="quiz-session__choice"
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
