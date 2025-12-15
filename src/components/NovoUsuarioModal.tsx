import { useState } from 'react'
import { criarUsuario } from '../services/usuarios'
import { type UserRole } from '../services/auth'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import MaskedInput from './MaskedInput'
import './NovoUsuarioModal.css'

interface NovoUsuarioModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

function NovoUsuarioModal({ isOpen, onClose, onSuccess }: NovoUsuarioModalProps) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [role, setRole] = useState<UserRole>('cliente')
  const [ativo, setAtivo] = useState(true)
  const [dataExpiracao, setDataExpiracao] = useState<string>('')
  const [semExpiracao, setSemExpiracao] = useState(false)
  const [errors, setErrors] = useState<{
    nome?: string
    email?: string
    cpf?: string
    senha?: string
    confirmarSenha?: string
    general?: string
  }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const modalRef = useKeyboardNavigation(isOpen, onClose)

  const validateNome = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Nome é obrigatório'
    }
    if (value.trim().length < 2) {
      return 'Nome deve ter no mínimo 2 caracteres'
    }
    return undefined
  }

  const validateEmail = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Email é obrigatório'
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return 'Email inválido'
    }
    return undefined
  }

  const validateCPF = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'CPF é obrigatório'
    }

    const cpfNumeros = value.replace(/\D/g, '')

    if (cpfNumeros.length !== 11) {
      return 'CPF deve ter 11 dígitos'
    }

    // Validar se não são todos dígitos iguais
    if (/^(\d)\1{10}$/.test(cpfNumeros)) {
      return 'CPF inválido'
    }

    // Validar dígitos verificadores
    let soma = 0
    let resto

    for (let i = 1; i <= 9; i++) {
      soma += parseInt(cpfNumeros.substring(i - 1, i)) * (11 - i)
    }

    resto = (soma * 10) % 11
    if (resto === 10 || resto === 11) resto = 0
    if (resto !== parseInt(cpfNumeros.substring(9, 10))) {
      return 'CPF inválido'
    }

    soma = 0
    for (let i = 1; i <= 10; i++) {
      soma += parseInt(cpfNumeros.substring(i - 1, i)) * (12 - i)
    }

    resto = (soma * 10) % 11
    if (resto === 10 || resto === 11) resto = 0
    if (resto !== parseInt(cpfNumeros.substring(10, 11))) {
      return 'CPF inválido'
    }

    return undefined
  }

  const validateSenha = (value: string): string | undefined => {
    if (!value) {
      return 'Senha é obrigatória'
    }
    if (value.length < 6) {
      return 'Senha deve ter no mínimo 6 caracteres'
    }
    return undefined
  }

  const validateConfirmarSenha = (value: string, senhaValue: string): string | undefined => {
    if (!value) {
      return 'Confirmação de senha é obrigatória'
    }
    if (value !== senhaValue) {
      return 'As senhas não coincidem'
    }
    return undefined
  }

  const handleNomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNome(value)
    if (errors.nome) {
      const error = validateNome(value)
      setErrors({ ...errors, nome: error })
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    if (errors.email) {
      const error = validateEmail(value)
      setErrors({ ...errors, email: error })
    }
  }

  const handleCpfChange = (value: string) => {
    setCpf(value)
    if (errors.cpf) {
      const error = validateCPF(value)
      setErrors({ ...errors, cpf: error })
    }
  }

  const handleSenhaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSenha(value)
    if (errors.senha) {
      const error = validateSenha(value)
      setErrors({ ...errors, senha: error })
    }
    // Validar confirmação também
    if (confirmarSenha && errors.confirmarSenha) {
      const error = validateConfirmarSenha(confirmarSenha, value)
      setErrors({ ...errors, confirmarSenha: error })
    }
  }

  const handleConfirmarSenhaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setConfirmarSenha(value)
    if (errors.confirmarSenha) {
      const error = validateConfirmarSenha(value, senha)
      setErrors({ ...errors, confirmarSenha: error })
    }
  }

  const validateForm = (): boolean => {
    const nomeError = validateNome(nome)
    const emailError = validateEmail(email)
    const cpfError = validateCPF(cpf)
    const senhaError = validateSenha(senha)
    const confirmarSenhaError = validateConfirmarSenha(confirmarSenha, senha)

    // Validar data de expiração se não for sem expiração
    if (!semExpiracao && !dataExpiracao) {
      // Não adicionar erro aqui, apenas validar se necessário
    }

    const newErrors = {
      nome: nomeError,
      email: emailError,
      cpf: cpfError,
      senha: senhaError,
      confirmarSenha: confirmarSenhaError,
    }

    setErrors(newErrors)
    return !nomeError && !emailError && !cpfError && !senhaError && !confirmarSenhaError
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      await criarUsuario({
        nome: nome.trim(),
        email: email.trim(),
        cpf: cpf.replace(/\D/g, ''),
        senha,
        role,
        ativo,
        dataExpiracao: semExpiracao ? null : (dataExpiracao || null),
      })

      resetForm()
      onSuccess?.()
      onClose()
    } catch (error: any) {
      setErrors({
        general: error.message || 'Erro ao criar usuário. Tente novamente.',
      })
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setNome('')
    setEmail('')
    setCpf('')
    setSenha('')
    setConfirmarSenha('')
    setRole('cliente')
    setAtivo(true)
    setDataExpiracao('')
    setSemExpiracao(false)
    setErrors({})
    setIsSubmitting(false)
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content novo-usuario-modal"
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
      >
        <div className="modal-header">
          <h2>Novo Usuário</h2>
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

        <form onSubmit={handleSubmit} className="modal-form">
          {errors.general && (
            <div className="error-message general-error">{errors.general}</div>
          )}

          <div className="form-group">
            <label htmlFor="nome" className="form-label">
              Nome Completo <span className="required">*</span>
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
            {errors.nome && <span className="error-message">{errors.nome}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email <span className="required">*</span>
            </label>
            <input
              type="email"
              id="email"
              className={`form-input ${errors.email ? 'input-error' : ''}`}
              placeholder="usuario@email.com"
              value={email}
              onChange={handleEmailChange}
              disabled={isSubmitting}
              autoComplete="email"
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="cpf" className="form-label">
              CPF <span className="required">*</span>
            </label>
            <MaskedInput
              type="cpf"
              id="cpf"
              value={cpf}
              onChange={handleCpfChange}
              className={`form-input ${errors.cpf ? 'input-error' : ''}`}
              disabled={isSubmitting}
            />
            {errors.cpf && <span className="error-message">{errors.cpf}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="senha" className="form-label">
              Senha <span className="required">*</span>
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="senha"
                className={`form-input ${errors.senha ? 'input-error' : ''}`}
                placeholder="Mínimo 6 caracteres"
                value={senha}
                onChange={handleSenhaChange}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            {errors.senha && <span className="error-message">{errors.senha}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmarSenha" className="form-label">
              Confirmar Senha <span className="required">*</span>
            </label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmarSenha"
                className={`form-input ${errors.confirmarSenha ? 'input-error' : ''}`}
                placeholder="Digite a senha novamente"
                value={confirmarSenha}
                onChange={handleConfirmarSenhaChange}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isSubmitting}
                aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showConfirmPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            {errors.confirmarSenha && <span className="error-message">{errors.confirmarSenha}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="role" className="form-label">
              Tipo de Acesso <span className="required">*</span>
            </label>
            <select
              id="role"
              className="form-input"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              disabled={isSubmitting}
            >
              <option value="cliente">Profissional (Barbeiro, Manicure, etc.)</option>
              <option value="admin">Admin</option>
              <option value="admin_master">Admin Master</option>
            </select>
            <small className="form-hint">
              Profissional: Acesso para gerenciar seus próprios agendamentos e clientes
            </small>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                disabled={isSubmitting}
              />
              <span>Usuário ativo</span>
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={semExpiracao}
                onChange={(e) => {
                  setSemExpiracao(e.target.checked)
                  if (e.target.checked) {
                    setDataExpiracao('')
                  }
                }}
                disabled={isSubmitting}
              />
              <span>Sem data de expiração (acesso permanente)</span>
            </label>
          </div>

          {!semExpiracao && (
            <div className="form-group">
              <label htmlFor="dataExpiracao" className="form-label">
                Data de Expiração do Acesso <span className="required">*</span>
              </label>
              <input
                type="date"
                id="dataExpiracao"
                className="form-input"
                value={dataExpiracao}
                onChange={(e) => setDataExpiracao(e.target.value)}
                disabled={isSubmitting}
              />
              <small className="form-hint">
                Após esta data, o usuário precisará de uma nova liberação para acessar o sistema
              </small>
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Criando...' : 'Criar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NovoUsuarioModal
