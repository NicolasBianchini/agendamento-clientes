import { useState } from 'react'
import { servicosService } from '../services/firestore'
import './NovoServicoModal.css'

interface NovoServicoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

function NovoServicoModal({ isOpen, onClose, onSuccess }: NovoServicoModalProps) {
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [errors, setErrors] = useState<{ nome?: string; valor?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

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

    setIsSubmitting(true)

    try {
      // Salvar no Firestore
      const valorNumerico = parseCurrency(valor)
      
      await servicosService.create({
        nome: nome.trim(),
        valor: valorNumerico,
        ativo: true,
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
      alert('Erro ao cadastrar serviço. Tente novamente.')
      console.error(error)
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setNome('')
    setValor('')
    setErrors({})
    setIsSubmitting(false)
    setShowSuccess(false)
  }

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm()
      onClose()
    }
  }

  const isFormValid = nome.trim() && parseCurrency(valor) > 0 && !errors.nome && !errors.valor

  if (!isOpen) return null

  return (
    <div className="modal-overlay novo-servico-overlay" onClick={handleClose}>
      <div className="modal-content novo-servico-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Novo Serviço</h2>
          <button
            className="modal-close"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Fechar"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {showSuccess && (
          <div className="success-message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Serviço cadastrado com sucesso!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="novo-servico-form" noValidate>
          <div className="form-group">
            <label htmlFor="nome-servico" className="form-label">
              Nome <span className="required">*</span>
            </label>
            <input
              type="text"
              id="nome-servico"
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
            <label htmlFor="valor-servico" className="form-label">
              Valor <span className="required">*</span>
            </label>
            <input
              type="text"
              id="valor-servico"
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

          <div className="form-info">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>O serviço será criado como <strong>Ativo</strong> por padrão</span>
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
                  Salvar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NovoServicoModal

