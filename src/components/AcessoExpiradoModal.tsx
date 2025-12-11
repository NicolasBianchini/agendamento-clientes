import { useEffect } from 'react'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import { useConfiguracoes } from '../hooks/useConfiguracoes'
import { gerarLinkWhatsApp } from '../utils/formatacao'
import './AcessoExpiradoModal.css'

interface AcessoExpiradoModalProps {
  isOpen: boolean
  onClose: () => void
  tipo?: 'expirado' | 'expirando'
  diasRestantes?: number | null
}

function AcessoExpiradoModal({ isOpen, onClose, tipo = 'expirado', diasRestantes = null }: AcessoExpiradoModalProps) {
  const { config, loading } = useConfiguracoes()
  const modalRef = useKeyboardNavigation(isOpen, onClose, {
    closeOnEscape: false,
    trapFocus: true,
  })

  const isExpirando = tipo === 'expirando'
  const whatsappSuporte = config?.whatsappSuporte
  const whatsappLimpo = whatsappSuporte ? String(whatsappSuporte).trim().replace(/\D/g, '') : ''
  const temWhatsappSuporte = whatsappLimpo.length > 0


  if (!isOpen) return null

  const handleSuporteClick = () => {
    if (config?.whatsappSuporte) {
      const mensagem = isExpirando
        ? 'Olá! Meu acesso está expirando em breve. Gostaria de renovar.'
        : 'Olá! Meu acesso expirou. Gostaria de renovar.'
      const link = gerarLinkWhatsApp(config.whatsappSuporte, mensagem)
      window.open(link, '_blank')
    }
  }

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
          {!temWhatsappSuporte && config && (
            <p className="acesso-expirado-hint" style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: 'var(--text-secondary, var(--color-gray-medium))' }}>
              💡 Dica: Configure o WhatsApp de suporte em <strong>Configurações</strong> para facilitar o contato.
            </p>
          )}
        </div>
        <div className="acesso-expirado-actions">
          {temWhatsappSuporte && (
            <button
              className="btn-suporte"
              onClick={handleSuporteClick}
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
              Falar com Suporte
            </button>
          )}
          <button
            className="btn-entendi"
            onClick={onClose}
            type="button"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  )
}

export default AcessoExpiradoModal
