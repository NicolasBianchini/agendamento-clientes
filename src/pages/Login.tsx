import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, isAuthenticated, getDefaultRouteForUser, getUserSession, registerClient } from '../services/auth'
import { useConfiguracoes } from '../hooks/useConfiguracoes'
import { autoAgendamentoService } from '../services/firestore'
import './Login.css'

type EstabelecimentoOption = {
  id: string
  nome?: string
  telefone?: string
}

type FormErrors = {
  email?: string
  password?: string
  general?: string
  registerNome?: string
  registerTelefone?: string
  registerEmail?: string
  registerPassword?: string
  registerEstabelecimentoId?: string
}

function Login() {
  const navigate = useNavigate()
  const { config } = useConfiguracoes()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [registerNome, setRegisterNome] = useState('')
  const [registerTelefone, setRegisterTelefone] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerEstabelecimentoId, setRegisterEstabelecimentoId] = useState('')
  const [registerEstabelecimentoBusca, setRegisterEstabelecimentoBusca] = useState('')
  const [isEstabelecimentoDropdownOpen, setIsEstabelecimentoDropdownOpen] = useState(false)
  const [estabelecimentos, setEstabelecimentos] = useState<EstabelecimentoOption[]>([])
  const [showPassword, setShowPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingEstabelecimentos, setIsLoadingEstabelecimentos] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    if (isAuthenticated()) {
      navigate(getDefaultRouteForUser(getUserSession()))
    }
  }, [navigate])

  useEffect(() => {
    loadEstabelecimentos()
  }, [])

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }

  const normalizePhone = (value: string) => value.replace(/\D/g, '')
  const registerBuscaTelefone = normalizePhone(registerEstabelecimentoBusca)
  const registerBuscaTexto = registerEstabelecimentoBusca.trim().toLowerCase()
  const shouldShowEstabelecimentoResults =
    registerBuscaTelefone.length >= 5 ||
    (registerBuscaTelefone.length === 0 && registerBuscaTexto.length >= 3)

  const loadEstabelecimentos = async () => {
    setIsLoadingEstabelecimentos(true)
    try {
      const data = await autoAgendamentoService.listarEstabelecimentos()
      setEstabelecimentos(data as EstabelecimentoOption[])
    } catch (error) {
      console.error('Erro ao carregar estabelecimentos para cadastro:', error)
    } finally {
      setIsLoadingEstabelecimentos(false)
    }
  }

  const estabelecimentosFiltrados = estabelecimentos.filter((item) => {
    if (!shouldShowEstabelecimentoResults) {
      return false
    }

    if (!registerBuscaTexto) {
      return true
    }

    const nome = String(item.nome || '').toLowerCase()
    const telefone = normalizePhone(String(item.telefone || ''))

    return nome.includes(registerBuscaTexto) || (registerBuscaTelefone.length > 0 && telefone.includes(registerBuscaTelefone))
  }).slice(0, 8)

  const estabelecimentoSelecionado = estabelecimentos.find(
    (item) => item.id === registerEstabelecimentoId
  )

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)

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

    if (value.trim().length >= 6) {
      setErrors((prev) => {
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
    setErrors({})

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
      const usuario = await login({ email, senha: password })
      navigate(getDefaultRouteForUser(usuario))
    } catch (error: any) {
      console.error('Erro no login:', error)
      setErrors({ general: error.message || 'E-mail ou senha incorretos' })
      setIsLoading(false)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const normalizedEmail = registerEmail.trim()
    const normalizedTelefone = registerTelefone.replace(/\D/g, '')
    const normalizedPassword = registerPassword.trim()

    if (!registerNome.trim()) {
      setErrors({ registerNome: 'Nome é obrigatório' })
      return
    }

    if (!normalizedTelefone || normalizedTelefone.length < 10) {
      setErrors({ registerTelefone: 'Telefone é obrigatório' })
      return
    }

    if (!normalizedEmail) {
      setErrors({ registerEmail: 'E-mail é obrigatório' })
      return
    }

    if (!validateEmail(normalizedEmail)) {
      setErrors({ registerEmail: 'E-mail inválido' })
      return
    }

    if (!registerEstabelecimentoId) {
      setErrors({ registerEstabelecimentoId: 'Selecione o estabelecimento' })
      return
    }

    if (!normalizedPassword) {
      setErrors({ registerPassword: 'Senha é obrigatória' })
      return
    }

    if (normalizedPassword.length < 6) {
      setErrors({ registerPassword: 'Senha deve ter no mínimo 6 caracteres' })
      return
    }

    setIsLoading(true)

    try {
      const usuario = await registerClient({
        nome: registerNome,
        telefone: registerTelefone,
        email: registerEmail,
        senha: registerPassword,
        estabelecimentoId: registerEstabelecimentoId,
      })
      navigate(getDefaultRouteForUser(usuario))
    } catch (error: any) {
      console.error('Erro no cadastro:', error)
      setErrors({ general: error.message || 'Não foi possível concluir o cadastro.' })
      setIsLoading(false)
    }
  }

  const handleForgotPassword = () => {
    const whatsappSuporte = config?.whatsappSuporte

    if (!whatsappSuporte) {
      alert('Número de suporte não disponível. Entre em contato com o administrador.')
      return
    }

    const numeroFormatado = whatsappSuporte.replace(/\D/g, '')
    const mensagem = `Olá! Esqueci minha senha do AgendaPro.

*Meus dados:*
Nome: [PREENCHA SEU NOME COMPLETO]
Email cadastrado no sistema: [PREENCHA SEU EMAIL]
CPF: [PREENCHA SEU CPF]

Aguardo retorno. Obrigado!`

    const urlWhatsApp = `https://wa.me/${numeroFormatado}?text=${encodeURIComponent(mensagem)}`
    window.open(urlWhatsApp, '_blank')
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">AgendaPro</h1>
          <p className="login-subtitle">
            {mode === 'login'
              ? 'Entre para acompanhar seus horários ou acessar a operação interna'
              : 'Crie sua conta, escolha o estabelecimento e agende sem depender de cadastro manual'}
          </p>
        </div>

        <div className="login-mode-switch">
          <button
            type="button"
            className={`login-mode-button ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login')
              setErrors({})
            }}
          >
            Entrar
          </button>
          <button
            type="button"
            className={`login-mode-button ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register')
              setErrors({})
            }}
          >
            Criar cadastro
          </button>
        </div>

        {(errors.general || errors.password || errors.registerPassword) && (
          <div className="error-message general-error">
            {errors.general || errors.password || errors.registerPassword}
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="form-group">
              <label htmlFor="email" className="form-label">E-mail</label>
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
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Senha</label>
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
                  onClick={() => setShowPassword((prev) => !prev)}
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
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <button type="submit" className="login-button" disabled={isLoading}>
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
              onClick={handleForgotPassword}
            >
              Esqueci minha senha
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="login-form" noValidate>
            <div className="form-group">
              <label htmlFor="register-nome" className="form-label">Nome completo</label>
              <input
                id="register-nome"
                className={`form-input ${errors.registerNome ? 'input-error' : ''}`}
                value={registerNome}
                onChange={(e) => setRegisterNome(e.target.value)}
                placeholder="Seu nome"
                disabled={isLoading}
                autoComplete="name"
              />
              {errors.registerNome && <span className="error-message">{errors.registerNome}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="register-telefone" className="form-label">Telefone</label>
              <input
                id="register-telefone"
                className={`form-input ${errors.registerTelefone ? 'input-error' : ''}`}
                value={registerTelefone}
                onChange={(e) => setRegisterTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
                disabled={isLoading}
                autoComplete="tel"
              />
              {errors.registerTelefone && <span className="error-message">{errors.registerTelefone}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="register-email" className="form-label">E-mail</label>
              <input
                type="email"
                id="register-email"
                className={`form-input ${errors.registerEmail ? 'input-error' : ''}`}
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                placeholder="seu@email.com"
                disabled={isLoading}
                autoComplete="email"
              />
              {errors.registerEmail && <span className="error-message">{errors.registerEmail}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="register-estabelecimento" className="form-label">Estabelecimento</label>
              <div className="login-estabelecimento-dropdown">
                <div className="login-estabelecimento-input-wrap">
                  <input
                    id="register-estabelecimento"
                    className={`form-input ${errors.registerEstabelecimentoId ? 'input-error' : ''}`}
                    value={registerEstabelecimentoBusca}
                    onChange={(e) => {
                      setRegisterEstabelecimentoBusca(e.target.value)
                      setRegisterEstabelecimentoId('')
                      setIsEstabelecimentoDropdownOpen(true)
                    }}
                    onFocus={() => {
                      if (shouldShowEstabelecimentoResults) {
                        setIsEstabelecimentoDropdownOpen(true)
                      }
                    }}
                    onBlur={() => {
                      window.setTimeout(() => setIsEstabelecimentoDropdownOpen(false), 140)
                    }}
                    disabled={isLoading || isLoadingEstabelecimentos}
                    placeholder={
                      isLoadingEstabelecimentos
                      ? 'Carregando estabelecimentos...'
                        : 'Busque por nome ou telefone'
                    }
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className={`login-estabelecimento-toggle ${isEstabelecimentoDropdownOpen ? 'open' : ''}`}
                    onClick={() => setIsEstabelecimentoDropdownOpen((prev) => !prev)}
                    disabled={isLoading || isLoadingEstabelecimentos}
                    aria-label={isEstabelecimentoDropdownOpen ? 'Fechar lista de estabelecimentos' : 'Abrir lista de estabelecimentos'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                </div>
                {isEstabelecimentoDropdownOpen && shouldShowEstabelecimentoResults && (
                  <div className="login-estabelecimento-results">
                    {estabelecimentosFiltrados.length > 0 ? (
                      estabelecimentosFiltrados.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`login-estabelecimento-option ${registerEstabelecimentoId === item.id ? 'selected' : ''}`}
                          onClick={() => {
                            setRegisterEstabelecimentoId(item.id)
                            setRegisterEstabelecimentoBusca(item.nome || '')
                            setErrors((prev) => ({ ...prev, registerEstabelecimentoId: undefined }))
                            setIsEstabelecimentoDropdownOpen(false)
                          }}
                          disabled={isLoading}
                        >
                          <strong>{item.nome || 'Estabelecimento'}</strong>
                          <span>{item.telefone || 'Telefone não informado'}</span>
                        </button>
                      ))
                    ) : (
                      <div className="login-estabelecimento-empty">
                        Nenhum estabelecimento encontrado com esse nome ou telefone.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="login-estabelecimento-help">
                Escolha o seu estabelecimento favorito inicial. Depois você poderá trocar ou adicionar outros.
              </div>
              {estabelecimentoSelecionado && (
                <div className="login-estabelecimento-selected">
                  Favorito inicial: <strong>{estabelecimentoSelecionado.nome}</strong>
                  {estabelecimentoSelecionado.telefone ? ` • ${estabelecimentoSelecionado.telefone}` : ''}
                </div>
              )}
              {errors.registerEstabelecimentoId && <span className="error-message">{errors.registerEstabelecimentoId}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="register-password" className="form-label">Senha</label>
              <div className="password-input-wrapper">
                <input
                  type={showRegisterPassword ? 'text' : 'password'}
                  id="register-password"
                  className={`form-input ${errors.registerPassword ? 'input-error' : ''}`}
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="Crie uma senha"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowRegisterPassword((prev) => !prev)}
                  disabled={isLoading}
                  aria-label={showRegisterPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showRegisterPassword ? (
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
              {errors.registerPassword && <span className="error-message">{errors.registerPassword}</span>}
            </div>

            <button type="submit" className="login-button" disabled={isLoading || isLoadingEstabelecimentos}>
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Criando cadastro...
                </>
              ) : (
                'Criar conta'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default Login
