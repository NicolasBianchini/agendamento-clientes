import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  clientesService,
  agendamentosService,
  servicosService,
  estabelecimentosService,
  profissionalServicosService,
} from '../services/firestore'
import { getUserSession, isAccessExpired, isAdmin, isProfissional, isProprietario } from '../services/auth'
import { useConfiguracoes } from '../hooks/useConfiguracoes'
import { formatarMoeda, gerarLinkWhatsApp } from '../utils/formatacao'
import { listarProfissionaisDisponiveis } from '../services/usuarios'
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
  horario: string | string[]
  status: 'agendado' | 'concluido' | 'cancelado'
  ids?: string[]
}

function Dashboard() {
  const { config } = useConfiguracoes()
  const navigate = useNavigate()
  const usuario = getUserSession()
  const acessoExpirado = isAccessExpired(usuario)
  const usuarioAdmin = isAdmin(usuario)
  const usuarioProfissional = isProfissional(usuario)
  const usuarioProprietario = isProprietario(usuario)
  const podeGerirCadastros = usuarioAdmin && !usuarioProfissional
  const adminSemContextoOperacional = usuarioAdmin && !usuarioProprietario && !usuarioProfissional
  const podeOperarAgenda = usuarioProfissional || usuarioProprietario

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
  const [historicoRecente, setHistoricoRecente] = useState<Appointment[]>([])
  const [estabelecimentoAtual, setEstabelecimentoAtual] = useState<any | null>(null)
  const [profissionaisVinculados, setProfissionaisVinculados] = useState<any[]>([])
  const [clientesDaUnidade, setClientesDaUnidade] = useState<any[]>([])
  const [servicosVinculados, setServicosVinculados] = useState<any[]>([])
  const [servicosDoProfissional, setServicosDoProfissional] = useState<any[]>([])

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

  const handleSuporteClick = () => {
    if (acessoExpirado) {
      addToast('Seu acesso expirou. Você pode apenas visualizar os dados existentes. Entre em contato com o administrador para renovar seu acesso.', 'warning')
      return
    }
    if (config?.whatsappSuporte) {
      const link = gerarLinkWhatsApp(config.whatsappSuporte, 'Olá! Preciso de suporte.')
      window.open(link, '_blank')
    }
  }

  const handleVerAgendaClick = () => {
    if (acessoExpirado) {
      addToast('Seu acesso expirou. Você pode apenas visualizar os dados existentes. Entre em contato com o administrador para renovar seu acesso.', 'warning')
      return
    }
    navigate('/agenda')
  }

  const temWhatsappSuporte = config?.whatsappSuporte && config.whatsappSuporte.trim() !== ''

  const getDateString = (agData: any): string => {
    if (!agData) return ''
    if (agData.toDate && typeof agData.toDate === 'function') {
      return agData.toDate().toISOString().split('T')[0]
    }
    if (agData instanceof Date) {
      return agData.toISOString().split('T')[0]
    }
    if (typeof agData === 'string') {
      return agData.split('T')[0]
    }
    return ''
  }

  const agruparAgendamentos = (agendamentos: any[]) => {
    const agrupados: any[] = []
    const processados = new Set<string>()

    for (let i = 0; i < agendamentos.length; i++) {
      if (processados.has(agendamentos[i].id)) continue

      const atual = agendamentos[i]
      const grupo: any[] = [atual]
      processados.add(atual.id)

      for (let j = i + 1; j < agendamentos.length; j++) {
        const proximo = agendamentos[j]

        if (
          !processados.has(proximo.id) &&
          proximo.clienteId === atual.clienteId &&
          proximo.servicoId === atual.servicoId &&
          getDateString(proximo.data) === getDateString(atual.data)
        ) {
          const horarioAtual = (grupo[grupo.length - 1].horario || '').split(':').map(Number)
          const horarioProximo = (proximo.horario || '').split(':').map(Number)

          if (horarioAtual.length === 2 && horarioProximo.length === 2) {
            const minutosAtual = horarioAtual[0] * 60 + horarioAtual[1]
            const minutosProximo = horarioProximo[0] * 60 + horarioProximo[1]

            if (minutosProximo - minutosAtual === 30) {
              grupo.push(proximo)
              processados.add(proximo.id)
            } else {
              break
            }
          }
        } else {
          break
        }
      }

      agrupados.push(grupo)
    }

    return agrupados
  }

  const loadData = async () => {
    setIsLoading(true)

    try {
      const [clientes, todosAgendamentos, servicos] = await Promise.all([
        clientesService.getAll(),
        agendamentosService.getAll(),
        servicosService.getAll(),
      ])

      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      const hojeStr = hoje.toISOString().split('T')[0]

      const fimSemana = new Date(hoje)
      fimSemana.setDate(hoje.getDate() + 7)
      const fimSemanaStr = fimSemana.toISOString().split('T')[0]

      const agendamentosHoje = todosAgendamentos.filter((ag: any) => {
        const data = getDateString(ag.data)
        return data === hojeStr && ag.status === 'agendado'
      })

      const agendamentosSemana = todosAgendamentos.filter((ag: any) => {
        const data = getDateString(ag.data)
        return data >= hojeStr && data <= fimSemanaStr && ag.status === 'agendado'
      })

      const concluidosHoje = todosAgendamentos.filter((ag: any) => {
        const data = getDateString(ag.data)
        return data === hojeStr && ag.status === 'concluido'
      })

      const faturadoHoje = concluidosHoje.reduce((total: number, ag: any) => {
        const servico = servicos.find((item: any) => item.id === ag.servicoId)
        return total + (servico?.valor || ag.servicoValor || 0)
      }, 0)

      const totalClientes = usuarioProfissional
        ? new Set(todosAgendamentos.map((ag: any) => ag.clienteId).filter(Boolean)).size
        : clientes.length

      setClientesDaUnidade(clientes)

      setStats({
        totalClientes,
        agendamentosHoje: agruparAgendamentos(
          agendamentosHoje.sort((a: any, b: any) => (a.horario || '').localeCompare(b.horario || ''))
        ).length,
        agendamentosSemana: agruparAgendamentos(
          agendamentosSemana.sort((a: any, b: any) => {
            const dateA = getDateString(a.data)
            const dateB = getDateString(b.data)
            return dateA === dateB
              ? (a.horario || '').localeCompare(b.horario || '')
              : dateA.localeCompare(dateB)
          })
        ).length,
        faturadoHoje,
      })

      const agendamentosFuturos = todosAgendamentos
        .filter((ag: any) => getDateString(ag.data) >= hojeStr && ag.status === 'agendado')
        .sort((a: any, b: any) => {
          const dateA = getDateString(a.data)
          const dateB = getDateString(b.data)
          return dateA === dateB
            ? (a.horario || '').localeCompare(b.horario || '')
            : dateA.localeCompare(dateB)
        })

      const proximos = agruparAgendamentos(agendamentosFuturos)
        .map((grupo: any[]) => {
          const primeiro = grupo[0]
          const cliente = clientes.find((item: any) => item.id === primeiro.clienteId)
          const servico = servicos.find((item: any) => item.id === primeiro.servicoId)
          const horarios = grupo.map((item) => item.horario).sort()

          return {
            id: primeiro.id,
            ids: grupo.map((item) => item.id),
            cliente: cliente?.nome || 'Cliente',
            servico: servico?.nome || primeiro.servicoNome || 'Serviço',
            data: getDateString(primeiro.data),
            horario: horarios.length > 1 ? horarios : horarios[0],
            status: primeiro.status,
          } as Appointment
        })
        .slice(0, 5)

      setProximosAgendamentos(proximos)

      const historicoAdministrativo = todosAgendamentos
        .filter((ag: any) => ag.status === 'concluido' || ag.status === 'cancelado')
        .sort((a: any, b: any) => {
          const dateA = getDateString(a.data)
          const dateB = getDateString(b.data)
          return dateA === dateB
            ? String(b.horario || '').localeCompare(String(a.horario || ''))
            : dateB.localeCompare(dateA)
        })
        .slice(0, 5)
        .map((ag: any) => {
          const cliente = clientes.find((item: any) => item.id === ag.clienteId)
          const servico = servicos.find((item: any) => item.id === ag.servicoId)

          return {
            id: ag.id,
            cliente: cliente?.nome || 'Cliente',
            servico: servico?.nome || ag.servicoNome || 'Serviço',
            data: getDateString(ag.data),
            horario: ag.horario || '',
            status: ag.status,
          } as Appointment
        })

      setHistoricoRecente(historicoAdministrativo)

      if (usuario?.estabelecimentoId) {
        const [estabelecimento, profissionais] = await Promise.all([
          estabelecimentosService.getById(usuario.estabelecimentoId),
          listarProfissionaisDisponiveis(usuario.estabelecimentoId),
        ])

        setEstabelecimentoAtual(estabelecimento)
        setProfissionaisVinculados(profissionais.filter((item) => item.role === 'profissional'))
      } else {
        setEstabelecimentoAtual(null)
        setProfissionaisVinculados([])
      }

      setServicosVinculados(servicos.filter((item: any) => item.ativo !== false))

      if (usuarioProfissional && usuario?.id) {
        const vinculos = await profissionalServicosService.getByProfissional(usuario.id)
        setServicosDoProfissional(vinculos)
      } else {
        setServicosDoProfissional([])
      }
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(`${dateString}T00:00:00`)
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
    const statusItem = statusConfig[status as keyof typeof statusConfig] || statusConfig.agendado
    return <span className={`status-badge ${statusItem.class}`}>{statusItem.label}</span>
  }

  const getRoleSubtitle = () => {
    if (usuarioProfissional) {
      return 'Visão do profissional com foco apenas nos seus atendimentos.'
    }
    if (usuarioProprietario) {
      return 'Visão do proprietário com agenda completa, equipe e operação da unidade.'
    }
    return 'Visão administrativa com foco em cadastros, configurações e controle geral do sistema.'
  }

  const statCards: StatCard[] = [
    {
      title: usuarioProfissional ? 'Clientes Atendidos' : 'Total de Clientes',
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
      title: adminSemContextoOperacional ? 'Agendamentos no Sistema Hoje' : 'Agendamentos Hoje',
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
      title: usuarioProfissional ? 'Seus Atendimentos na Semana' : adminSemContextoOperacional ? 'Agenda Geral da Semana' : 'Agenda da Semana',
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
      title: usuarioProfissional ? 'Faturado nos Seus Atendimentos' : adminSemContextoOperacional ? 'Faturado no Sistema Hoje' : 'Faturado Hoje',
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
          <p className="dashboard-subtitle">{getRoleSubtitle()}</p>
        </div>
      </div>

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

      {(usuarioProprietario || usuarioProfissional) && (
        <div className="dashboard-context-grid">
          {usuarioProprietario && (
            <section className="dashboard-section">
              <div className="section-header">
                <h2 className="section-title">Contexto da unidade</h2>
              </div>
              <div className="dashboard-context-list">
                <div>
                  <strong>Estabelecimento</strong>
                  <span>{estabelecimentoAtual?.nome || 'Não vinculado'}</span>
                </div>
                <div>
                  <strong>Telefone</strong>
                  <span>{estabelecimentoAtual?.telefone || 'Não informado'}</span>
                </div>
                <div>
                  <strong>Endereço</strong>
                  <span>{estabelecimentoAtual?.endereco || 'Não informado'}</span>
                </div>
                <div>
                  <strong>Funcionamento</strong>
                  <span>{config ? `${config.horarioInicial} às ${config.horarioFinal}` : '06:00 às 23:00'}</span>
                </div>
                <div>
                  <strong>Intervalo</strong>
                  <span>{config?.intervaloMinutos ?? 30} minutos</span>
                </div>
              </div>
            </section>
          )}

          {usuarioProprietario && (
            <section className="dashboard-section">
              <div className="section-header">
                <h2 className="section-title">Equipe e serviços</h2>
              </div>
              <div className="dashboard-mini-stats">
                <div className="dashboard-mini-stat">
                  <strong>{profissionaisVinculados.length}</strong>
                  <span>profissionais vinculados</span>
                </div>
                <div className="dashboard-mini-stat">
                  <strong>{stats.totalClientes}</strong>
                  <span>clientes da unidade</span>
                </div>
                <div className="dashboard-mini-stat">
                  <strong>{servicosVinculados.length}</strong>
                  <span>serviços ativos</span>
                </div>
              </div>
              <div className="dashboard-pill-list">
                {profissionaisVinculados.slice(0, 6).map((profissional) => (
                  <span key={profissional.id} className="dashboard-pill">{profissional.nome}</span>
                ))}
                {profissionaisVinculados.length === 0 && <p>Nenhum profissional vinculado.</p>}
              </div>
              <div className="dashboard-subsection">
                <strong>Clientes do estabelecimento</strong>
                <div className="dashboard-pill-list">
                  {clientesDaUnidade.slice(0, 6).map((cliente) => (
                    <span key={cliente.id} className="dashboard-pill">{cliente.nome}</span>
                  ))}
                  {clientesDaUnidade.length === 0 && <p>Nenhum cliente cadastrado.</p>}
                </div>
              </div>
              <div className="dashboard-subsection">
                <strong>Serviços da unidade</strong>
                <div className="dashboard-pill-list">
                  {servicosVinculados.slice(0, 6).map((servico) => (
                    <span key={servico.id} className="dashboard-pill">{servico.nome}</span>
                  ))}
                  {servicosVinculados.length === 0 && <p>Nenhum serviço ativo cadastrado.</p>}
                </div>
              </div>
            </section>
          )}

          {usuarioProfissional && (
            <section className="dashboard-section">
              <div className="section-header">
                <h2 className="section-title">Seus serviços vinculados</h2>
              </div>
              <div className="dashboard-pill-list">
                {servicosDoProfissional.map((item) => (
                  <span key={item.id} className="dashboard-pill">{item.servicoNome}</span>
                ))}
                {servicosDoProfissional.length === 0 && <p>Nenhum serviço vinculado ao seu usuário.</p>}
              </div>
            </section>
          )}
        </div>
      )}

      <div className="dashboard-content">
        <section className="dashboard-section">
          {adminSemContextoOperacional ? (
            <>
              <div className="section-header">
                <h2 className="section-title">Visão administrativa</h2>
                <button className="section-link" onClick={() => navigate('/historico')}>
                  Abrir histórico
                </button>
              </div>

              <div className="dashboard-mini-stats">
                <div className="dashboard-mini-stat">
                  <strong>{clientesDaUnidade.length}</strong>
                  <span>clientes cadastrados</span>
                </div>
                <div className="dashboard-mini-stat">
                  <strong>{servicosVinculados.length}</strong>
                  <span>serviços ativos</span>
                </div>
                <div className="dashboard-mini-stat">
                  <strong>{historicoRecente.length}</strong>
                  <span>atendimentos recentes</span>
                </div>
              </div>

              {historicoRecente.length === 0 ? (
                <div className="empty-state">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <p>Nenhum histórico recente encontrado</p>
                </div>
              ) : (
                <div className="appointments-list">
                  {historicoRecente.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="appointment-card"
                      onClick={() => {
                        setSelectedAgendamentoId(appointment.id)
                        setShowDetalhesModal(true)
                      }}
                    >
                      <div className="appointment-time">
                        <span className="appointment-hour">{String(appointment.horario || '-')}</span>
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
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="section-header">
                <h2 className="section-title">
                  {usuarioProfissional ? 'Seus próximos atendimentos' : 'Próximos agendamentos'}
                </h2>
                <button className="section-link" onClick={() => navigate('/agenda')}>
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
                    const horarios = Array.isArray(appointment.horario) ? appointment.horario : [appointment.horario]
                    const primeiroHorario = horarios[0]
                    const ultimoHorario = horarios[horarios.length - 1]
                    const horarioDisplay = horarios.length > 1 ? `${primeiroHorario} - ${ultimoHorario}` : primeiroHorario

                    return (
                      <div
                        key={appointment.id}
                        className="appointment-card"
                        onClick={() => {
                          setSelectedAgendamentoId(appointment.id)
                          setShowDetalhesModal(true)
                        }}
                      >
                        <div className="appointment-time">
                          <span className="appointment-hour">
                            {horarioDisplay}
                            {horarios.length > 1 && <span className="horarios-count">({horarios.length} horários)</span>}
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
            </>
          )}
        </section>

        <section className="dashboard-section">
          <h2 className="section-title">Ações rápidas</h2>
          <div className="quick-actions">
            {podeGerirCadastros && (
              <button
                className={`quick-action-btn ${acessoExpirado ? 'disabled' : ''}`}
                onClick={handleNovoClienteClick}
                title={acessoExpirado ? 'Seu acesso expirou. Você pode apenas visualizar os dados existentes.' : ''}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Novo Cliente</span>
              </button>
            )}
            {podeOperarAgenda && (
              <>
                <button
                  className={`quick-action-btn ${acessoExpirado ? 'disabled' : ''}`}
                  onClick={handleNovoAgendamentoClick}
                  title={acessoExpirado ? 'Seu acesso expirou. Você pode apenas visualizar os dados existentes.' : ''}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>Novo Agendamento</span>
                </button>
                <button
                  className={`quick-action-btn ${acessoExpirado ? 'disabled' : ''}`}
                  onClick={handleVerAgendaClick}
                  title={acessoExpirado ? 'Seu acesso expirou. Você pode apenas visualizar os dados existentes.' : ''}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span>{usuarioProfissional ? 'Minha Agenda' : 'Ver Agenda'}</span>
                </button>
              </>
            )}
            {(usuarioAdmin || usuarioProprietario) && (
              <button className="quick-action-btn" onClick={() => navigate('/configuracoes')}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span>Configurações</span>
              </button>
            )}
            {temWhatsappSuporte && (
              <button
                className={`quick-action-btn quick-action-btn-suporte ${acessoExpirado ? 'disabled' : ''}`}
                onClick={handleSuporteClick}
                title={acessoExpirado ? 'Seu acesso expirou. Você pode apenas visualizar os dados existentes.' : 'Falar com suporte via WhatsApp'}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                <span>Suporte</span>
              </button>
            )}
          </div>
        </section>
      </div>

      <NovoClienteModal
        isOpen={showNovoClienteModal}
        onClose={() => setShowNovoClienteModal(false)}
        onSuccess={() => {
          loadData()
        }}
      />

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

      <ToastContainer toasts={toasts} onClose={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  )
}

export default Dashboard
