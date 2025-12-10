import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getUserSession, logout, isAuthenticated, isAdminMaster } from '../services/auth'
import './Layout.css'

interface LayoutProps {
  userName?: string
}

function Layout({ userName }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentUserName, setCurrentUserName] = useState(userName || 'Usuário')
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
            <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3m15.364 6.364l-4.243-4.243m-4.242 0L5.636 18.364M18.364 5.636l-4.243 4.243m-4.242 0L5.636 5.636"></path>
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
    </div>
  )
}

export default Layout

