import { Link } from 'react-router-dom'
import heroImage from '../assets/landing-hero.jpg'
import './Landing.css'

const EMOTIONS = [
  { label: 'Happy', value: 0.82, color: '#22c55e' },
  { label: 'Neutral', value: 0.12, color: '#94a3b8' },
  { label: 'Sad', value: 0.04, color: '#3b82f6' },
  { label: 'Angry', value: 0.02, color: '#ef4444' },
]

function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav landing-nav--simple">
        <a href="#top" className="landing-brand">
          <span className="landing-brand__mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" width="36" height="36">
              <defs>
                <linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1d6fd8" />
                  <stop offset="100%" stopColor="#0ea5a4" />
                </linearGradient>
              </defs>
              <path
                fill="url(#brandGrad)"
                d="M20 36s-12.5-7.8-12.5-17.2C7.5 12.2 12 8 16.8 8c2.4 0 4.4 1.1 5.2 2.8C22.8 9.1 24.8 8 27.2 8 32 8 36.5 12.2 36.5 18.8 36.5 28.2 20 36 20 36z"
              />
              <circle cx="20" cy="18" r="6.2" fill="#eff8ff" opacity="0.95" />
              <path
                d="M17.2 18.2c0-1.6 1-2.6 2.8-2.6s2.8 1 2.8 2.6c0 1.8-1.2 2.7-2.8 3.8-1.6-1.1-2.8-2-2.8-3.8z"
                fill="#1d6fd8"
              />
            </svg>
          </span>
          <span className="landing-brand__text">
            <strong>ASD Emotion</strong>
            <small>Understand · Support · Grow</small>
          </span>
        </a>

        <Link to="/quiz" className="btn btn--primary landing-nav__cta">
          Get Started
        </Link>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero__copy">
            <p className="hero__eyebrow">AI-powered support for ASD therapy</p>
            <h1 className="hero__title">
              Understand Every Expression.
              <span> Support Every Journey.</span>
            </h1>
            <p className="hero__lead">
              An AI-powered emotion recognition and progress-tracking platform
              designed to support therapists and caregivers in ASD therapy.
            </p>
            <div className="hero__actions">
              <Link to="/quiz" className="btn btn--primary btn--lg">
                Explore the Platform
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          <div className="hero__visual" aria-hidden="true">
            <div className="hero__frame">
              <img src={heroImage} alt="" className="hero__photo" />
              <div className="hero__face-box" />
              <aside className="hero__analysis">
                <p className="hero__analysis-title">AI Emotion Analysis</p>
                <ul>
                  {EMOTIONS.map((emotion) => (
                    <li key={emotion.label}>
                      <span
                        className="hero__dot"
                        style={{ background: emotion.color }}
                      />
                      <span className="hero__emotion-label">{emotion.label}</span>
                      <span className="hero__bar">
                        <i
                          style={{
                            width: `${emotion.value * 100}%`,
                            background: emotion.color,
                          }}
                        />
                      </span>
                      <span className="hero__score">{emotion.value.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Landing
