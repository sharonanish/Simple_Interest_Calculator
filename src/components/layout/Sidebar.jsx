import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const items = [
  { label: 'Overview', icon: 'overview', to: '/calculator#overview', section: 'overview' },
  { label: 'Simple Interest Calculator', icon: 'calculator', to: '/calculator#calculator', section: 'calculator' },
  { label: 'Currency Converter', icon: 'currency', to: '/calculator#currency', section: 'currency' },
  { label: 'Interest Projection Graph', icon: 'projection', to: '/calculator#projection', section: 'projection' },
  { label: 'Calculation Summary', icon: 'summary', to: '/calculator#summary', section: 'summary' },
  { label: 'Scenario Comparison', icon: 'comparison', to: '/calculator#comparison', section: 'comparison' },
  { label: 'Calculation History', icon: 'history', to: '/history#history-section', route: '/history' },
  { label: 'Financial Insights', icon: 'insights', to: '/insights#insights-section', route: '/insights' },
  { label: 'Reports', icon: 'reports', to: '/reports#reports-section', route: '/reports' },
]

const iconContent = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  calculator: <><rect x="5" y="2.5" width="14" height="19" rx="2" /><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01" /></>,
  currency: <><path d="M7 7h12l-3-3M17 17H5l3 3" /><path d="M19 7a7 7 0 0 1 0 10M5 17A7 7 0 0 1 5 7" /></>,
  projection: <><path d="M3 19h18M5 16l5-5 3 2 6-7" /><path d="M15 6h4v4" /></>,
  summary: <><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v5h4M10 12h6M10 16h6" /></>,
  comparison: <><path d="M4 19V5M20 19V5M4 8h6l4 8h6" /><circle cx="10" cy="8" r="1.5" /><circle cx="14" cy="16" r="1.5" /></>,
  history: <><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
  insights: <><path d="M9 18h6M10 22h4M8.5 14.5a7 7 0 1 1 7 0c-.8.6-1.2 1.3-1.3 2.5h-4.4c-.1-1.2-.5-1.9-1.3-2.5Z" /></>,
  reports: <><path d="M5 3h10l4 4v14H5z" /><path d="M15 3v5h4M8 12h8M8 16h8" /></>,
}

function NavIcon({ name }) {
  return (
    <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconContent[name]}
    </svg>
  )
}

export function Sidebar() {
  const location = useLocation()
  const [activeSection, setActiveSection] = useState('overview')
  const [isOpen, setIsOpen] = useState(false)
  const pendingSectionRef = useRef('')
  const isCalculatorRoute = location.pathname === '/calculator'

  useEffect(() => {
    if (!isCalculatorRoute) {
      const routeItem = items.find((item) => item.route === location.pathname)
      if (routeItem) setActiveSection(routeItem.route)
      return undefined
    }

    const hashSection = location.hash.slice(1)
    if (hashSection) {
      setActiveSection(hashSection)
      pendingSectionRef.current = hashSection
    }

    const sections = items
      .filter((item) => item.section)
      .map((item) => document.getElementById(item.section))
      .filter(Boolean)

    if (!sections.length || !('IntersectionObserver' in window)) {
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      if (pendingSectionRef.current) {
        const pendingEntry = entries.find((entry) => entry.target.id === pendingSectionRef.current)
        if (pendingEntry?.isIntersecting) {
          setActiveSection(pendingSectionRef.current)
          pendingSectionRef.current = ''
        }
        return
      }

      const visibleSections = entries
        .filter((entry) => entry.isIntersecting)
        .sort((first, second) => first.boundingClientRect.top - second.boundingClientRect.top)

      if (visibleSections[0]) setActiveSection(visibleSections[0].target.id)
    }, { rootMargin: '-105px 0px -65% 0px', threshold: 0 })

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [isCalculatorRoute, location.hash, location.pathname])

  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname, location.hash])

  const isActive = (item) => item.section
    ? isCalculatorRoute && activeSection === item.section
    : location.pathname === item.route

  return (
    <>
      <button
        type="button"
        className="sidebar-menu-toggle"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls="feature-sidebar"
      >
        <span className="sidebar-menu-toggle__icon" aria-hidden="true">☰</span>
        <span>Dashboard features</span>
      </button>
      {isOpen && <button type="button" className="sidebar-backdrop" aria-label="Close dashboard navigation" onClick={() => setIsOpen(false)} />}
      <aside id="feature-sidebar" className={`feature-sidebar ${isOpen ? 'is-open' : ''}`} aria-label="Dashboard features">
        <div className="sidebar-heading">
          <span className="sidebar-heading__marker" aria-hidden="true" />
          <span>Workspace</span>
        </div>
        <nav className="sidebar-nav" aria-label="Dashboard features">
          {items.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={`sidebar-link ${isActive(item) ? 'active' : ''}`}
              aria-current={isActive(item) ? 'page' : undefined}
              onClick={() => {
                if (item.section) {
                  setActiveSection(item.section)
                  const targetTop = document.getElementById(item.section)?.getBoundingClientRect().top
                  pendingSectionRef.current = targetTop >= 105 && targetTop <= window.innerHeight * 0.35 ? '' : item.section
                }
                setIsOpen(false)
              }}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  )
}