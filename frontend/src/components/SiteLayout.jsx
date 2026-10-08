import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import './Site.css'

const PAGES = [
  { id: 'home', to: '/', label: 'Home' },
  { id: 'features', to: '/features', label: 'Features' },
  { id: 'how-it-works', to: '/how-it-works', label: 'How It Works' },
]

const SiteJumpContext = createContext(() => {})

export function useSiteJump() {
  return useContext(SiteJumpContext)
}

function sectionIdForPath(pathname) {
  if (pathname === '/features' || pathname === '/product') return 'features'
  if (pathname === '/how-it-works') return 'how-it-works'
  return 'home'
}

function pathForSection(id) {
  if (id === 'features') return '/features'
  if (id === 'how-it-works') return '/how-it-works'
  return '/'
}

function BrandMark() {
  return (
    <svg viewBox="0 0 40 40" width="36" height="36" aria-hidden="true">
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
  )
}

function scrollToSection(id) {
  const node = document.getElementById(id)
  if (!node) return
  node.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function SiteLayout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeId, setActiveId] = useState(sectionIdForPath(location.pathname))
  const [scrolled, setScrolled] = useState(false)
  const fromScrollSpy = useRef(false)
  const fromClick = useRef(false)

  function jump(id) {
    fromClick.current = true
    setActiveId(id)
    const nextPath = pathForSection(id)
    if (location.pathname !== nextPath) {
      navigate(nextPath)
    }
    scrollToSection(id)
    window.setTimeout(() => {
      fromClick.current = false
    }, 1200)
  }

  useEffect(() => {
    if (fromScrollSpy.current) {
      fromScrollSpy.current = false
      return
    }
    const id = sectionIdForPath(location.pathname)
    setActiveId(id)
    if (id === 'home' && window.scrollY < 40) return
    const frame = window.requestAnimationFrame(() => scrollToSection(id))
    return () => window.cancelAnimationFrame(frame)
  }, [location.pathname])

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const sections = PAGES.map((page) => document.getElementById(page.id)).filter(Boolean)
    if (sections.length === 0) return undefined

    const spy = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visible || fromClick.current) return
        const id = visible.target.id
        setActiveId(id)
        const nextPath = pathForSection(id)
        if (window.location.pathname !== nextPath) {
          fromScrollSpy.current = true
          navigate(nextPath, { replace: true })
        }
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0.15, 0.4] },
    )

    sections.forEach((section) => spy.observe(section))
    return () => spy.disconnect()
  }, [navigate])

  useEffect(() => {
    const nodes = [...document.querySelectorAll('.reveal')]
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function markIn(node) {
      node.classList.add('is-in')
    }

    if (reduced) {
      nodes.forEach(markIn)
      return undefined
    }

    nodes.forEach((node) => {
      const top = node.getBoundingClientRect().top
      if (top < window.innerHeight * 0.9) {
        markIn(node)
      }
    })

    const reveal = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            markIn(entry.target)
            reveal.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.08 },
    )

    nodes.forEach((node) => {
      if (!node.classList.contains('is-in')) {
        reveal.observe(node)
      }
    })
    return () => reveal.disconnect()
  }, [])

  return (
    <SiteJumpContext.Provider value={jump}>
      <div className="site">
        <header className={`site-nav${scrolled ? ' is-scrolled' : ''}`}>
          <Link
            to="/"
            className="site-brand"
            onClick={(event) => {
              event.preventDefault()
              jump('home')
            }}
          >
            <span className="site-brand__mark">
              <BrandMark />
            </span>
            <span className="site-brand__text">
              <strong>ASD Emotion</strong>
              <small>Understand · Support · Grow</small>
            </span>
          </Link>

          <nav className="site-nav__links" aria-label="Website">
            {PAGES.map((page) => (
              <a
                key={page.id}
                href={page.to}
                className={activeId === page.id ? 'is-active' : undefined}
                onClick={(event) => {
                  event.preventDefault()
                  jump(page.id)
                }}
              >
                {page.label}
              </a>
            ))}
          </nav>

          <Link to="/login" className="btn btn--primary site-nav__cta">
            Get Started
          </Link>
        </header>

        <main>{children}</main>

        <footer className="site-footer">
          <div className="site-footer__inner">
            <div className="site-footer__grid">
              <div className="site-footer__brand-block">
                <p className="site-footer__brand">ASD Emotion</p>
                <p>Practice facial emotions. Track progress for ASD therapy support.</p>
              </div>
              <div className="site-footer__links">
                <div className="site-footer__col">
                  <p className="site-footer__label">Pages</p>
                  {PAGES.map((page) => (
                    <a
                      key={page.id}
                      href={page.to}
                      onClick={(event) => {
                        event.preventDefault()
                        jump(page.id)
                      }}
                    >
                      {page.label}
                    </a>
                  ))}
                </div>
                <div className="site-footer__col">
                  <p className="site-footer__label">Start a session</p>
              <Link to="/login">Sign in</Link>
              <Link to="/login">Start session</Link>
                </div>
              </div>
            </div>
            <p className="site-footer__note">
              ASD Emotion supports therapists and caregivers. It does not diagnose
              autism or any clinical condition, and it does not replace professional
              judgment.
            </p>
          </div>
        </footer>
      </div>
    </SiteJumpContext.Provider>
  )
}
