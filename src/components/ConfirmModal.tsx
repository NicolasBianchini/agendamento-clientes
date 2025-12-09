import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import './ConfirmModal.css'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'primary' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const modalRef = useKeyboardNavigation(isOpen, onCancel, {
    closeOnEscape: true,
    trapFocus: true,
  })

  if (!isOpen) return null

  return (
    <div className="modal-overlay confirm-modal-overlay" onClick={onCancel}>
      <div ref={modalRef} className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <h3 className="confirm-modal-title">{title}</h3>
        </div>
        <div className="confirm-modal-body">
          <p className="confirm-modal-message">{message}</p>
        </div>
        <div className="confirm-modal-actions">
          <button
            className="btn-cancel"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className={`btn-confirm btn-confirm-${confirmVariant}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal

