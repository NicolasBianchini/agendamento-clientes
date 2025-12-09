import { useState, useEffect } from 'react'
import { clientesService } from '../services/firestore'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import './EditarClienteModal.css'

interface ClienteData {
  id: string
  nome: string
  telefone: string
  observacoes?: string
}

interface EditarClienteModalProps {
  isOpen: boolean
  clienteId: string | null
  clienteData?: ClienteData
  onClose: () => void
  onSuccess?: () => void
}

function EditarClienteModal({ isOpen, clienteId, clienteData, onClose, onSuccess }: EditarClienteModalProps) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [errors, setErrors] = useState<{ nome?: string; telefone?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (isOpen && clienteId) {
      if (clienteData) {
        // Se os dados já foram passados como prop, usar diretamente
        setNome(clienteData.nome)
        setTelefone(clienteData.telefone)
        setObservacoes(clienteData.observacoes || '')
        setErrors({})
        setIsLoading(false)
      } else {
        // Caso contrário, buscar do Firestore
        loadClienteData()
      }
    } else {
      resetForm()
    }
  }, [isOpen, clienteId, clienteData])

  const loadClienteData = async () => {
    if (!clienteId) return
    
    setIsLoading(true)
    try {
      // Buscar cliente no Firestore
      const cliente = await clientesService.getById(clienteId)
      
      if (!cliente) {
        alert('Cliente não encontrado.')
        onClose()
        return
      }
      
      // Formatar telefone para exibição
      const telefoneFormatado = formatPhone(cliente.telefone || '')
      
      setNome(cliente.nome)
      setTelefone(telefoneFormatado)
      setObservacoes(cliente.observacoes || '')
      setErrors({})
    } catch (error) {
      alert('Erro ao carregar dados do cliente. Tente novamente.')
      console.error(error)
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const formatPhone = (value: string): string => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '')
    
    // Limita a 11 dígitos
    const limited = numbers.slice(0, 11)
    
    // Aplica máscara
    if (limited.length <= 10) {
      return limited.replace(/(\d{2})(\d{4})(\d{0,4})/, (_match, p1, p2, p3) => {
        if (p3) return `(${p1}) ${p2}-${p3}`
        if (p2) return `(${p1}) ${p2}`
        if (p1) return `(${p1}`
        return limited
      })
    } else {
      // 11 dígitos (com DDD e 9º dígito)
      return limited.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
  }

  const validateNome = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Nome é obrigatório'
    }
    if (value.trim().length < 2) {
      return 'Nome deve ter no mínimo 2 caracteres'
    }
    return undefined
  }

  const validateTelefone = (value: string): string | undefined => {
    const numbers = value.replace(/\D/g, '')
    if (!numbers) {
      return 'Telefone é obrigatório'
    }
    if (numbers.length < 10) {
      return 'Telefone deve ter no mínimo 10 dígitos'
    }
    if (numbers.length > 11) {
      return 'Telefone inválido'
    }
    return undefined
  }

  const handleNomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNome(value)
    
    // Validação em tempo real
    if (errors.nome || value.trim()) {
      const error = validateNome(value)
      setErrors({ ...errors, nome: error })
    }
  }

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const formatted = formatPhone(value)
    setTelefone(formatted)
    
    // Validação em tempo real
    if (errors.telefone || formatted) {
      const error = validateTelefone(formatted)
      setErrors({ ...errors, telefone: error })
    }
  }

  const handleObservacoesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setObservacoes(e.target.value)
  }

  const validateForm = (): boolean => {
    const nomeError = validateNome(nome)
    const telefoneError = validateTelefone(telefone)
    
    const newErrors = {
      nome: nomeError,
      telefone: telefoneError,
    }
    
    setErrors(newErrors)
    return !nomeError && !telefoneError
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    if (!clienteId) return

    setIsSubmitting(true)

    try {
      // Atualizar no Firestore
      const telefoneNumbers = telefone.replace(/\D/g, '')
      await clientesService.update(clienteId, {
        nome: nome.trim(),
        telefone: telefoneNumbers,
        observacoes: observacoes.trim() || null,
      })
      
      // Mostrar sucesso
      setShowSuccess(true)
      
      // Limpar formulário e fechar após 1.5s
      setTimeout(() => {
        resetForm()
        setShowSuccess(false)
        onSuccess?.()
        onClose()
      }, 1500)
      
    } catch (error) {
      alert('Erro ao atualizar cliente. Tente novamente.')
      console.error(error)
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setNome('')
    setTelefone('')
    setObservacoes('')
    setErrors({})
    setIsSubmitting(false)
    setIsLoading(false)
    setShowSuccess(false)
  }

  const handleClose = () => {
    if (!isSubmitting && !isLoading) {
      resetForm()
      onClose()
    }
  }

  const isFormValid = nome.trim() && telefone.replace(/\D/g, '').length >= 10 && !errors.nome && !errors.telefone

  const modalRef = useKeyboardNavigation(isOpen, handleClose, {
    closeOnEscape: true,
    trapFocus: true,
  })

  if (!isOpen) return null

  return (
    <div className="modal-overlay editar-cliente-overlay" onClick={handleClose}>
      <div ref={modalRef} className="modal-content editar-cliente-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Editar Cliente</h2>
          <button
            className="modal-close"
            onClick={handleClose}
            disabled={isSubmitting || isLoading}
            aria-label="Fechar"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Carregando dados do cliente...</p>
          </div>
        ) : (
          <>
            {showSuccess && (
              <div className="success-message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Cliente atualizado com sucesso!</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="editar-cliente-form" noValidate>
              <div className="form-group">
                <label htmlFor="nome-edit" className="form-label">
                  Nome <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="nome-edit"
                  className={`form-input ${errors.nome ? 'input-error' : ''}`}
                  placeholder="Digite o nome completo"
                  value={nome}
                  onChange={handleNomeChange}
                  disabled={isSubmitting}
                  autoComplete="name"
                />
                {errors.nome && (
                  <span className="error-message">{errors.nome}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="telefone-edit" className="form-label">
                  Telefone <span className="required">*</span>
                </label>
                <input
                  type="tel"
                  id="telefone-edit"
                  className={`form-input ${errors.telefone ? 'input-error' : ''}`}
                  placeholder="(00) 00000-0000"
                  value={telefone}
                  onChange={handleTelefoneChange}
                  disabled={isSubmitting}
                  autoComplete="tel"
                  maxLength={15}
                />
                {errors.telefone && (
                  <span className="error-message">{errors.telefone}</span>
                )}
                <span className="form-hint">Digite o telefone com DDD</span>
              </div>

              <div className="form-group">
                <label htmlFor="observacoes-edit" className="form-label">
                  Observações
                </label>
                <textarea
                  id="observacoes-edit"
                  className="form-textarea"
                  placeholder="Observações sobre o cliente (opcional)"
                  value={observacoes}
                  onChange={handleObservacoesChange}
                  disabled={isSubmitting}
                  rows={4}
                />
                <span className="form-hint">Informações adicionais sobre o cliente</span>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-save"
                  disabled={!isFormValid || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-small"></span>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default EditarClienteModal

