import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { agendamentosService } from '../services/firestore'
import AgendaViewToggle from '../components/AgendaViewToggle'
import AgendamentoModal from '../components/AgendamentoModal'
import './AgendaMes.css'

function AgendaMes() {
  const navigate = useNavigate()
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [agendamentosCount, setAgendamentosCount] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [showAgendamentoModal, setShowAgendamentoModal] = useState(false)
  const [modalInitialData, setModalInitialData] = useState<{
    clienteId?: string | null
    data?: string | null
    horario?: string | null
  }>({})

  useEffect(() => {
    loadAgendamentos()
  }, [selectedMonth])

  const loadAgendamentos = async () => {
    setIsLoading(true)
    try {
      // Calcular início e fim do mês
      const year = selectedMonth.getFullYear()
      const month = selectedMonth.getMonth()
      const startDate = new Date(year, month, 1)
      const endDate = new Date(year, month + 1, 0)

      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      // Buscar agendamentos do mês no Firestore
      const agendamentosMes = await agendamentosService.getByDateRange(startDateStr, endDateStr)

      // Contar agendamentos por dia
      const counts: Record<string, number> = {}

      agendamentosMes.forEach((ag: any) => {
        const agDate = ag.data instanceof Date ? ag.data.toISOString().split('T')[0] : ag.data
        counts[agDate] = (counts[agDate] || 0) + 1
      })

      setAgendamentosCount(counts)
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    })
  }

  const goToPreviousMonth = () => {
    const newDate = new Date(selectedMonth)
    newDate.setMonth(newDate.getMonth() - 1)
    setSelectedMonth(newDate)
  }

  const goToNextMonth = () => {
    const newDate = new Date(selectedMonth)
    newDate.setMonth(newDate.getMonth() + 1)
    setSelectedMonth(newDate)
  }

  const goToThisMonth = () => {
    setSelectedMonth(new Date())
  }

  const getCalendarDays = (): (Date | null)[] => {
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Get first day of week (Monday = 0)
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
    const daysInMonth = lastDay.getDate()

    const days: (Date | null)[] = []

    // Add empty cells for days before month starts
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }

    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }

    // Fill remaining cells to complete grid (42 cells = 6 weeks)
    while (days.length < 42) {
      days.push(null)
    }

    return days
  }

  const formatDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0]
  }

  const isToday = (date: Date | null): boolean => {
    if (!date) return false
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isCurrentMonth = (date: Date | null): boolean => {
    if (!date) return false
    return (
      date.getMonth() === selectedMonth.getMonth() &&
      date.getFullYear() === selectedMonth.getFullYear()
    )
  }

  const handleDayClick = (date: Date | null) => {
    if (!date || !isCurrentMonth(date)) return
    // Navegar para visualização diária com a data selecionada
    navigate(`/agenda/dia?date=${formatDateKey(date)}`)
  }

  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const calendarDays = getCalendarDays()

  return (
    <div className="agenda-mes">
      {/* Cabeçalho */}
      <div className="agenda-header">
        <div className="agenda-header-top">
          <h1 className="agenda-title">Agenda</h1>
          <div className="agenda-header-actions">
            <AgendaViewToggle />
            <button
              className="btn-primary"
              onClick={() => {
                setModalInitialData({})
                setShowAgendamentoModal(true)
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Novo Agendamento
            </button>
          </div>
        </div>

        <div className="agenda-date-controls">
          <button className="btn-nav" onClick={goToPreviousMonth}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Mês Anterior
          </button>

          <div className="date-display">
            <h2 className="date-text">{formatMonthYear(selectedMonth)}</h2>
          </div>

          <div className="date-actions">
            <button className="btn-today" onClick={goToThisMonth}>
              Este Mês
            </button>
            <button className="btn-nav" onClick={goToNextMonth}>
              Próximo Mês
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Calendário */}
      {isLoading ? (
        <div className="agenda-loading">
          <div className="spinner-large"></div>
          <p>Carregando agendamentos...</p>
        </div>
      ) : (
        <div className="calendar-container">
          <div className="calendar-header">
            {weekDays.map((day) => (
              <div key={day} className="calendar-day-header">
                {day}
              </div>
            ))}
          </div>

          <div className="calendar-grid">
            {calendarDays.map((day, index) => {
              const dateKey = day ? formatDateKey(day) : null
              const count = dateKey ? agendamentosCount[dateKey] || 0 : 0
              const today = isToday(day)
              const currentMonth = isCurrentMonth(day)

              return (
                <div
                  key={index}
                  className={`calendar-day ${!currentMonth ? 'day-other-month' : ''} ${today ? 'day-today' : ''} ${count > 0 ? 'has-agendamentos' : ''}`}
                  onClick={() => handleDayClick(day)}
                >
                  {day && (
                    <>
                      <div className="day-number">{day.getDate()}</div>
                      {count > 0 && (
                        <div className="agendamentos-badge">
                          {count} {count === 1 ? 'agendamento' : 'agendamentos'}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal de Agendamento */}
      <AgendamentoModal
        isOpen={showAgendamentoModal}
        mode="create"
        initialData={modalInitialData.data || null}
        initialHorario={modalInitialData.horario || null}
        initialClienteId={modalInitialData.clienteId || null}
        onClose={() => {
          setShowAgendamentoModal(false)
          setModalInitialData({})
        }}
        onSuccess={() => {
          loadAgendamentos()
        }}
      />

      {/* Legenda */}
      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-color legend-today"></div>
          <span>Hoje</span>
        </div>
        <div className="legend-item">
          <div className="legend-color legend-has-agendamentos"></div>
          <span>Com agendamentos</span>
        </div>
        <div className="legend-item">
          <div className="legend-color legend-other-month"></div>
          <span>Outro mês</span>
        </div>
      </div>
    </div>
  )
}

export default AgendaMes

