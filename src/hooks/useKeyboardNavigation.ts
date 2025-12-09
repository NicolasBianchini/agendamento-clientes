import { useEffect, useRef } from 'react'

/**
 * Hook para adicionar navegação por teclado em modais
 * - ESC: fecha o modal
 * - Tab: navega entre elementos focáveis
 * - Enter: ativa botão primário quando focado
 */
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

  useEffect(() => {
    if (!isOpen) return

    // Salvar elemento ativo antes de abrir o modal
    previousActiveElement.current = document.activeElement as HTMLElement

    const handleKeyDown = (e: KeyboardEvent) => {
      // Fechar com ESC
      if (options?.closeOnEscape !== false && e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      // Trap focus dentro do modal
      if (options?.trapFocus !== false && e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    // Focar primeiro elemento focável ao abrir
    if (modalRef.current) {
      const firstFocusable = modalRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      firstFocusable?.focus()
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Restaurar foco ao elemento anterior ao fechar
      previousActiveElement.current?.focus()
    }
  }, [isOpen, onClose, options])

  return modalRef
}
