import { useCallback, useEffect, useRef, useState } from 'react'
import Webcam from 'react-webcam'

import { postPredict } from '../api/predict'
import './PracticeSession.css'

const CAPTURE_INTERVAL_MS = 1000

const webcamVideoConstraints = {
  width: 480,
  height: 360,
  facingMode: 'user',
}

export default function PracticeSession() {
  const webcamRef = useRef(null)
  const inFlightRef = useRef(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const captureAndPredict = useCallback(async () => {
    if (inFlightRef.current) {
      return
    }

    const screenshot = webcamRef.current?.getScreenshot()
    if (!screenshot) {
      return
    }

    inFlightRef.current = true
    setError(null)

    try {
      const data = await postPredict(screenshot)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the server.')
    } finally {
      inFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    const intervalId = setInterval(captureAndPredict, CAPTURE_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [captureAndPredict])

  const showNoFace = result?.face_found === false
  const showPrediction = result?.face_found === true

  return (
    <main className="practice-session">
      <h1 className="practice-session__title">Emotion Practice</h1>

      <div className="practice-session__webcam-wrap">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={webcamVideoConstraints}
        />
      </div>

      <div className="practice-session__result" aria-live="polite">
        {error && <p className="practice-session__error">{error}</p>}

        {!error && !result && (
          <p className="practice-session__waiting">Looking at your face…</p>
        )}

        {!error && showNoFace && (
          <p className="practice-session__no-face">No face detected</p>
        )}

        {!error && showPrediction && (
          <>
            <p className="practice-session__emotion">{result.emotion}</p>
            <p className="practice-session__confidence">
              {Math.round(result.confidence * 100)}% confident
            </p>
          </>
        )}
      </div>
    </main>
  )
}
