import { useState, useEffect } from 'react'
import { agendamentosService, clientesService, servicosService } from '../services/firestore'
import './Historico.css'

interface Atendimento {
  id: string
  cliente: string
  servico: string
  data: string // YYYY-MM-DD
  horario: string // HH:MM
  valor: number
  observacoes?: string
}

interface Cliente {
  id: string
  nome: string
}

interface Servico {
  id: string
  nome: string
}

function Historico() {
  const [allAtendimentos, setAllAtendimentos] = useState<Atendimento[]>([])
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Filtros
  const [filtroCliente, setFiltroCliente] = useState<string>('')
  const [filtroServico, setFiltroServico] = useState<string>('')
  const [dataInicial, setDataInicial] = useState<string>('')
  const [dataFinal, setDataFinal] = useState<string>('')
  
  // Estatísticas
  const [estatisticas, setEstatisticas] = useState({
    totalFaturadoMes: 0,
    quantidadeAtendimentos: 0,
    mediaPorAtendimento: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (allAtendimentos.length > 0) {
      applyFilters()
    }
  }, [filtroCliente, filtroServico, dataInicial, dataFinal, allAtendimentos])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Buscar agendamentos concluídos no Firestore
      const concluidos = await agendamentosService.getByStatus('concluido')
      
      // Buscar clientes e serviços
      const [clientesData, servicosData] = await Promise.all([
        clientesService.getAll(),
        servicosService.getAll(),
      ])
      
      // Mapear para Atendimento
      const atendimentosData: Atendimento[] = await Promise.all(
        concluidos.map(async (ag: any) => {
          const cliente = clientesData.find((c: any) => c.id === ag.clienteId)
          const servico = servicosData.find((s: any) => s.id === ag.servicoId)
          
          const agDate = ag.data instanceof Date 
            ? ag.data.toISOString().split('T')[0] 
            : ag.data
          
          return {
            id: ag.id,
            cliente: cliente?.nome || 'Cliente',
            servico: servico?.nome || ag.servicoNome || 'Serviço',
            data: agDate,
            horario: ag.horario || '',
            valor: servico?.valor || ag.servicoValor || 0,
            observacoes: ag.observacoes || undefined,
          }
        })
      )
      
      setAllAtendimentos(atendimentosData)
      setClientes(clientesData.map((c: any) => ({ id: c.id, nome: c.nome })))
      setServicos(servicosData.map((s: any) => ({ id: s.id, nome: s.nome })))
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...allAtendimentos]

    if (filtroCliente) {
      filtered = filtered.filter(a => a.cliente === filtroCliente)
    }

    if (filtroServico) {
      filtered = filtered.filter(a => a.servico === filtroServico)
    }

    if (dataInicial) {
      filtered = filtered.filter(a => a.data >= dataInicial)
    }

    if (dataFinal) {
      filtered = filtered.filter(a => a.data <= dataFinal)
    }

    // Ordenar por data/horário (mais recente primeiro)
    filtered.sort((a, b) => {
      const dateA = new Date(`${a.data}T${a.horario}`)
      const dateB = new Date(`${b.data}T${b.horario}`)
      return dateB.getTime() - dateA.getTime()
    })

    // Calcular estatísticas dos atendimentos filtrados
    const total = filtered.reduce((sum, a) => sum + a.valor, 0)
    const quantidade = filtered.length
    const media = quantidade > 0 ? total / quantidade : 0

    // Calcular total faturado do mês atual (independente dos filtros)
    const hoje = new Date()
    const mesAtual = hoje.getMonth()
    const anoAtual = hoje.getFullYear()
    const atendimentosMes = allAtendimentos.filter((a) => {
      const atendimentoDate = new Date(a.data)
      return atendimentoDate.getMonth() === mesAtual && atendimentoDate.getFullYear() === anoAtual
    })
    const totalFaturadoMes = atendimentosMes.reduce((sum, a) => sum + a.valor, 0)

    setEstatisticas({
      totalFaturadoMes,
      quantidadeAtendimentos: quantidade,
      mediaPorAtendimento: media,
    })

    setAtendimentos(filtered)
  }

  const handleQuickFilter = (period: 'hoje' | 'semana' | 'mes') => {
    const today = new Date()
    let startDate = new Date()
    let endDate = new Date()

    switch (period) {
      case 'hoje':
        startDate = new Date(today)
        endDate = new Date(today)
        break
      case 'semana':
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 7)
        endDate = new Date(today)
        break
      case 'mes':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        endDate = new Date(today)
        break
    }

    setDataInicial(startDate.toISOString().split('T')[0])
    setDataFinal(endDate.toISOString().split('T')[0])
  }

  const handleClearFilters = () => {
    setFiltroCliente('')
    setFiltroServico('')
    setDataInicial('')
    setDataFinal('')
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="historico">
      <div className="historico-header">
        <h1 className="historico-title">Histórico de Atendimentos</h1>
      </div>

      {/* Barra de Filtros */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label htmlFor="cliente" className="filter-label">Cliente</label>
            <select
              id="cliente"
              className="filter-select"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
            >
              <option value="">Todos os clientes</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.nome}>
                  {cliente.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="servico" className="filter-label">Serviço</label>
            <select
              id="servico"
              className="filter-select"
              value={filtroServico}
              onChange={(e) => setFiltroServico(e.target.value)}
            >
              <option value="">Todos os serviços</option>
              {servicos.map((servico) => (
                <option key={servico.id} value={servico.nome}>
                  {servico.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="dataInicial" className="filter-label">Data Inicial</label>
            <input
              type="date"
              id="dataInicial"
              className="filter-input"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="dataFinal" className="filter-label">Data Final</label>
            <input
              type="date"
              id="dataFinal"
              className="filter-input"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
            />
          </div>
        </div>

        <div className="filters-actions">
          <div className="quick-filters">
            <button
              className="quick-filter-btn"
              onClick={() => handleQuickFilter('hoje')}
            >
              Hoje
            </button>
            <button
              className="quick-filter-btn"
              onClick={() => handleQuickFilter('semana')}
            >
              Esta Semana
            </button>
            <button
              className="quick-filter-btn"
              onClick={() => handleQuickFilter('mes')}
            >
              Este Mês
            </button>
          </div>
          <button
            className="btn-clear-filters"
            onClick={handleClearFilters}
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="stats-section">
        <div className="stat-card">
          <div className="stat-label">Total Faturado no Mês</div>
          <div className="stat-value stat-value-primary">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(estatisticas.totalFaturadoMes)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Atendimentos</div>
          <div className="stat-value">
            {estatisticas.quantidadeAtendimentos}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Média por Atendimento</div>
          <div className="stat-value">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(estatisticas.mediaPorAtendimento)}
          </div>
        </div>
      </div>

      {/* Lista de Atendimentos */}
      {isLoading ? (
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Carregando atendimentos...</p>
        </div>
      ) : atendimentos.length === 0 ? (
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <h3>Nenhum atendimento encontrado</h3>
          <p>Ajuste os filtros para ver mais resultados.</p>
        </div>
      ) : (
        <div className="atendimentos-list">
          {atendimentos.map((atendimento) => (
            <div key={atendimento.id} className="atendimento-card">
              <div className="atendimento-header">
                <div className="atendimento-date-time">
                  <span className="atendimento-date">{formatDate(atendimento.data)}</span>
                  <span className="atendimento-time">{atendimento.horario}</span>
                </div>
                <div className="atendimento-value">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(atendimento.valor)}
                </div>
              </div>
              <div className="atendimento-body">
                <div className="atendimento-info">
                  <span className="atendimento-label">Cliente:</span>
                  <span className="atendimento-text">{atendimento.cliente}</span>
                </div>
                <div className="atendimento-info">
                  <span className="atendimento-label">Serviço:</span>
                  <span className="atendimento-text">{atendimento.servico}</span>
                </div>
                {atendimento.observacoes && (
                  <div className="atendimento-info">
                    <span className="atendimento-label">Observações:</span>
                    <span className="atendimento-text">
                      {truncateText(atendimento.observacoes, 100)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Historico

