import { useEffect, useState } from 'react'

import { getCurrentUser, getInitials, updateUserProfile } from '../../services/authService.js'

export function ProfileModal({ isOpen, onClose }) {
  const [user, setUser] = useState(getCurrentUser())
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [avatar, setAvatar] = useState(user?.avatar || getInitials(user?.fullName || 'User'))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const currentUser = getCurrentUser()
    setUser(currentUser)
    setFullName(currentUser?.fullName || '')
    setAvatar(currentUser?.avatar || getInitials(currentUser?.fullName || 'User'))
    setError('')
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  const handleSave = async () => {
    const trimmedName = fullName.trim()
    if (!trimmedName || trimmedName.length > 100) {
      setError('Name must contain between 1 and 100 characters.')
      return
    }

    setIsSaving(true)
    setError('')
    try {
      const nextUser = await updateUserProfile({
        fullName: trimmedName,
        avatar: (avatar || '').trim() || getInitials(trimmedName),
      })
      setUser(nextUser)
      onClose()
      window.dispatchEvent(new CustomEvent('user-profile-updated'))
    } catch (saveError) {
      setError(saveError.message || 'Unable to save your profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="profile-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="profile-modal__header">
          <div>
            <p className="eyebrow">Profile</p>
            <h3>User account</h3>
          </div>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close profile">×</button>
        </div>

        <div className="profile-modal__body">
          <div className="profile-preview">
            <div className="profile-avatar large modal-avatar">{(avatar || getInitials(fullName || user?.fullName || 'User')).slice(0, 2).toUpperCase()}</div>
            <div>
              <strong>{fullName || user?.fullName || 'User'}</strong>
              <small>{user?.email || 'No email on file'}</small>
            </div>
          </div>

          <div className="profile-form">
            <label className="field-group">
              <span>Profile Picture / Avatar</span>
              <input
                type="text"
                value={avatar}
                onChange={(event) => setAvatar(event.target.value)}
                placeholder="Enter initials or nickname"
              />
            </label>

            <label className="field-group">
              <span>Full Name</span>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your full name"
              />
            </label>

            <label className="field-group">
              <span>Email</span>
              <input type="email" value={user?.email || ''} readOnly />
            </label>
          </div>
        </div>

        {error && <p className="field-error" role="alert">{error}</p>}

        <div className="profile-modal__actions">
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button type="button" className="primary-button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
