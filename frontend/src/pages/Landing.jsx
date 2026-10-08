import { Link } from 'react-router-dom'
import { useSiteJump } from '../components/SiteLayout.jsx'
import heroImage from '../assets/landing-hero.jpg'

const EMOTIONS = [
  { label: 'Happy', value: 0.82, color: '#22c55e' },
  { label: 'Neutral', value: 0.12, color: '#94a3b8' },
  { label: 'Sad', value: 0.04, color: '#3b82f6' },
  { label: 'Angry', value: 0.02, color: '#ef4444' },
]

const OFFERS = [
  {
    title: 'Emotion quiz',
    text: 'Match a face photo to the right emotion. Answers are saved.',
    sectionId: 'features',
  },
  {
    title: 'Webcam practice',
    text: 'Show an expression on camera. The app checks if it matches.',
    sectionId: 'how-it-works',
  },
  {
    title: 'Therapist dashboard',
    text: 'See accuracy by emotion and by day for each child.',
    sectionId: 'features',
  },
]

export default function HomeChapter() {
  const jump = useSiteJump()

  return (
    <section id="home" className="chapter chapter--home">
      <div className="hero">
        <div className="hero__copy">
          <p className="hero__eyebrow motion-in" style={{ '--d': '0ms' }}>
            ASD therapy practice
          </p>
          <h1 className="hero__title motion-in" style={{ '--d': '90ms' }}>
            Practice expressions.
            <span> Track progress.</span>
          </h1>
          <p className="hero__lead motion-in" style={{ '--d': '170ms' }}>
            Children practice facial emotions. Therapists see what improves.
          </p>
          <div className="hero__actions motion-in" style={{ '--d': '250ms' }}>
            <Link to="/login" className="btn btn--primary btn--lg">
              Sign in to start
              <span aria-hidden="true">→</span>
            </Link>
            <a
              href="/how-it-works"
              className="btn btn--ghost btn--lg"
              onClick={(event) => {
                event.preventDefault()
                jump('how-it-works')
              }}
            >
              How it works
            </a>
          </div>
        </div>

        <div className="hero__visual motion-in" style={{ '--d': '180ms' }} aria-hidden="true">
          <div className="hero__frame">
            <img src={heroImage} alt="" className="hero__photo" />
            <div className="hero__face-box">
              <span className="hero__scan" />
            </div>
            <aside className="hero__analysis">
              <p className="hero__analysis-title">Live emotion scores</p>
              <ul>
                {EMOTIONS.map((emotion, index) => (
                  <li key={emotion.label} style={{ '--i': index }}>
                    <span className="hero__dot" style={{ background: emotion.color }} />
                    <span className="hero__emotion-label">{emotion.label}</span>
                    <span className="hero__bar">
                      <i
                        style={{
                          '--fill': `${emotion.value * 100}%`,
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
      </div>

      <div className="band reveal">
        <div className="section__intro">
          <h2>Three tools in one flow</h2>
          <p>Quiz, camera practice, then progress review.</p>
        </div>
        <div className="card-grid">
          {OFFERS.map((item, index) => (
            <article
              key={item.title}
              className="info-card reveal-child"
              style={{ '--i': index }}
            >
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <a
                href={item.sectionId === 'features' ? '/features' : '/how-it-works'}
                className="text-link"
                onClick={(event) => {
                  event.preventDefault()
                  jump(item.sectionId)
                }}
              >
                Learn more
              </a>
            </article>
          ))}
        </div>
      </div>

      <div className="band band--split reveal">
        <div>
          <h2>One session, two views</h2>
          <p>Children practice. Therapists review the same results.</p>
        </div>
        <ul className="check-list">
          <li>Emotions: angry, fear, happy, neutral, sad, surprise</li>
          <li>Harder emotions appear more often</li>
          <li>Every attempt is saved to the session</li>
        </ul>
      </div>
    </section>
  )
}
