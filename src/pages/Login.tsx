import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, isAuthenticated } from '../services/auth'
import './Login.css'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})

  // Verificar se já está autenticado
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard')
    }
  }, [navigate])

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {}

    if (!email.trim()) {
      newErrors.email = 'E-mail é obrigatório'
    } else if (!validateEmail(email)) {
      newErrors.email = 'E-mail inválido'
    }

    const passwordTrimmed = password.trim()
    if (!passwordTrimmed) {
      newErrors.password = 'Senha é obrigatória'
    } else if (passwordTrimmed.length < 6) {
      newErrors.password = 'Senha deve ter no mínimo 6 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    
    // Validação em tempo real
    if (errors.email) {
      if (!value.trim()) {
        setErrors({ ...errors, email: 'E-mail é obrigatório' })
      } else if (!validateEmail(value)) {
        setErrors({ ...errors, email: 'E-mail inválido' })
      } else {
        setErrors({ ...errors, email: undefined })
      }
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPassword(value)
    
    // Limpar erro de senha imediatamente se tiver 6 ou mais caracteres
    if (value.trim().length >= 6) {
      setErrors(prev => {
        if (prev.password) {
          const { password, ...rest } = prev
          return rest
        }
        return prev
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Limpar todos os erros antes de validar
    setErrors({})

    // Validar formulário
    const passwordTrimmed = password.trim()
    if (!email.trim()) {
      setErrors({ email: 'E-mail é obrigatório' })
      return
    }
    
    if (!passwordTrimmed) {
      setErrors({ password: 'Senha é obrigatória' })
      return
    }
    
    if (passwordTrimmed.length < 6) {
      setErrors({ password: 'Senha deve ter no mínimo 6 caracteres' })
      return
    }

    setIsLoading(true)

    try {
      // Autenticar com Firestore
      const usuario = await login({ email, senha: password })
      
      // Login bem-sucedido - redirecionar para o dashboard
      navigate('/dashboard')
      
    } catch (error: any) {
      console.error('❌ Erro no login:', error)
      // Exibir mensagem de erro
      const errorMessage = error.message || 'E-mail ou senha incorretos'
      setErrors({ general: errorMessage })
      setIsLoading(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Agendamento de Clientes</h1>
          <p className="login-subtitle">Sistema de Gestão para Nail Designer</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {(errors.general || errors.password) && (
            <div className="error-message general-error">
              {errors.general || errors.password}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              E-mail
            </label>
            <input
              type="email"
              id="email"
              className={`form-input ${errors.email ? 'input-error' : ''}`}
              placeholder="seu@email.com"
              value={email}
              onChange={handleEmailChange}
              disabled={isLoading}
              autoComplete="email"
            />
            {errors.email && (
              <span className="error-message">{errors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Senha
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className={`form-input ${errors.password ? 'input-error' : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={handlePasswordChange}
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
                disabled={isLoading}
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
            {errors.password && (
              <span className="error-message">{errors.password}</span>
            )}
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>

          <button
            type="button"
            className="forgot-password-link"
            disabled={isLoading}
          >
            Esqueci minha senha
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login

