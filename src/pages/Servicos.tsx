import { useState, useEffect } from 'react'
import { servicosService, agendamentosService } from '../services/firestore'
import NovoServicoModal from '../components/NovoServicoModal'
import EditarServicoModal from '../components/EditarServicoModal'
import './Servicos.css'

interface Servico {
  id: string
  nome: string
  valor: number
  ativo: boolean
  totalAgendamentos: number
}

type StatusFilter = 'todos' | 'ativos' | 'inativos'
type SortOption = 'nome' | 'valor' | 'status'

function Servicos() {
  const [servicos, setServicos] = useState<Servico[]>([])
  const [filteredServicos, setFilteredServicos] = useState<Servico[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [sortBy, setSortBy] = useState<SortOption>('nome')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [servicoToDelete, setServicoToDelete] = useState<Servico | null>(null)
  const [showNovoServicoModal, setShowNovoServicoModal] = useState(false)
  const [showEditarServicoModal, setShowEditarServicoModal] = useState(false)
  const [servicoToEdit, setServicoToEdit] = useState<Servico | null>(null)

  useEffect(() => {
    loadServicos()
  }, [])

  useEffect(() => {
    filterAndSortServicos()
  }, [statusFilter, sortBy, servicos])

  const loadServicos = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Buscar serviços no Firestore
      const servicosData = await servicosService.getAll()
      
      // Buscar total de agendamentos para cada serviço
      const servicosComAgendamentos = await Promise.all(
        servicosData.map(async (servico: any) => {
          // Contar agendamentos que usam este serviço
          const todosAgendamentos = await agendamentosService.getAll()
          const agendamentosDoServico = todosAgendamentos.filter(
            (ag: any) => ag.servicoId === servico.id
          )
          
          return {
            ...servico,
            totalAgendamentos: agendamentosDoServico.length,
            valor: servico.valor || 0,
            ativo: servico.ativo !== false, // Default true
          }
        })
      )
      
      setServicos(servicosComAgendamentos as Servico[])
    } catch (err) {
      setError('Erro ao carregar serviços. Tente novamente.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const filterAndSortServicos = () => {
    let filtered = [...servicos]

    // Filtro por status
    if (statusFilter === 'ativos') {
      filtered = filtered.filter(servico => servico.ativo)
    } else if (statusFilter === 'inativos') {
      filtered = filtered.filter(servico => !servico.ativo)
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'nome':
          return a.nome.localeCompare(b.nome)
        case 'valor':
          return b.valor - a.valor
        case 'status':
          if (a.ativo === b.ativo) return 0
          return a.ativo ? -1 : 1
        default:
          return 0
      }
    })

    setFilteredServicos(filtered)
  }

  const handleToggleStatus = async (servico: Servico) => {
    try {
      // Atualizar status no Firestore
      await servicosService.update(servico.id, {
        ativo: !servico.ativo,
      })
      
      // Atualizar estado local
      setServicos(servicos.map(s => 
        s.id === servico.id ? { ...s, ativo: !s.ativo } : s
      ))
    } catch (error) {
      alert('Erro ao alterar status do serviço. Tente novamente.')
      console.error(error)
    }
  }

  const handleDeleteClick = (servico: Servico) => {
    setServicoToDelete(servico)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!servicoToDelete) return

    // Verificar se tem agendamentos
    if (servicoToDelete.totalAgendamentos > 0) {
      alert(`Este serviço possui ${servicoToDelete.totalAgendamentos} agendamento(s). Não é possível excluir.`)
      setShowDeleteModal(false)
      setServicoToDelete(null)
      return
    }

    try {
      // Verificar se tem agendamentos antes de excluir
      const todosAgendamentos = await agendamentosService.getAll()
      const agendamentosDoServico = todosAgendamentos.filter(
        (ag: any) => ag.servicoId === servicoToDelete.id
      )
      
      if (agendamentosDoServico.length > 0) {
        alert(`Este serviço possui ${agendamentosDoServico.length} agendamento(s). Não é possível excluir.`)
        setShowDeleteModal(false)
        setServicoToDelete(null)
        return
      }

      // Excluir do Firestore
      await servicosService.delete(servicoToDelete.id)
      setServicos(servicos.filter((s) => s.id !== servicoToDelete.id))
      setShowDeleteModal(false)
      setServicoToDelete(null)
    } catch (err) {
      alert('Erro ao excluir serviço. Tente novamente.')
      console.error(err)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
    setServicoToDelete(null)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  if (isLoading) {
    return (
      <div className="servicos-loading">
        <div className="spinner-large"></div>
        <p>Carregando serviços...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="servicos-error">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>{error}</p>
        <button className="retry-button" onClick={loadServicos}>
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="servicos">
      <div className="servicos-header">
        <div>
          <h1 className="servicos-title">Serviços</h1>
          <p className="servicos-subtitle">Gerencie os serviços oferecidos</p>
        </div>
      </div>

      {/* Barra de Ações */}
      <div className="servicos-actions">
        <div className="filters-container">
          <div className="filter-group">
            <label htmlFor="status-filter" className="filter-label">Filtro:</label>
            <select
              id="status-filter"
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="todos">Todos</option>
              <option value="ativos">Ativos</option>
              <option value="inativos">Inativos</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sort-select" className="filter-label">Ordenar por:</label>
            <select
              id="sort-select"
              className="filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="nome">Nome</option>
              <option value="valor">Valor</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={() => setShowNovoServicoModal(true)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Novo Serviço
        </button>
      </div>

      {/* Lista de Serviços */}
      {filteredServicos.length === 0 ? (
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
          </svg>
          <h3>Nenhum serviço encontrado</h3>
          <p>
            {statusFilter !== 'todos'
              ? 'Nenhum serviço encontrado com este filtro'
              : 'Comece cadastrando seu primeiro serviço'}
          </p>
          {statusFilter === 'todos' && (
            <button
              className="btn-primary"
              onClick={() => setShowNovoServicoModal(true)}
            >
              Cadastrar Serviço
            </button>
          )}
        </div>
      ) : (
        <div className="servicos-grid">
          {filteredServicos.map((servico) => (
            <div key={servico.id} className="servico-card">
              <div className="servico-header">
                <div className="servico-info">
                  <h3 className="servico-nome">{servico.nome}</h3>
                  <p className="servico-valor">{formatCurrency(servico.valor)}</p>
                </div>
                <div className="servico-status-toggle">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={servico.ativo}
                      onChange={() => handleToggleStatus(servico)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className={`status-badge ${servico.ativo ? 'status-ativo' : 'status-inativo'}`}>
                    {servico.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>

              <div className="servico-meta">
                <div className="meta-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span>{servico.totalAgendamentos} agendamento(s)</span>
                </div>
              </div>

              <div className="servico-actions">
                <button
                  className="btn-action btn-edit"
                  onClick={() => {
                    setServicoToEdit(servico)
                    setShowEditarServicoModal(true)
                  }}
                  title="Editar"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button
                  className="btn-action btn-delete"
                  onClick={() => handleDeleteClick(servico)}
                  title="Excluir"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && servicoToDelete && (
        <div className="modal-overlay" onClick={handleDeleteCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmar Exclusão</h3>
            <p>
              Tem certeza que deseja excluir o serviço <strong>{servicoToDelete.nome}</strong>?
            </p>
            {servicoToDelete.totalAgendamentos > 0 && (
              <div className="warning-message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>Este serviço possui {servicoToDelete.totalAgendamentos} agendamento(s) e não pode ser excluído.</span>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={handleDeleteCancel}>
                Cancelar
              </button>
              <button
                className="btn-danger"
                onClick={handleDeleteConfirm}
                disabled={servicoToDelete.totalAgendamentos > 0}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Novo Serviço */}
      <NovoServicoModal
        isOpen={showNovoServicoModal}
        onClose={() => setShowNovoServicoModal(false)}
        onSuccess={() => {
          loadServicos()
        }}
      />

      {/* Modal de Editar Serviço */}
      <EditarServicoModal
        isOpen={showEditarServicoModal}
        servicoId={servicoToEdit?.id || null}
        servicoData={servicoToEdit ? {
          id: servicoToEdit.id,
          nome: servicoToEdit.nome,
          valor: servicoToEdit.valor,
        } : undefined}
        onClose={() => {
          setShowEditarServicoModal(false)
          setServicoToEdit(null)
        }}
        onSuccess={() => {
          loadServicos()
        }}
      />
    </div>
  )
}

export default Servicos

