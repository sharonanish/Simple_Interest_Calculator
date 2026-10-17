import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

import { ProfileModal } from '../profile/ProfileModal.jsx'
import { getInitials, logoutUser } from '../../services/authService.js'

const navItems = [
  { label: 'Calculator', to: '/calculator' },
  { label: 'History', to: '/history' },
  { label: 'Insights', to: '/insights' },
  { label: 'Reports', to: '/reports' },
]

export function TopNav({ theme, onToggleTheme, isAuthenticated = false, user = null }) {
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isMenuOpen])

  const handleLogout = async () => {
    await logoutUser()
    setIsMenuOpen(false)
    navigate('/login')
  }

  const profileName = user?.fullName || 'User'
  const profileAvatar = user?.avatar || getInitials(profileName)
  const profileEmail = user?.email || ''

  return (
    <>
    <header className="topbar">
      <div className="brand" aria-label="Simple Interest Calculator home">
        <div className="brand-mark">SI</div>
        <span>Simple Interest Calculator</span>
      </div>

      <nav className="main-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/calculator'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="topbar-actions">
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <span className="toggle-track">
            <span className="toggle-thumb" />
          </span>
          <span className="toggle-label">{theme === 'dark' ? 'Dark' : 'Light'}</span>
        </button>

        {isAuthenticated && user ? (
          <div className="profile-menu-wrap" ref={menuRef}>
            <button type="button" className="profile-button" onClick={() => setIsMenuOpen((open) => !open)} aria-expanded={isMenuOpen}>
              <span className="profile-avatar">{profileAvatar}</span>
              <span className="profile-email">{profileEmail}</span>
              <span className="profile-chevron" aria-hidden="true">▾</span>
            </button>

            {isMenuOpen && (
              <div className="profile-menu" role="menu" aria-label="User menu">
                <div className="profile-menu__header">
                  <span className="profile-avatar large">{profileAvatar}</span>
                  <div>
                    <strong>{profileName}</strong>
                    <small>{profileEmail}</small>
                  </div>
                </div>
                <button type="button" className="menu-item" role="menuitem" onClick={() => { setIsMenuOpen(false); setIsProfileOpen(true) }}>Profile</button>
                <button type="button" className="menu-item danger" role="menuitem" onClick={handleLogout}>Log out</button>
              </div>
            )}
          </div>
        ) : (
          <button type="button" className="login-button" onClick={() => navigate('/login')}>
            Log in
          </button>
        )}
      </div>
    </header>
    <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  )
}
