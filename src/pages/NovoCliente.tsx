import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientesService } from '../services/firestore'
import './NovoCliente.css'

function NovoCliente() {
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [errors, setErrors] = useState<{ nome?: string; telefone?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

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

    setIsSubmitting(true)

    try {
      // Salvar no Firestore
      const telefoneNumbers = telefone.replace(/\D/g, '')
      await clientesService.create({
        nome: nome.trim(),
        telefone: telefoneNumbers,
        observacoes: observacoes.trim() || null,
        dataCadastro: new Date().toISOString(),
      })

      // Mostrar sucesso
      setShowSuccess(true)

      // Redirecionar após 1.5s
      setTimeout(() => {
        navigate('/clientes')
      }, 1500)

    } catch (error) {
      alert('Erro ao cadastrar cliente. Tente novamente.')
      console.error(error)
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate('/clientes')
  }

  const isFormValid = nome.trim() && telefone.replace(/\D/g, '').length >= 10 && !errors.nome && !errors.telefone

  return (
    <div className="novo-cliente">
      <div className="novo-cliente-header">
        <button className="back-button" onClick={handleCancel}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Voltar
        </button>
        <div>
          <h1 className="novo-cliente-title">Novo Cliente</h1>
          <p className="novo-cliente-subtitle">Preencha os dados do novo cliente</p>
        </div>
      </div>

      {showSuccess && (
        <div className="success-message">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Cliente cadastrado com sucesso!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="novo-cliente-form" noValidate>
        <div className="form-group">
          <label htmlFor="nome" className="form-label">
            Nome <span className="required">*</span>
          </label>
          <input
            type="text"
            id="nome"
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
          <label htmlFor="telefone" className="form-label">
            Telefone <span className="required">*</span>
          </label>
          <input
            type="tel"
            id="telefone"
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
          <label htmlFor="observacoes" className="form-label">
            Observações
          </label>
          <textarea
            id="observacoes"
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
            onClick={handleCancel}
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
  )
}

export default NovoCliente

