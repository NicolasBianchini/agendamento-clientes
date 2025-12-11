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

    // Marcar que o modal está aberto
    wasOpenRef.current = true

    // Salvar elemento ativo antes de abrir o modal (apenas na primeira vez)
    if (!hasFocusedRef.current) {
      previousActiveElement.current = document.activeElement as HTMLElement
    }

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

    // Focar primeiro elemento focável ao abrir (apenas uma vez, quando o modal abre)
    // Não focar se já há um elemento focado dentro do modal (evita perder foco durante digitação)
    if (!hasFocusedRef.current && modalRef.current) {
      const timeoutId = setTimeout(() => {
        // Verificar se já há um elemento focado dentro do modal
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
