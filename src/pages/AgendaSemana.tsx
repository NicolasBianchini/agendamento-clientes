import { useState, useEffect, useMemo } from 'react'
import { agendamentosService, clientesService, servicosService } from '../services/firestore'
import AgendaViewToggle from '../components/AgendaViewToggle'
import AgendamentoModal from '../components/AgendamentoModal'
import AgendamentoDetalhesModal from '../components/AgendamentoDetalhesModal'
import { useConfiguracoes } from '../hooks/useConfiguracoes'
import './AgendaSemana.css'

interface Agendamento {
  id: string
  cliente: string
  servico: string
  horario: string
  status: 'agendado' | 'concluido' | 'cancelado'
  data: string // YYYY-MM-DD
}

function AgendaSemana() {
  const { config } = useConfiguracoes()
  const [selectedWeek, setSelectedWeek] = useState(new Date())
  const [agendamentos, setAgendamentos] = useState<Record<string, Agendamento[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [showAgendamentoModal, setShowAgendamentoModal] = useState(false)
  const [showDetalhesModal, setShowDetalhesModal] = useState(false)
  const [selectedAgendamentoId, setSelectedAgendamentoId] = useState<string | null>(null)
  const [modalInitialData, setModalInitialData] = useState<{
    clienteId?: string | null
    data?: string | null
    horario?: string | null
  }>({})

  useEffect(() => {
    loadAgendamentos()
  }, [selectedWeek, config]) // Recarregar quando configurações mudarem

  const getWeekStart = (date: Date): Date => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday as first day
    return new Date(d.setDate(diff))
  }

  const getWeekDays = (): Date[] => {
    const start = getWeekStart(selectedWeek)
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      days.push(day)
    }
    return days
  }

  const loadAgendamentos = async () => {
    setIsLoading(true)
    try {
      // Buscar agendamentos da semana no Firestore
      const weekDays = getWeekDays()
      const startDate = formatDateKey(weekDays[0])
      const endDate = formatDateKey(weekDays[6])

      const agendamentosSemana = await agendamentosService.getByDateRange(startDate, endDate)

      // Buscar dados de clientes e serviços
      const [clientes, servicos] = await Promise.all([
        clientesService.getAll(),
        servicosService.getAll(),
      ])

      // Organizar por data
      const agendamentosPorData: Record<string, Agendamento[]> = {}

      weekDays.forEach((day) => {
        const dateStr = formatDateKey(day)
        agendamentosPorData[dateStr] = []
      })

      agendamentosSemana.forEach((ag: any) => {
        const agDate = ag.data instanceof Date ? ag.data.toISOString().split('T')[0] : ag.data
        const cliente = clientes.find((c: any) => c.id === ag.clienteId)
        const servico = servicos.find((s: any) => s.id === ag.servicoId)

        if (agendamentosPorData[agDate]) {
          agendamentosPorData[agDate].push({
            id: ag.id,
            cliente: cliente?.nome || 'Cliente',
            servico: servico?.nome || ag.servicoNome || 'Serviço',
            horario: ag.horario,
            status: ag.status,
            data: agDate,
          })
        }
      })

      setAgendamentos(agendamentosPorData)
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0]
  }

  const formatWeekRange = (): string => {
    const weekDays = getWeekDays()
    const start = weekDays[0]
    const end = weekDays[6]

    const startStr = start.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    })
    const endStr = end.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

    return `${startStr} - ${endStr}`
  }

  const formatDayName = (date: Date): string => {
    return date.toLocaleDateString('pt-BR', { weekday: 'short' })
  }

  const formatDayNumber = (date: Date): string => {
    return date.toLocaleDateString('pt-BR', { day: '2-digit' })
  }

  const goToPreviousWeek = () => {
    const newDate = new Date(selectedWeek)
    newDate.setDate(newDate.getDate() - 7)
    setSelectedWeek(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(selectedWeek)
    newDate.setDate(newDate.getDate() + 7)
    setSelectedWeek(newDate)
  }

  const goToThisWeek = () => {
    setSelectedWeek(new Date())
  }

  const isToday = (date: Date): boolean => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const handleAgendamentoClick = (agendamento: Agendamento) => {
    setSelectedAgendamentoId(agendamento.id)
    setShowDetalhesModal(true)
  }

  const handleDayClick = (date: Date, horario: string) => {
    setModalInitialData({
      data: formatDateKey(date),
      horario: horario,
    })
    setShowAgendamentoModal(true)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      agendado: { label: 'Agendado', class: 'status-agendado' },
      concluido: { label: 'Concluído', class: 'status-concluido' },
      cancelado: { label: 'Cancelado', class: 'status-cancelado' },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.agendado
    return <span className={`status-badge ${config.class}`}>{config.label}</span>
  }

  // Usar useMemo para recalcular quando as configurações mudarem
  const timeSlots = useMemo(() => {
    if (!config) {
      // Valores padrão enquanto carrega
      const slots: string[] = []
      for (let hour = 6; hour <= 23; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`)
        slots.push(`${hour.toString().padStart(2, '0')}:30`)
      }
      return slots
    }

    const slots: string[] = []
    const [startHour, startMinute] = config.horarioInicial.split(':').map(Number)
    const [endHour, endMinute] = config.horarioFinal.split(':').map(Number)
    const intervalo = config.intervaloMinutos

    const startMinutes = startHour * 60 + startMinute
    const endMinutes = endHour * 60 + endMinute

    for (let minutes = startMinutes; minutes <= endMinutes; minutes += intervalo) {
      const hour = Math.floor(minutes / 60)
      const minute = minutes % 60
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)
    }

    return slots
  }, [config])

  const weekDays = getWeekDays()

  return (
    <div className="agenda-semana">
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
          <button className="btn-nav" onClick={goToPreviousWeek}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Semana Anterior
          </button>

          <div className="date-display">
            <h2 className="date-text">{formatWeekRange()}</h2>
          </div>

          <div className="date-actions">
            <button className="btn-today" onClick={goToThisWeek}>
              Esta Semana
            </button>
            <button className="btn-nav" onClick={goToNextWeek}>
              Próxima Semana
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Grade Semanal */}
      {isLoading ? (
        <div className="agenda-loading">
          <div className="spinner-large"></div>
          <p>Carregando agendamentos...</p>
        </div>
      ) : (
        <div className="agenda-week-grid">
          <div className="week-header">
            <div className="time-column-header"></div>
            {weekDays.map((day) => (
              <div
                key={formatDateKey(day)}
                className={`day-header ${isToday(day) ? 'day-today' : ''}`}
              >
                <div className="day-name">{formatDayName(day)}</div>
                <div className="day-number">{formatDayNumber(day)}</div>
              </div>
            ))}
          </div>

          <div className="week-body">
            <div className="time-column">
              {timeSlots.map((time) => (
                <div key={time} className="time-slot-label">
                  {time}
                </div>
              ))}
            </div>

            {weekDays.map((day) => {
              const dateKey = formatDateKey(day)
              const dayAgendamentos = agendamentos[dateKey] || []

              return (
                <div
                  key={dateKey}
                  className={`day-column ${isToday(day) ? 'day-today' : ''}`}
                >
                  {timeSlots.map((time) => {
                    const agendamento = dayAgendamentos.find(a => a.horario === time)

                    return (
                      <div
                        key={time}
                        className={`time-cell ${agendamento ? 'has-agendamento' : ''}`}
                        onClick={() => !agendamento && handleDayClick(day, time)}
                      >
                        {agendamento ? (
                          <div
                            className="agendamento-card"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAgendamentoClick(agendamento)
                            }}
                          >
                            <div className="agendamento-header">
                              <h3 className="agendamento-cliente">{agendamento.cliente}</h3>
                              {getStatusBadge(agendamento.status)}
                            </div>
                            <p className="agendamento-servico">{agendamento.servico}</p>
                            <p className="agendamento-horario">{agendamento.horario}</p>
                          </div>
                        ) : (
                          <div className="time-cell-empty"></div>
                        )}
                      </div>
                    )
                  })}
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

      {/* Modal de Detalhes */}
      <AgendamentoDetalhesModal
        isOpen={showDetalhesModal}
        agendamentoId={selectedAgendamentoId}
        onClose={() => {
          setShowDetalhesModal(false)
          setSelectedAgendamentoId(null)
        }}
        onDelete={() => {
          loadAgendamentos()
        }}
        onStatusChange={() => {
          loadAgendamentos()
        }}
      />
    </div>
  )
}

export default AgendaSemana

