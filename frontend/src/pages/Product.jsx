import { useSiteJump } from '../components/SiteLayout.jsx'

const CAPABILITIES = [
  {
    title: 'Picture quiz',
    text: 'See a face. Pick the emotion. Right and wrong answers are logged.',
  },
  {
    title: 'Webcam practice',
    text: 'Make the shown expression. Camera checks the face and score.',
  },
  {
    title: 'Explainable scores',
    text: 'See all emotion scores and confidence for each prediction.',
  },
  {
    title: 'Adaptive prompts',
    text: 'Weak emotions get more practice in the next round.',
  },
  {
    title: 'Session history',
    text: 'Each child keeps quiz and practice attempts with results.',
  },
  {
    title: 'Progress dashboard',
    text: 'Accuracy by emotion, daily trend, and recent attempts.',
  },
]

const REQUIREMENTS = [
  'Detect a face and name the expression with a confidence score.',
  'Run quiz and webcam practice, and mark each try correct or wrong.',
  'Save every attempt under a child session.',
  'Give weaker emotions more practice next.',
  'Show therapists accuracy and trends over time.',
  'Keep child practice separate from the therapist dashboard.',
  'Support therapy practice. Do not diagnose ASD.',
]

export default function FeaturesChapter() {
  const jump = useSiteJump()

  return (
    <section id="features" className="chapter chapter--features">
      <div className="page-hero reveal">
        <p className="hero__eyebrow">Features</p>
        <h1>What you can do</h1>
        <p className="page-hero__lead">
          Practice facial emotions. Review clear progress after each session.
        </p>
      </div>

      <div className="band reveal">
        <div className="card-grid">
          {CAPABILITIES.map((item, index) => (
            <article
              key={item.title}
              className="info-card reveal-child"
              style={{ '--i': index }}
            >
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="band reveal">
        <div className="section__intro section__intro--left">
          <h2>What the app must do</h2>
          <p>Short list of the core therapy-support goals.</p>
        </div>
        <ol className="req-list">
          {REQUIREMENTS.map((item, index) => (
            <li key={item} className="reveal-child" style={{ '--i': index }}>
              {item}
            </li>
          ))}
        </ol>
      </div>

      <div className="band band--note reveal">
        <h2>Not a diagnosis tool</h2>
        <p>
          It does not diagnose ASD or replace a clinician. Needs a clear face,
          good light, and a clear expression.
        </p>
        <a
          href="/how-it-works"
          className="btn btn--primary"
          onClick={(event) => {
            event.preventDefault()
            jump('how-it-works')
          }}
        >
          How a session runs
        </a>
      </div>
    </section>
  )
}
