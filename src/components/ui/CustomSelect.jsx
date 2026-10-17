import { useEffect, useMemo, useRef, useState } from 'react'

export function CustomSelect({ label, value, onChange, options = [], placeholder = 'Select an option', className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  const selectedOption = useMemo(() => {
    return options.find((option) => option.value === value) || null
  }, [options, value])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handlePointerDown = (event) => {
      const target = event.target
      if (menuRef.current && !menuRef.current.contains(target) && !triggerRef.current?.contains(target)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setHighlightIndex(-1)
      return
    }

    const currentIndex = options.findIndex((option) => option.value === value)
    setHighlightIndex(currentIndex >= 0 ? currentIndex : 0)
  }, [isOpen, options, value])

  const handleTriggerKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault()
      setIsOpen(true)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setIsOpen(true)
      setHighlightIndex(options.length - 1)
    }
  }

  const moveHighlight = (direction) => {
    if (!options.length) {
      return
    }

    setHighlightIndex((current) => {
      const nextIndex = current < 0 ? 0 : current + direction
      if (nextIndex < 0) {
        return options.length - 1
      }
      if (nextIndex >= options.length) {
        return 0
      }
      return nextIndex
    })
  }

  const handleMenuKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveHighlight(1)
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveHighlight(-1)
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const target = options[highlightIndex]
      if (target) {
        onChange(target.value)
        setIsOpen(false)
      }
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
      triggerRef.current?.focus()
    }
  }

  return (
    <div className={`custom-select ${className}`.trim()}>
      {label && <label className="custom-select-label">{label}</label>}

      <button
        ref={triggerRef}
        type="button"
        className="custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <span className="custom-select-caret" aria-hidden="true">▾</span>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="custom-select-menu"
          role="listbox"
          tabIndex={-1}
          onKeyDown={handleMenuKeyDown}
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              className={`custom-select-option ${value === option.value ? 'selected' : ''} ${highlightIndex === index ? 'highlighted' : ''}`}
              role="option"
              aria-selected={value === option.value}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
