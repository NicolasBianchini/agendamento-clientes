import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientesService, agendamentosService, servicosService } from '../services/firestore'
import { getUserSession, isAccessExpired } from '../services/auth'
import { useConfiguracoes } from '../hooks/useConfiguracoes'
import { formatarMoeda } from '../utils/formatacao'
import NovoClienteModal from '../components/NovoClienteModal'
import AgendamentoModal from '../components/AgendamentoModal'
import AgendamentoDetalhesModal from '../components/AgendamentoDetalhesModal'
import ToastContainer from '../components/ToastContainer'
import type { ToastType } from '../components/Toast'
import './Dashboard.css'

interface StatCard {
  title: string
  value: string | number
  icon: React.JSX.Element
  color: string
}

interface Appointment {
  id: string
  cliente: string
  servico: string
  data: string
  horario: string | string[] // Pode ser um único horário ou array de horários
  status: 'agendado' | 'concluido' | 'cancelado'
  ids?: string[] // IDs dos agendamentos agrupados
}

function Dashboard() {
  const { config } = useConfiguracoes()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [showNovoClienteModal, setShowNovoClienteModal] = useState(false)
  const [showAgendamentoModal, setShowAgendamentoModal] = useState(false)
  const [showDetalhesModal, setShowDetalhesModal] = useState(false)
  const [selectedAgendamentoId, setSelectedAgendamentoId] = useState<string | null>(null)
  const [agendamentoModalMode, setAgendamentoModalMode] = useState<'create' | 'edit'>('create')
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([])
  const [stats, setStats] = useState({
    totalClientes: 0,
    agendamentosHoje: 0,
    agendamentosSemana: 0,
    faturadoHoje: 0,
  })
  const [proximosAgendamentos, setProximosAgendamentos] = useState<Appointment[]>([])

  const usuario = getUserSession()
  const acessoExpirado = isAccessExpired(usuario)

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, message, type }])
  }

  const handleNovoClienteClick = () => {
    if (acessoExpirado) {
      addToast('Seu acesso expirou. Você pode apenas visualizar os dados existentes. Entre em contato com o administrador para renovar seu acesso.', 'warning')
      return
    }
    setShowNovoClienteModal(true)
  }

  const handleNovoAgendamentoClick = () => {
    if (acessoExpirado) {
      addToast('Seu acesso expirou. Você pode apenas visualizar os dados existentes. Entre em contato com o administrador para renovar seu acesso.', 'warning')
      return
    }
    setAgendamentoModalMode('create')
    setSelectedAgendamentoId(null)
    setShowAgendamentoModal(true)
  }

  const loadData = async () => {
    setIsLoading(true)

    try {
      // Buscar dados do Firestore
      const [clientes, todosAgendamentos, servicos] = await Promise.all([
        clientesService.getAll(),
        agendamentosService.getAll(),
        servicosService.getAll(),
      ])

      // Calcular estatísticas
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      const hojeStr = hoje.toISOString().split('T')[0]

      const fimSemana = new Date(hoje)
      fimSemana.setDate(hoje.getDate() + 7)
      const fimSemanaStr = fimSemana.toISOString().split('T')[0]

      // Função auxiliar para converter data do Firestore para string YYYY-MM-DD
      const getDateString = (agData: any): string => {
        if (!agData) return ''

        // Se for Timestamp do Firestore
        if (agData.toDate && typeof agData.toDate === 'function') {
          return agData.toDate().toISOString().split('T')[0]
        }

        // Se for Date
        if (agData instanceof Date) {
          return agData.toISOString().split('T')[0]
        }

        // Se for string
        if (typeof agData === 'string') {
          return agData.split('T')[0]
        }

        return ''
      }

      // Função para agrupar agendamentos consecutivos
      const agruparAgendamentos = (agendamentos: any[]): any[] => {
        const agrupados: any[] = []
        const processados = new Set<string>()

        for (let i = 0; i < agendamentos.length; i++) {
          if (processados.has(agendamentos[i].id)) continue

          const agendamentoAtual = agendamentos[i]
          const grupo: any[] = [agendamentoAtual]
          processados.add(agendamentoAtual.id)

          // Verificar se há agendamentos consecutivos (mesmo cliente, serviço e data)
          for (let j = i + 1; j < agendamentos.length; j++) {
            const proximoAgendamento = agendamentos[j]

            if (
              !processados.has(proximoAgendamento.id) &&
              proximoAgendamento.clienteId === agendamentoAtual.clienteId &&
              proximoAgendamento.servicoId === agendamentoAtual.servicoId &&
              getDateString(proximoAgendamento.data) === getDateString(agendamentoAtual.data)
            ) {
              // Verificar se é consecutivo (diferença de 30 minutos)
              const horarioAtual = (agendamentoAtual.horario || '').split(':').map(Number)
              const horarioProximo = (proximoAgendamento.horario || '').split(':').map(Number)

              if (horarioAtual.length === 2 && horarioProximo.length === 2) {
                const minutosProximo = horarioProximo[0] * 60 + horarioProximo[1]

                // Verificar se o último horário do grupo é 30 minutos antes do próximo
                const ultimoHorario = (grupo[grupo.length - 1].horario || '').split(':').map(Number)
                const minutosUltimo = ultimoHorario[0] * 60 + ultimoHorario[1]

                if (minutosProximo - minutosUltimo === 30) {
                  grupo.push(proximoAgendamento)
                  processados.add(proximoAgendamento.id)
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

          // Adicionar apenas um agendamento agrupado (ou individual)
          agrupados.push(grupo[0])
        }

        return agrupados
      }

      // Filtrar e agrupar agendamentos de hoje
      const agendamentosHojeFiltrados = todosAgendamentos
        .filter((ag: any) => {
          const agDateStr = getDateString(ag.data)
          return agDateStr === hojeStr && ag.status === 'agendado'
        })
        .sort((a: any, b: any) => {
          const dateAStr = getDateString(a.data)
          const dateBStr = getDateString(b.data)

          if (dateAStr !== dateBStr) {
            return dateAStr.localeCompare(dateBStr)
          }

          return (a.horario || '').localeCompare(b.horario || '')
        })

      const agendamentosHoje = agruparAgendamentos(agendamentosHojeFiltrados)

      // Filtrar e agrupar agendamentos da semana
      const agendamentosSemanaFiltrados = todosAgendamentos
        .filter((ag: any) => {
          const agDateStr = getDateString(ag.data)
          return agDateStr >= hojeStr && agDateStr <= fimSemanaStr && ag.status === 'agendado'
        })
        .sort((a: any, b: any) => {
          const dateAStr = getDateString(a.data)
          const dateBStr = getDateString(b.data)

          if (dateAStr !== dateBStr) {
            return dateAStr.localeCompare(dateBStr)
          }

          return (a.horario || '').localeCompare(b.horario || '')
        })

      const agendamentosSemana = agruparAgendamentos(agendamentosSemanaFiltrados)

      // Calcular faturado hoje (agendamentos concluídos hoje)
      const concluidosHoje = todosAgendamentos.filter((ag: any) => {
        if (ag.status !== 'concluido') return false

        const agDateStr = getDateString(ag.data)
        return agDateStr === hojeStr
      })

      const faturadoHoje = concluidosHoje.reduce((total: number, ag: any) => {
        const servico = servicos.find((s: any) => s.id === ag.servicoId)
        return total + (servico?.valor || ag.servicoValor || 0)
      }, 0)

      setStats({
        totalClientes: clientes.length,
        agendamentosHoje: agendamentosHoje.length,
        agendamentosSemana: agendamentosSemana.length,
        faturadoHoje,
      })

      // Buscar próximos agendamentos (próximos 5 agendados)
      const agendamentosFuturos = todosAgendamentos
        .filter((ag: any) => {
          const agDateStr = getDateString(ag.data)
          return agDateStr >= hojeStr && ag.status === 'agendado'
        })
        .sort((a: any, b: any) => {
          const dateAStr = getDateString(a.data)
          const dateBStr = getDateString(b.data)

          if (dateAStr !== dateBStr) {
            return dateAStr.localeCompare(dateBStr)
          }

          // Se for o mesmo dia, ordenar por horário
          return (a.horario || '').localeCompare(b.horario || '')
        })
        .map((ag: any) => {
          const servico = servicos.find((s: any) => s.id === ag.servicoId)
          const cliente = clientes.find((c: any) => c.id === ag.clienteId)

          return {
            id: ag.id,
            clienteId: ag.clienteId,
            cliente: cliente?.nome || 'Cliente',
            servicoId: ag.servicoId,
            servico: servico?.nome || ag.servicoNome || 'Serviço',
            data: getDateString(ag.data),
            horario: ag.horario || '',
            status: ag.status,
          }
        })

      // Agrupar agendamentos consecutivos do mesmo cliente, serviço e data
      const agendamentosAgrupados: Appointment[] = []
      const processados = new Set<string>()

      for (let i = 0; i < agendamentosFuturos.length; i++) {
        if (processados.has(agendamentosFuturos[i].id)) continue

        const agendamentoAtual = agendamentosFuturos[i]
        const grupo: typeof agendamentosFuturos = [agendamentoAtual]
        processados.add(agendamentoAtual.id)

        // Verificar se há agendamentos consecutivos (mesmo cliente, serviço e data)
        for (let j = i + 1; j < agendamentosFuturos.length; j++) {
          const proximoAgendamento = agendamentosFuturos[j]

          if (
            !processados.has(proximoAgendamento.id) &&
            proximoAgendamento.clienteId === agendamentoAtual.clienteId &&
            proximoAgendamento.servicoId === agendamentoAtual.servicoId &&
            proximoAgendamento.data === agendamentoAtual.data
          ) {
            // Verificar se é consecutivo (diferença de 30 minutos)
            const horarioProximo = proximoAgendamento.horario.split(':').map(Number)
            const minutosProximo = horarioProximo[0] * 60 + horarioProximo[1]

            // Verificar se o último horário do grupo é 30 minutos antes do próximo
            const ultimoHorario = grupo[grupo.length - 1].horario.split(':').map(Number)
            const minutosUltimo = ultimoHorario[0] * 60 + ultimoHorario[1]

            if (minutosProximo - minutosUltimo === 30) {
              grupo.push(proximoAgendamento)
              processados.add(proximoAgendamento.id)
            } else {
              break
            }
          } else {
            break
          }
        }

        // Criar card agrupado ou individual
        if (grupo.length > 1) {
          // Múltiplos horários consecutivos
          agendamentosAgrupados.push({
            id: grupo[0].id,
            ids: grupo.map(g => g.id),
            cliente: grupo[0].cliente,
            servico: grupo[0].servico,
            data: grupo[0].data,
            horario: grupo.map(g => g.horario).sort(),
            status: grupo[0].status,
          })
        } else {
          // Agendamento individual
          agendamentosAgrupados.push({
            id: grupo[0].id,
            cliente: grupo[0].cliente,
            servico: grupo[0].servico,
            data: grupo[0].data,
            horario: grupo[0].horario,
            status: grupo[0].status,
          })
        }
      }

      const proximos = agendamentosAgrupados.slice(0, 5)

      setProximosAgendamentos(proximos)
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Usar formatarMoeda com configurações do usuário

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    })
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

  const statCards: StatCard[] = [
    {
      title: 'Total de Clientes',
      value: stats.totalClientes,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
      color: 'primary',
    },
    {
      title: 'Agendamentos Hoje',
      value: stats.agendamentosHoje,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      ),
      color: 'secondary',
    },
    {
      title: 'Esta Semana',
      value: stats.agendamentosSemana,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      ),
      color: 'accent',
    },
    {
      title: 'Faturado Hoje',
      value: formatarMoeda(stats.faturadoHoje, config),
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      ),
      color: 'success',
    },
  ]

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner-large"></div>
        <p>Carregando dados...</p>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">Visão geral do seu negócio</p>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="stats-grid">
        {statCards.map((card, index) => (
          <div key={index} className={`stat-card stat-card-${card.color}`}>
            <div className="stat-card-icon">{card.icon}</div>
            <div className="stat-card-content">
              <h3 className="stat-card-title">{card.title}</h3>
              <p className="stat-card-value">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-content">
        {/* Próximos Agendamentos */}
        <section className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Próximos Agendamentos</h2>
            <button
              className="section-link"
              onClick={() => navigate('/agenda')}
            >
              Ver todos
            </button>
          </div>

          {proximosAgendamentos.length === 0 ? (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <p>Nenhum agendamento próximo</p>
            </div>
          ) : (
            <div className="appointments-list">
              {proximosAgendamentos.map((appointment) => {
                const horarios = Array.isArray(appointment.horario)
                  ? appointment.horario
                  : [appointment.horario]
                const primeiroHorario = horarios[0]
                const ultimoHorario = horarios[horarios.length - 1]
                const horarioDisplay = horarios.length > 1
                  ? `${primeiroHorario} - ${ultimoHorario}`
                  : primeiroHorario

                return (
                  <div
                    key={appointment.id}
                    className="appointment-card"
                    onClick={() => {
                      // Se houver múltiplos IDs, usar o primeiro para abrir o modal
                      setSelectedAgendamentoId(appointment.id)
                      setShowDetalhesModal(true)
                    }}
                  >
                    <div className="appointment-time">
                      <span className="appointment-hour">
                        {horarioDisplay}
                        {horarios.length > 1 && (
                          <span className="horarios-count">({horarios.length} horários)</span>
                        )}
                      </span>
                      <span className="appointment-date">{formatDate(appointment.data)}</span>
                    </div>
                    <div className="appointment-info">
                      <h3 className="appointment-client">{appointment.cliente}</h3>
                      <p className="appointment-service">{appointment.servico}</p>
                    </div>
                    <div className="appointment-status">
                      {getStatusBadge(appointment.status)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Ações Rápidas */}
        <section className="dashboard-section">
          <h2 className="section-title">Ações Rápidas</h2>
          <div className="quick-actions">
            <button
              className="quick-action-btn"
              onClick={handleNovoClienteClick}
              disabled={acessoExpirado}
              title={acessoExpirado ? 'Seu acesso expirou. Você pode apenas visualizar os dados existentes.' : ''}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Novo Cliente</span>
            </button>
            <button
              className="quick-action-btn"
              onClick={handleNovoAgendamentoClick}
              disabled={acessoExpirado}
              title={acessoExpirado ? 'Seu acesso expirou. Você pode apenas visualizar os dados existentes.' : ''}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Novo Agendamento</span>
            </button>
            <button
              className="quick-action-btn"
              onClick={() => navigate('/agenda')}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>Ver Agenda</span>
            </button>
          </div>
        </section>
      </div>

      {/* Modal de Novo Cliente */}
      <NovoClienteModal
        isOpen={showNovoClienteModal}
        onClose={() => setShowNovoClienteModal(false)}
        onSuccess={() => {
          loadData()
        }}
      />

      {/* Modal de Agendamento */}
      <AgendamentoModal
        isOpen={showAgendamentoModal}
        mode={agendamentoModalMode}
        agendamentoId={agendamentoModalMode === 'edit' ? selectedAgendamentoId : null}
        onClose={() => {
          setShowAgendamentoModal(false)
          setSelectedAgendamentoId(null)
          setAgendamentoModalMode('create')
        }}
        onSuccess={() => {
          loadData()
          setShowAgendamentoModal(false)
          setSelectedAgendamentoId(null)
          setAgendamentoModalMode('create')
        }}
      />

      {/* Modal de Detalhes do Agendamento */}
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
          loadData()
        }}
        onStatusChange={() => {
          loadData()
        }}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  )
}

export default Dashboard
