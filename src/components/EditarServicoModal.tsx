import { useState, useEffect } from 'react'
import { servicosService } from '../services/firestore'
import './EditarServicoModal.css'

interface ServicoData {
  id: string
  nome: string
  valor: number
}

interface EditarServicoModalProps {
  isOpen: boolean
  servicoId: string | null
  servicoData?: ServicoData
  onClose: () => void
  onSuccess?: () => void
}

function EditarServicoModal({ isOpen, servicoId, servicoData, onClose, onSuccess }: EditarServicoModalProps) {
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [errors, setErrors] = useState<{ nome?: string; valor?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (isOpen && servicoId) {
      if (servicoData) {
        // Se os dados já foram passados como prop, usar diretamente
        setNome(servicoData.nome)
        setValor(formatCurrency(servicoData.valor.toString()))
        setErrors({})
        setIsLoading(false)
      } else {
        // Caso contrário, buscar do Firestore
        loadServicoData()
      }
    } else {
      resetForm()
    }
  }, [isOpen, servicoId, servicoData])

  const loadServicoData = async () => {
    if (!servicoId) return
    
    setIsLoading(true)
    try {
      // Buscar serviço no Firestore
      const servico = await servicosService.getById(servicoId)
      
      if (!servico) {
        alert('Serviço não encontrado.')
        onClose()
        return
      }
      
      setNome(servico.nome)
      setValor(formatCurrency((servico.valor || 0).toString()))
      setErrors({})
    } catch (error) {
      alert('Erro ao carregar dados do serviço. Tente novamente.')
      console.error(error)
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: string): string => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '')
    
    if (!numbers) return ''
    
    // Converte para centavos e depois formata
    const cents = parseInt(numbers, 10)
    const reais = cents / 100
    
    // Formata como moeda brasileira
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(reais)
  }

  const parseCurrency = (value: string): number => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '')
    if (!numbers) return 0
    // Converte de centavos para reais
    return parseInt(numbers, 10) / 100
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

  const validateValor = (value: string): string | undefined => {
    const numericValue = parseCurrency(value)
    if (numericValue <= 0) {
      return 'Valor deve ser maior que zero'
    }
    if (numericValue < 0.01) {
      return 'Valor mínimo é R$ 0,01'
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

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const formatted = formatCurrency(value)
    setValor(formatted)
    
    // Validação em tempo real
    if (errors.valor || formatted) {
      const error = validateValor(formatted)
      setErrors({ ...errors, valor: error })
    }
  }

  const validateForm = (): boolean => {
    const nomeError = validateNome(nome)
    const valorError = validateValor(valor)
    
    const newErrors = {
      nome: nomeError,
      valor: valorError,
    }
    
    setErrors(newErrors)
    return !nomeError && !valorError
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    if (!servicoId) return

    setIsSubmitting(true)

    try {
      // Atualizar no Firestore
      const valorNumerico = parseCurrency(valor)
      await servicosService.update(servicoId, {
        nome: nome.trim(),
        valor: valorNumerico,
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
      alert('Erro ao atualizar serviço. Tente novamente.')
      console.error(error)
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setNome('')
    setValor('')
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

  const isFormValid = nome.trim() && parseCurrency(valor) > 0 && !errors.nome && !errors.valor

  if (!isOpen) return null

  return (
    <div className="modal-overlay editar-servico-overlay" onClick={handleClose}>
      <div className="modal-content editar-servico-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Editar Serviço</h2>
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
            <p>Carregando dados do serviço...</p>
          </div>
        ) : (
          <>
            {showSuccess && (
              <div className="success-message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Serviço atualizado com sucesso!</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="editar-servico-form" noValidate>
              <div className="form-group">
                <label htmlFor="nome-edit-servico" className="form-label">
                  Nome <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="nome-edit-servico"
                  className={`form-input ${errors.nome ? 'input-error' : ''}`}
                  placeholder="Ex: Manicure, Pedicure, etc."
                  value={nome}
                  onChange={handleNomeChange}
                  disabled={isSubmitting}
                  autoComplete="off"
                />
                {errors.nome && (
                  <span className="error-message">{errors.nome}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="valor-edit-servico" className="form-label">
                  Valor <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="valor-edit-servico"
                  className={`form-input ${errors.valor ? 'input-error' : ''}`}
                  placeholder="R$ 0,00"
                  value={valor}
                  onChange={handleValorChange}
                  disabled={isSubmitting}
                  autoComplete="off"
                />
                {errors.valor && (
                  <span className="error-message">{errors.valor}</span>
                )}
                <span className="form-hint">Digite o valor do serviço</span>
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

export default EditarServicoModal

