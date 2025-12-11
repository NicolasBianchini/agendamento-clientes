import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import './AcessoExpiradoModal.css'

interface AcessoExpiradoModalProps {
  isOpen: boolean
  onClose: () => void
  tipo?: 'expirado' | 'expirando'
  diasRestantes?: number | null
}

function AcessoExpiradoModal({ isOpen, onClose, tipo = 'expirado', diasRestantes = null }: AcessoExpiradoModalProps) {
  const modalRef = useKeyboardNavigation(isOpen, onClose, {
    closeOnEscape: false,
    trapFocus: true,
  })

  if (!isOpen) return null

  const isExpirando = tipo === 'expirando'

  return (
    <div className="modal-overlay acesso-expirado-overlay">
      <div ref={modalRef} className={`modal-content acesso-expirado-modal ${isExpirando ? 'modal-expirando' : 'modal-expirado'}`}>
        <div className="acesso-expirado-header">
          <div className={`acesso-expirado-icon ${isExpirando ? 'icon-warning' : 'icon-error'}`}>
            {isExpirando ? (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            ) : (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            )}
          </div>
          <h3 className="acesso-expirado-title">
            {isExpirando ? 'Acesso Expirando em Breve' : 'Acesso Expirado'}
          </h3>
        </div>
        <div className="acesso-expirado-body">
          <p className="acesso-expirado-message">
            {isExpirando ? (
              diasRestantes === 0 ? (
                <>
                  Seu acesso <strong>expira hoje</strong>.
                  <br />
                  Entre em contato com o administrador para renovar seu acesso.
                </>
              ) : (
                <>
                  Seu acesso expirará em <strong>{diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}</strong>.
                  <br />
                  Entre em contato com o administrador para renovar seu acesso.
                </>
              )
            ) : (
              'Seu acesso expirou. Entre em contato com o administrador para renovar.'
            )}
          </p>
        </div>
        <div className="acesso-expirado-actions">
          <button
            className="btn-entendi"
            onClick={onClose}
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  )
}

export default AcessoExpiradoModal
