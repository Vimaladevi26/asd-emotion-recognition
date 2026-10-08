import { Link } from 'react-router-dom'

const STEPS = [
  {
    num: '01',
    title: 'Start a session',
    text: 'Open Quiz or Practice. A child profile and session are created.',
  },
  {
    num: '02',
    title: 'Try one emotion',
    text: 'Quiz: pick the emotion. Practice: show it on camera.',
  },
  {
    num: '03',
    title: 'Get instant feedback',
    text: 'See if the choice or expression was correct.',
  },
  {
    num: '04',
    title: 'Practice weak spots',
    text: 'The next prompt favors emotions with lower accuracy.',
  },
  {
    num: '05',
    title: 'Review progress',
    text: 'Therapist Mode opens the dashboard with quiz and practice trends.',
  },
]

export default function WorksChapter() {
  return (
    <section id="how-it-works" className="chapter chapter--works">
      <div className="page-hero reveal">
        <p className="hero__eyebrow">How it works</p>
        <h1>One prompt at a time</h1>
        <p className="page-hero__lead">
          Practice one emotion, get a result, then review the record later.
        </p>
      </div>

      <div className="band reveal">
        <ol className="step-list">
          {STEPS.map((step, index) => (
            <li key={step.num} className="reveal-child" style={{ '--i': index }}>
              <span>{step.num}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="band band--split reveal">
        <div>
          <h2>Child and therapist</h2>
          <p>Same data. Different screens.</p>
        </div>
        <div className="pair">
          <article className="info-card">
            <h3>Child view</h3>
            <p>Quiz and practice with simple feedback.</p>
            <Link to="/quiz" className="text-link">
              Open the quiz
            </Link>
          </article>
          <article className="info-card">
            <h3>Therapist view</h3>
            <p>Accuracy by emotion and daily progress.</p>
            <Link to="/practice" className="text-link">
              Open webcam practice
            </Link>
          </article>
        </div>
      </div>
    </section>
  )
}
