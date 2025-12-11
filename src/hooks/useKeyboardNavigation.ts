import { useEffect, useRef } from 'react'

export function useKeyboardNavigation(
  isOpen: boolean,
  onClose: () => void,
  options?: {
    closeOnEscape?: boolean
    trapFocus?: boolean
  }
) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)
  const hasFocusedRef = useRef(false)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (!isOpen) {
      // Resetar flag quando modal fecha
      if (wasOpenRef.current) {
        hasFocusedRef.current = false
        wasOpenRef.current = false
        // Restaurar foco ao elemento anterior ao fechar
        previousActiveElement.current?.focus()
      }
      return
    }

    wasOpenRef.current = true

    if (!hasFocusedRef.current) {
      previousActiveElement.current = document.activeElement as HTMLElement
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (options?.closeOnEscape !== false && e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (options?.trapFocus !== false && e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    if (!hasFocusedRef.current && modalRef.current) {
      const timeoutId = setTimeout(() => {
        const activeElement = document.activeElement
        const isElementInsideModal = modalRef.current?.contains(activeElement as Node)

        if (modalRef.current && !isElementInsideModal) {
          const firstFocusable = modalRef.current.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
          firstFocusable?.focus()
        }
        hasFocusedRef.current = true
      }, 0)

      return () => {
        clearTimeout(timeoutId)
        document.removeEventListener('keydown', handleKeyDown)
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose, options?.closeOnEscape, options?.trapFocus])

  return modalRef
}
