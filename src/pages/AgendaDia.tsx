import { useState, useEffect, useMemo } from 'react'
import { agendamentosService, clientesService, servicosService } from '../services/firestore'
import { getUserSession, isAccessExpired } from '../services/auth'
import AgendaViewToggle from '../components/AgendaViewToggle'
import AgendamentoModal from '../components/AgendamentoModal'
import AgendamentoDetalhesModal from '../components/AgendamentoDetalhesModal'
import { useConfiguracoes } from '../hooks/useConfiguracoes'
import ToastContainer from '../components/ToastContainer'
import type { ToastType } from '../components/Toast'
import './AgendaDia.css'

interface Agendamento {
  id: string
  cliente: string
  servico: string
  horario: string
  status: 'agendado' | 'concluido' | 'cancelado'
  clienteId?: string
  servicoId?: string
}

interface AgendamentoAgrupado {
  ids: string[]
  cliente: string
  servico: string
  horarios: string[]
  status: 'agendado' | 'concluido' | 'cancelado'
  isAgrupado: boolean
}

function AgendaDia() {
  const { config } = useConfiguracoes()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [agendamentos, setAgendamentos] = useState<Record<string, Agendamento[]>>({})
  const [allAgendamentos, setAllAgendamentos] = useState<Record<string, Agendamento[]>>({})
  const [clientes, setClientes] = useState<Array<{ id: string; nome: string }>>([])
  const [servicos, setServicos] = useState<Array<{ id: string; nome: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAgendamentoModal, setShowAgendamentoModal] = useState(false)
  const [showDetalhesModal, setShowDetalhesModal] = useState(false)
  const [selectedAgendamentoId, setSelectedAgendamentoId] = useState<string | null>(null)
  const [agendamentoModalMode, setAgendamentoModalMode] = useState<'create' | 'edit'>('create')
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([])
  const [modalInitialData, setModalInitialData] = useState<{
    clienteId?: string | null
    data?: string | null
    horario?: string | null
  }>({})

  const usuario = getUserSession()
  const acessoExpirado = isAccessExpired(usuario)

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, message, type }])
  }

  const handleNovoAgendamentoClick = () => {
    if (acessoExpirado) {
      addToast('Seu acesso expirou. Você pode apenas visualizar os dados existentes. Entre em contato com o administrador para renovar seu acesso.', 'warning')
      return
    }
    const dateStr = selectedDate.toISOString().split('T')[0]
    setAgendamentoModalMode('create')
    setSelectedAgendamentoId(null)
    setModalInitialData({ data: dateStr })
    setShowAgendamentoModal(true)
  }

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroCliente, setFiltroCliente] = useState<string>('')
  const [filtroServico, setFiltroServico] = useState<string>('')
  const [buscaTexto, setBuscaTexto] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadAgendamentos()
  }, [selectedDate, config]) // Recarregar quando configurações mudarem

  useEffect(() => {
    applyFilters(allAgendamentos)
  }, [filtroStatus, filtroCliente, filtroServico, buscaTexto, allAgendamentos])

  const applyFilters = (agendamentosData: Record<string, Agendamento[]>) => {
    if (!agendamentosData || Object.keys(agendamentosData).length === 0) {
      setAgendamentos({})
      return
    }

    const filtered: Record<string, Agendamento[]> = {}

    Object.keys(agendamentosData).forEach((horario) => {
      const ags = agendamentosData[horario].filter((ag) => {
        // Filtro por status
        if (filtroStatus !== 'todos' && ag.status !== filtroStatus) {
          return false
        }

        // Filtro por cliente
        if (filtroCliente && ag.clienteId !== filtroCliente) {
          return false
        }

        // Filtro por serviço
        if (filtroServico && ag.servicoId !== filtroServico) {
          return false
        }

        // Busca por texto (nome do cliente ou serviço)
        if (buscaTexto) {
          const buscaLower = buscaTexto.toLowerCase()
          const clienteMatch = ag.cliente.toLowerCase().includes(buscaLower)
          const servicoMatch = ag.servico.toLowerCase().includes(buscaLower)
          if (!clienteMatch && !servicoMatch) {
            return false
          }
        }

        return true
      })

      if (ags.length > 0) {
        filtered[horario] = ags
      }
    })

    setAgendamentos(filtered)
  }

  const clearFilters = () => {
    setFiltroStatus('todos')
    setFiltroCliente('')
    setFiltroServico('')
    setBuscaTexto('')
  }

  const loadAgendamentos = async () => {
    setIsLoading(true)
    try {
      // Formatar data para busca
      const dateStr = selectedDate.toISOString().split('T')[0]

      // Buscar agendamentos do dia no Firestore
      const agendamentosDoDia = await agendamentosService.getByDate(dateStr)
      console.log('🔍 Agendamentos do dia:', agendamentosDoDia.length, agendamentosDoDia)

      // Buscar dados de clientes e serviços
      const [clientesData, servicosData] = await Promise.all([
        clientesService.getAll(),
        servicosService.getAll(),
      ])

      setClientes(clientesData.map((c: any) => ({ id: c.id, nome: c.nome })))
      setServicos(servicosData.map((s: any) => ({ id: s.id, nome: s.nome })))

      // Primeiro, mapear todos os agendamentos com dados completos
      const todosAgendamentos: Agendamento[] = agendamentosDoDia.map((ag: any) => {
        const cliente = clientesData.find((c: any) => c.id === ag.clienteId)
        const servico = servicosData.find((s: any) => s.id === ag.servicoId)

        return {
          id: ag.id,
          cliente: cliente?.nome || 'Cliente',
          servico: servico?.nome || ag.servicoNome || 'Serviço',
          horario: ag.horario || '',
          status: ag.status,
          clienteId: ag.clienteId,
          servicoId: ag.servicoId,
        }
      })

      // Ordenar por horário
      todosAgendamentos.sort((a, b) => a.horario.localeCompare(b.horario))

      // Agrupar agendamentos consecutivos do mesmo cliente e serviço
      const agendamentosAgrupados: (Agendamento | AgendamentoAgrupado)[] = []
      const processados = new Set<string>()

      for (let i = 0; i < todosAgendamentos.length; i++) {
        if (processados.has(todosAgendamentos[i].id)) continue

        const agendamentoAtual = todosAgendamentos[i]
        const grupo: Agendamento[] = [agendamentoAtual]
        processados.add(agendamentoAtual.id)

        // Verificar se há agendamentos consecutivos (mesmo cliente, serviço, diferença de 30 minutos)
        for (let j = i + 1; j < todosAgendamentos.length; j++) {
          const proximo = todosAgendamentos[j]

          if (
            !processados.has(proximo.id) &&
            proximo.clienteId === agendamentoAtual.clienteId &&
            proximo.servicoId === agendamentoAtual.servicoId
          ) {
            // Verificar se é consecutivo (diferença de 30 minutos)
            const horarioAtual = agendamentoAtual.horario.split(':').map(Number)
            const horarioProximo = proximo.horario.split(':').map(Number)

            if (horarioAtual.length === 2 && horarioProximo.length === 2) {
              const minutosProximo = horarioProximo[0] * 60 + horarioProximo[1]

              // Verificar se o último horário do grupo é 30 minutos antes do próximo
              const ultimoHorario = grupo[grupo.length - 1].horario.split(':').map(Number)
              const minutosUltimo = ultimoHorario[0] * 60 + ultimoHorario[1]

              if (minutosProximo - minutosUltimo === 30) {
                grupo.push(proximo)
                processados.add(proximo.id)
              } else {
                break
              }
            } else {
              break
            }
          } else {
            break
          }
        }

        // Se houver múltiplos agendamentos, criar um grupo
        if (grupo.length > 1) {
          agendamentosAgrupados.push({
            ids: grupo.map(g => g.id),
            cliente: grupo[0].cliente,
            servico: grupo[0].servico,
            horarios: grupo.map(g => g.horario).sort(),
            status: grupo[0].status, // Usar status do primeiro (ou poderia verificar se todos são iguais)
            isAgrupado: true,
          })
        } else {
          // Agendamento individual
          agendamentosAgrupados.push(grupo[0])
        }
      }

      // Organizar por horário para exibição
      const agendamentosPorHorario: Record<string, (Agendamento | AgendamentoAgrupado)[]> = {}

      agendamentosAgrupados.forEach((ag) => {
        if ('isAgrupado' in ag && ag.isAgrupado) {
          // Para agendamentos agrupados, adicionar ao primeiro horário
          const primeiroHorario = ag.horarios[0]
          if (agendamentosPorHorario[primeiroHorario]) {
            agendamentosPorHorario[primeiroHorario].push(ag)
          } else {
            agendamentosPorHorario[primeiroHorario] = [ag]
          }
        } else {
          // Agendamento individual
          const horarioKey = (ag as Agendamento).horario
          if (agendamentosPorHorario[horarioKey]) {
            agendamentosPorHorario[horarioKey].push(ag)
          } else {
            agendamentosPorHorario[horarioKey] = [ag]
          }
        }
      })

      console.log('📋 Agendamentos por horário (agrupados):', agendamentosPorHorario)
      setAllAgendamentos(agendamentosPorHorario as any)
      applyFilters(agendamentosPorHorario as any)
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatDateHeader = (date: Date): string => {
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' })
    const day = date.toLocaleDateString('pt-BR', { day: '2-digit' })
    const month = date.toLocaleDateString('pt-BR', { month: 'long' })
    const year = date.toLocaleDateString('pt-BR', { year: 'numeric' })

    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day} de ${month} de ${year}`
  }

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  const isToday = (date: Date): boolean => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isPast = (time: string): boolean => {
    if (!isToday(selectedDate)) {
      return selectedDate < new Date()
    }

    const [hours, minutes] = time.split(':').map(Number)
    const now = new Date()
    const timeDate = new Date(selectedDate)
    timeDate.setHours(hours, minutes, 0, 0)

    return timeDate < now
  }

  const isCurrent = (time: string): boolean => {
    if (!isToday(selectedDate)) return false

    const [hours, minutes] = time.split(':').map(Number)
    const now = new Date()
    const timeDate = new Date(selectedDate)
    timeDate.setHours(hours, minutes, 0, 0)

    const diff = Math.abs(now.getTime() - timeDate.getTime())
    return diff < 30 * 60 * 1000 // 30 minutos
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

  const handleTimeSlotClick = (time: string) => {
    if (acessoExpirado) {
      addToast('Seu acesso expirou. Você pode apenas visualizar os dados existentes. Entre em contato com o administrador para renovar seu acesso.', 'warning')
      return
    }
    if (!agendamentos[time] || agendamentos[time].length === 0) {
      const dateStr = selectedDate.toISOString().split('T')[0]
      setModalInitialData({
        data: dateStr,
        horario: time,
      })
      setShowAgendamentoModal(true)
    }
  }

  const handleAgendamentoClick = (agendamento: Agendamento) => {
    setSelectedAgendamentoId(agendamento.id)
    setShowDetalhesModal(true)
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


  return (
    <div className="agenda-dia">
      {/* Cabeçalho */}
      <div className="agenda-header">
        <div className="agenda-header-top">
          <h1 className="agenda-title">Agenda</h1>
          <div className="agenda-header-actions">
            <AgendaViewToggle />
            <button
              className={`btn-primary ${acessoExpirado ? 'disabled' : ''}`}
              onClick={handleNovoAgendamentoClick}
              title={acessoExpirado ? 'Seu acesso expirou. Você pode apenas visualizar os dados existentes.' : ''}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Novo Agendamento
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="agenda-filters-section">
          <button
            className="btn-filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            Filtros
            {(filtroStatus !== 'todos' || filtroCliente || filtroServico || buscaTexto) && (
              <span className="filter-badge">
                {[filtroStatus !== 'todos' ? 1 : 0, filtroCliente ? 1 : 0, filtroServico ? 1 : 0, buscaTexto ? 1 : 0].reduce((a, b) => a + b, 0)}
              </span>
            )}
          </button>

          {showFilters && (
            <div className="filters-panel">
              <div className="filters-grid">
                <div className="filter-group">
                  <label htmlFor="filtro-status" className="filter-label">Status</label>
                  <select
                    id="filtro-status"
                    className="filter-select"
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                  >
                    <option value="todos">Todos</option>
                    <option value="agendado">Agendado</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="filtro-cliente" className="filter-label">Cliente</label>
                  <select
                    id="filtro-cliente"
                    className="filter-select"
                    value={filtroCliente}
                    onChange={(e) => setFiltroCliente(e.target.value)}
                  >
                    <option value="">Todos os clientes</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="filtro-servico" className="filter-label">Serviço</label>
                  <select
                    id="filtro-servico"
                    className="filter-select"
                    value={filtroServico}
                    onChange={(e) => setFiltroServico(e.target.value)}
                  >
                    <option value="">Todos os serviços</option>
                    {servicos.map((servico) => (
                      <option key={servico.id} value={servico.id}>
                        {servico.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group filter-group-full">
                  <label htmlFor="busca-texto" className="filter-label">Buscar</label>
                  <input
                    type="text"
                    id="busca-texto"
                    className="filter-input"
                    placeholder="Buscar por cliente ou serviço..."
                    value={buscaTexto}
                    onChange={(e) => setBuscaTexto(e.target.value)}
                  />
                </div>
              </div>

              {(filtroStatus !== 'todos' || filtroCliente || filtroServico || buscaTexto) && (
                <button className="btn-clear-filters" onClick={clearFilters}>
                  Limpar Filtros
                </button>
              )}
            </div>
          )}
        </div>

        <div className="agenda-date-controls">
          <button className="btn-nav" onClick={goToPreviousDay}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Dia Anterior
          </button>

          <div className="date-display">
            <h2 className="date-text">{formatDateHeader(selectedDate)}</h2>
            <span className="date-formatted">{formatDate(selectedDate)}</span>
          </div>

          <div className="date-actions">
            <button className="btn-today" onClick={goToToday}>
              Hoje
            </button>
            <button className="btn-nav" onClick={goToNextDay}>
              Próximo Dia
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Grade de Horários */}
      {isLoading ? (
        <div className="agenda-loading">
          <div className="spinner-large"></div>
          <p>Carregando agendamentos...</p>
        </div>
      ) : (
        <div className="agenda-grid">
          {timeSlots.map((time) => {
            const agendamentosNoHorario = agendamentos[time] || []
            const temAgendamento = agendamentosNoHorario.length > 0

            // Verificar se este horário está ocupado por um agendamento agrupado que começa em outro horário
            let ocupadoPorAgrupado = false
            if (!temAgendamento) {
              // Verificar se algum agendamento agrupado ocupa este horário
              for (const horarioKey in agendamentos) {
                const ags = agendamentos[horarioKey]
                for (const ag of ags) {
                  if ('isAgrupado' in ag && ag.isAgrupado) {
                    const agrupado = ag as unknown as AgendamentoAgrupado
                    if (agrupado.horarios.includes(time) && agrupado.horarios[0] !== time) {
                      ocupadoPorAgrupado = true
                      break
                    }
                  }
                }
                if (ocupadoPorAgrupado) break
              }
            }

            const past = isPast(time)
            const current = isCurrent(time)
            const temAlgumAgendamento = temAgendamento || ocupadoPorAgrupado

            return (
              <div
                key={time}
                className={`time-slot ${past ? 'time-past' : ''} ${current ? 'time-current' : ''} ${temAlgumAgendamento ? 'has-agendamento' : ''} ${ocupadoPorAgrupado ? 'ocupado-agrupado' : ''}`}
                onClick={() => !ocupadoPorAgrupado && handleTimeSlotClick(time)}
              >
                <div className="time-label">{time}</div>
                {temAgendamento ? (
                  <div className="agendamentos-list">
                    {agendamentosNoHorario.map((agendamento, index) => {
                      // Verificar se é um agendamento agrupado
                      const isAgrupado = 'isAgrupado' in agendamento && agendamento.isAgrupado

                      if (isAgrupado) {
                        const agrupado = agendamento as unknown as AgendamentoAgrupado
                        const primeiroHorario = agrupado.horarios[0]
                        const ultimoHorario = agrupado.horarios[agrupado.horarios.length - 1]
                        const horarioDisplay = agrupado.horarios.length > 1
                          ? `${primeiroHorario} - ${ultimoHorario}`
                          : primeiroHorario

                        return (
                          <div
                            key={`agrupado-${agrupado.ids.join('-')}-${index}`}
                            className="agendamento-card agendamento-agrupado"
                            onClick={(e) => {
                              e.stopPropagation()
                              // Usar o primeiro ID para abrir o modal
                              handleAgendamentoClick({ id: agrupado.ids[0] } as Agendamento)
                            }}
                          >
                            <div className="agendamento-header">
                              <h3 className="agendamento-cliente">{agrupado.cliente}</h3>
                              {getStatusBadge(agrupado.status)}
                            </div>
                            <p className="agendamento-servico">{agrupado.servico}</p>
                            <p className="agendamento-horario">
                              {horarioDisplay}
                              {agrupado.horarios.length > 1 && (
                                <span className="horarios-count"> ({agrupado.horarios.length} horários)</span>
                              )}
                            </p>
                          </div>
                        )
                      } else {
                        const individual = agendamento as Agendamento
                        return (
                          <div
                            key={individual.id}
                            className="agendamento-card"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAgendamentoClick(individual)
                            }}
                          >
                            <div className="agendamento-header">
                              <h3 className="agendamento-cliente">{individual.cliente}</h3>
                              {getStatusBadge(individual.status)}
                            </div>
                            <p className="agendamento-servico">{individual.servico}</p>
                            <p className="agendamento-horario">{individual.horario}</p>
                          </div>
                        )
                      }
                    })}
                  </div>
                ) : ocupadoPorAgrupado ? (
                  <div className="time-slot-ocupado">
                    <span>Ocupado</span>
                  </div>
                ) : (
                  <div className="time-slot-empty">
                    <span>Disponível</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Agendamento */}
      <AgendamentoModal
        isOpen={showAgendamentoModal}
        mode={agendamentoModalMode}
        agendamentoId={agendamentoModalMode === 'edit' ? selectedAgendamentoId : null}
        initialData={modalInitialData.data || null}
        initialHorario={modalInitialData.horario || null}
        initialClienteId={modalInitialData.clienteId || null}
        onClose={() => {
          setShowAgendamentoModal(false)
          setModalInitialData({})
          setSelectedAgendamentoId(null)
          setAgendamentoModalMode('create')
        }}
        onSuccess={() => {
          loadAgendamentos()
          setShowAgendamentoModal(false)
          setModalInitialData({})
          setSelectedAgendamentoId(null)
          setAgendamentoModalMode('create')
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
        onEdit={(id) => {
          if (acessoExpirado) {
            addToast('Seu acesso expirou. Você pode apenas visualizar os dados existentes. Entre em contato com o administrador para renovar seu acesso.', 'warning')
            return
          }
          setSelectedAgendamentoId(id)
          setAgendamentoModalMode('edit')
          setShowDetalhesModal(false)
          setShowAgendamentoModal(true)
        }}
        onDelete={() => {
          loadAgendamentos()
        }}
        onStatusChange={() => {
          loadAgendamentos()
        }}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  )
}

export default AgendaDia

