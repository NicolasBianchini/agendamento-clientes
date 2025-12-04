import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './AgendaViewToggle.css'

type ViewType = 'dia' | 'semana' | 'mes'

function AgendaViewToggle() {
  const navigate = useNavigate()
  const location = useLocation()

  const getCurrentView = (): ViewType => {
    if (location.pathname.includes('/semana')) return 'semana'
    if (location.pathname.includes('/mes')) return 'mes'
    return 'dia'
  }

  const [currentView, setCurrentView] = useState<ViewType>(() => {
    // Carregar preferência do localStorage
    const saved = localStorage.getItem('agenda-view')
    if (saved && ['dia', 'semana', 'mes'].includes(saved)) {
      return saved as ViewType
    }
    return getCurrentView()
  })

  useEffect(() => {
    // Sincronizar com a rota atual
    const view = getCurrentView()
    setCurrentView(view)
    localStorage.setItem('agenda-view', view)
  }, [location.pathname])

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view)
    localStorage.setItem('agenda-view', view)
    
    // Navegar para a visualização correspondente
    switch (view) {
      case 'dia':
        navigate('/agenda/dia')
        break
      case 'semana':
        navigate('/agenda/semana')
        break
      case 'mes':
        navigate('/agenda/mes')
        break
    }
  }

  return (
    <div className="agenda-view-toggle">
      <button
        className={`toggle-btn ${currentView === 'dia' ? 'active' : ''}`}
        onClick={() => handleViewChange('dia')}
        title="Visualização Diária"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <span>Dia</span>
      </button>
      
      <button
        className={`toggle-btn ${currentView === 'semana' ? 'active' : ''}`}
        onClick={() => handleViewChange('semana')}
        title="Visualização Semanal"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="3" y1="10" x2="21" y2="10"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="16" y1="2" x2="16" y2="6"></line>
        </svg>
        <span>Semana</span>
      </button>
      
      <button
        className={`toggle-btn ${currentView === 'mes' ? 'active' : ''}`}
        onClick={() => handleViewChange('mes')}
        title="Visualização Mensal"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <span>Mês</span>
      </button>
    </div>
  )
}

export default AgendaViewToggle

