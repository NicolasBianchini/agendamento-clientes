import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getUserSession, isAuthenticated, isCliente, logout } from '../services/auth'
import './PortalClienteLayout.css'

function PortalClienteLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const usuario = getUserSession()

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login')
      return
    }

    if (!isCliente(usuario)) {
      navigate('/dashboard')
    }
  }, [navigate, usuario, location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!usuario) {
    return null
  }

  const navItems = [
    { to: '/portal', label: 'Início', end: true },
    { to: '/agendar', label: 'Agendar', cta: true },
    { to: '/portal/agendamentos', label: 'Agenda' },
    { to: '/portal/perfil', label: 'Perfil' },
  ]

  return (
    <div className="portal-cliente-shell">
      <header className="portal-cliente-header">
        <div className="portal-cliente-brand">
          <p className="portal-cliente-eyebrow">Portal do Cliente</p>
          <h1>AgendaPro</h1>
          <p className="portal-cliente-tagline">Marque seu horário em poucos passos e acompanhe tudo no mesmo lugar.</p>
        </div>
        <div className="portal-cliente-user">
          <small>Olá</small>
          <span>{usuario.nome}</span>
          <button type="button" onClick={handleLogout}>Sair</button>
        </div>
      </header>

      <nav className="portal-cliente-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => {
              const classes = []
              if (item.cta) classes.push('portal-cliente-cta')
              if (isActive) classes.push('active')
              return classes.join(' ')
            }}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="portal-cliente-content">
        <Outlet />
      </main>

      <nav className="portal-cliente-mobile-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => {
              const classes = ['portal-cliente-mobile-nav-link']
              if (item.cta) classes.push('portal-cliente-mobile-nav-link-cta')
              if (isActive) classes.push('active')
              return classes.join(' ')
            }}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default PortalClienteLayout
