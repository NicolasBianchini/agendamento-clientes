import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getUserSession, logout, isAuthenticated, isAdminMaster, isAccessExpired, isAccessExpiring, getDaysUntilExpiration, refreshUserSession } from '../services/auth'
import { useConfiguracoes } from '../hooks/useConfiguracoes'
import { gerarLinkWhatsApp } from '../utils/formatacao'
import AcessoExpiradoModal from './AcessoExpiradoModal'
import './Layout.css'

interface LayoutProps {
  userName?: string
}

function Layout({ userName }: LayoutProps) {
  const { config } = useConfiguracoes()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentUserName, setCurrentUserName] = useState(userName || 'Usuário')
  const [showAcessoExpiradoModal, setShowAcessoExpiradoModal] = useState(false)
  const [modalTipo, setModalTipo] = useState<'expirado' | 'expirando'>('expirado')
  const [diasRestantes, setDiasRestantes] = useState<number | null>(null)
  const location = useLocation()
  const navigate = useNavigate()

  // Verificar autenticação e carregar dados do usuário
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login')
      return
    }

    const usuario = getUserSession()
    if (usuario) {
      setCurrentUserName(usuario.nome)
    }
  }, [navigate, location.pathname]) // Re-executar quando a rota mudar para atualizar menu

  // Verificar acesso expirado ou expirando
  useEffect(() => {
    const verificarAcesso = async () => {
      // Primeiro, atualizar a sessão do Firestore para garantir dados atualizados
      const usuarioAtualizado = await refreshUserSession()
      const usuario = usuarioAtualizado || getUserSession()

      if (!usuario) return

      if (!usuario.dataExpiracao || usuario.dataExpiracao.trim() === '') {
        setShowAcessoExpiradoModal(false)
        return
      }

      if (isAccessExpired(usuario)) {
        setModalTipo('expirado')
        setDiasRestantes(null)
        setShowAcessoExpiradoModal(true)
        return
      }

      // Verificar se está expirando em 7 dias ou menos (incluindo hoje)
      if (isAccessExpiring(usuario)) {
        const dias = getDaysUntilExpiration(usuario)
        setDiasRestantes(dias)

        // Verificar se já mostramos o modal hoje
        const hoje = new Date().toISOString().split('T')[0] // YYYY-MM-DD
        const lastShownKey = `acesso_expirando_modal_${usuario.id}_${hoje}`
        const lastShown = localStorage.getItem(lastShownKey)

        if (!lastShown) {
          setModalTipo('expirando')
          setShowAcessoExpiradoModal(true)
          localStorage.setItem(lastShownKey, 'true')
        }
      } else {
        setShowAcessoExpiradoModal(false)
      }
    }

    verificarAcesso()

    const handleAcessoRenovado = () => {
      verificarAcesso()
    }

    window.addEventListener('acesso-renovado', handleAcessoRenovado)

    // Verificar novamente quando a rota mudar (pode ter sido renovado em outra aba)
    const intervalId = setInterval(() => {
      verificarAcesso()
    }, 30000) // Verificar a cada 30 segundos

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('acesso-renovado', handleAcessoRenovado)
    }
  }, [location.pathname]) // Re-executar quando a rota mudar

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  const getIcon = (iconName: string): React.JSX.Element | null => {
    const iconSize = 20
    const iconProps = {
      width: iconSize,
      height: iconSize,
      viewBox: '0 0 24 24',
      fill: 'none' as const,
      stroke: 'currentColor',
      strokeWidth: '2'
    }

    switch (iconName) {
      case 'dashboard':
        return (
          <svg {...iconProps}>
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        )
      case 'clientes':
        return (
          <svg {...iconProps}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        )
      case 'servicos':
        return (
          <svg {...iconProps}>
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
          </svg>
        )
      case 'agenda':
        return (
          <svg {...iconProps}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        )
      case 'historico':
        return (
          <svg {...iconProps}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        )
      case 'configuracoes':
        return (
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        )
      case 'usuarios':
        return (
          <svg {...iconProps}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        )
      default:
        return null
    }
  }

  const usuario = getUserSession()
  const isMaster = isAdminMaster(usuario)

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', iconName: 'dashboard' },
    { path: '/clientes', label: 'Clientes', iconName: 'clientes' },
    { path: '/servicos', label: 'Serviços', iconName: 'servicos' },
    { path: '/agenda', label: 'Agenda', iconName: 'agenda' },
    { path: '/historico', label: 'Histórico', iconName: 'historico' },
    ...(isMaster ? [{ path: '/usuarios', label: 'Usuários', iconName: 'usuarios' }] : []),
    { path: '/configuracoes', label: 'Configurações', iconName: 'configuracoes' },
  ]

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const handleNavigation = (path: string) => {
    navigate(path)
    closeMobileMenu()
  }

  const handleSuporteClick = () => {
    if (config?.whatsappSuporte) {
      const link = gerarLinkWhatsApp(config.whatsappSuporte, 'Olá! Preciso de suporte.')
      window.open(link, '_blank')
    }
  }

  const temWhatsappSuporte = config?.whatsappSuporte && config.whatsappSuporte.trim() !== ''

  return (
    <div className="layout-container">
      {/* Header */}
      <header className="layout-header">
        <div className="header-left">
          <button
            className="menu-toggle mobile-only"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <button
            className="menu-toggle desktop-only"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <h1 className="header-logo">AgendaPro</h1>
        </div>
        <div className="header-right">
          <span className="user-name">{currentUserName}</span>
          {temWhatsappSuporte && (
            <button
              className="suporte-button"
              onClick={handleSuporteClick}
              aria-label="Suporte via WhatsApp"
              title="Falar com suporte"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
              <span className="desktop-only">Suporte</span>
            </button>
          )}
          <button className="logout-button" onClick={handleLogout} aria-label="Logout">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span className="desktop-only">Sair</span>
          </button>
        </div>
      </header>

      <div className={`layout-body ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Sidebar Desktop */}
        <aside className={`sidebar desktop-only ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <nav className="sidebar-nav">
            {menuItems.map((item) => (
              <button
                key={item.path}
                className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => handleNavigation(item.path)}
              >
                <span className="nav-icon">{getIcon(item.iconName)}</span>
                {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="mobile-overlay" onClick={closeMobileMenu}></div>
        )}

        {/* Mobile Menu Drawer */}
        <aside className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="mobile-menu-header">
            <h2>Menu</h2>
            <button className="close-menu" onClick={closeMobileMenu} aria-label="Close menu">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <nav className="mobile-nav">
            {menuItems.map((item) => (
              <button
                key={item.path}
                className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => handleNavigation(item.path)}
              >
                <span className="nav-icon">{getIcon(item.iconName)}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="layout-main">
          <div className="content-wrapper">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="layout-footer">
        <p>AgendaPro © 2024</p>
        <p className="version">v1.0.0</p>
      </footer>

      {/* Modal de Acesso Expirado/Expirando */}
      <AcessoExpiradoModal
        isOpen={showAcessoExpiradoModal}
        onClose={() => setShowAcessoExpiradoModal(false)}
        tipo={modalTipo}
        diasRestantes={diasRestantes}
      />
    </div>
  )
}

export default Layout

