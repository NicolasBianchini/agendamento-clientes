import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientesService, agendamentosService } from '../services/firestore'
import NovoClienteModal from '../components/NovoClienteModal'
import EditarClienteModal from '../components/EditarClienteModal'
import './Clientes.css'

interface Cliente {
  id: string
  nome: string
  telefone: string
  observacoes?: string
  dataCadastro: string
  totalAgendamentos: number
}

type SortOption = 'nome' | 'dataCadastro'

function Clientes() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('nome')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null)
  const [showNovoClienteModal, setShowNovoClienteModal] = useState(false)
  const [showEditarClienteModal, setShowEditarClienteModal] = useState(false)
  const [clienteToEdit, setClienteToEdit] = useState<Cliente | null>(null)

  useEffect(() => {
    loadClientes()
  }, [])

  useEffect(() => {
    filterAndSortClientes()
  }, [searchTerm, sortBy, clientes])

  const loadClientes = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Buscar clientes no Firestore
      const clientesData = await clientesService.getAll()
      
      // Buscar total de agendamentos para cada cliente
      const clientesComAgendamentos = await Promise.all(
        clientesData.map(async (cliente: any) => {
          const agendamentos = await agendamentosService.getByCliente(cliente.id)
          return {
            ...cliente,
            totalAgendamentos: agendamentos.length,
            dataCadastro: cliente.dataCadastro || new Date().toISOString(),
          }
        })
      )
      
      setClientes(clientesComAgendamentos as Cliente[])
    } catch (err) {
      setError('Erro ao carregar clientes. Tente novamente.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const filterAndSortClientes = () => {
    let filtered = [...clientes]

    // Busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (cliente) =>
          cliente.nome.toLowerCase().includes(term) ||
          cliente.telefone.replace(/\D/g, '').includes(term.replace(/\D/g, ''))
      )
    }

    // Ordenação
    filtered.sort((a, b) => {
      if (sortBy === 'nome') {
        return a.nome.localeCompare(b.nome)
      } else {
        return new Date(b.dataCadastro).getTime() - new Date(a.dataCadastro).getTime()
      }
    })

    setFilteredClientes(filtered)
  }

  const handleDeleteClick = (cliente: Cliente) => {
    setClienteToDelete(cliente)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!clienteToDelete) return

    // Verificar se tem agendamentos ativos
    if (clienteToDelete.totalAgendamentos > 0) {
      alert(`Este cliente possui ${clienteToDelete.totalAgendamentos} agendamento(s). Não é possível excluir.`)
      setShowDeleteModal(false)
      setClienteToDelete(null)
      return
    }

    try {
      // Verificar se tem agendamentos antes de excluir
      const agendamentos = await agendamentosService.getByCliente(clienteToDelete.id)
      if (agendamentos.length > 0) {
        alert(`Este cliente possui ${agendamentos.length} agendamento(s). Não é possível excluir.`)
        setShowDeleteModal(false)
        setClienteToDelete(null)
        return
      }

      // Excluir do Firestore
      await clientesService.delete(clienteToDelete.id)
      setClientes(clientes.filter((c) => c.id !== clienteToDelete.id))
      setShowDeleteModal(false)
      setClienteToDelete(null)
    } catch (err) {
      alert('Erro ao excluir cliente. Tente novamente.')
      console.error(err)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
    setClienteToDelete(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const formatPhone = (phone: string) => {
    // Remove caracteres não numéricos
    const numbers = phone.replace(/\D/g, '')
    // Formata se tiver 11 dígitos (com DDD)
    if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
    // Retorna o telefone original se já estiver formatado
    return phone
  }

  if (isLoading) {
    return (
      <div className="clientes-loading">
        <div className="spinner-large"></div>
        <p>Carregando clientes...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="clientes-error">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>{error}</p>
        <button className="retry-button" onClick={loadClientes}>
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="clientes">
      <div className="clientes-header">
        <div>
          <h1 className="clientes-title">Clientes</h1>
          <p className="clientes-subtitle">Gerencie seus clientes cadastrados</p>
        </div>
      </div>

      {/* Barra de Ações */}
      <div className="clientes-actions">
        <div className="search-container">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="actions-right">
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="nome">Ordenar por nome</option>
            <option value="dataCadastro">Ordenar por data</option>
          </select>

          <button
            className="btn-primary"
            onClick={() => setShowNovoClienteModal(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Novo Cliente
          </button>
        </div>
      </div>

      {/* Lista de Clientes */}
      {filteredClientes.length === 0 ? (
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <h3>Nenhum cliente encontrado</h3>
          <p>
            {searchTerm
              ? 'Tente buscar com outros termos'
              : 'Comece cadastrando seu primeiro cliente'}
          </p>
          {!searchTerm && (
            <button className="btn-primary" onClick={() => setShowNovoClienteModal(true)}>
              Cadastrar Cliente
            </button>
          )}
        </div>
      ) : (
        <div className="clientes-grid">
          {filteredClientes.map((cliente) => (
            <div key={cliente.id} className="cliente-card">
              <div className="cliente-header">
                <div className="cliente-avatar">
                  {cliente.nome.charAt(0).toUpperCase()}
                </div>
                <div className="cliente-info">
                  <h3 className="cliente-nome">{cliente.nome}</h3>
                  <p className="cliente-telefone">{formatPhone(cliente.telefone)}</p>
                </div>
              </div>

              {cliente.observacoes && (
                <div className="cliente-observacoes">
                  <p>{cliente.observacoes}</p>
                </div>
              )}

              <div className="cliente-meta">
                <div className="meta-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span>Cadastrado em {formatDate(cliente.dataCadastro)}</span>
                </div>
                <div className="meta-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span>{cliente.totalAgendamentos} agendamento(s)</span>
                </div>
              </div>

              <div className="cliente-actions">
                <button
                  className="btn-action btn-view"
                  onClick={() => navigate(`/clientes/${cliente.id}`)}
                  title="Ver detalhes"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
                <button
                  className="btn-action btn-edit"
                  onClick={() => {
                    setClienteToEdit(cliente)
                    setShowEditarClienteModal(true)
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
                  onClick={() => handleDeleteClick(cliente)}
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
      {showDeleteModal && clienteToDelete && (
        <div className="modal-overlay" onClick={handleDeleteCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmar Exclusão</h3>
            <p>
              Tem certeza que deseja excluir o cliente <strong>{clienteToDelete.nome}</strong>?
            </p>
            {clienteToDelete.totalAgendamentos > 0 && (
              <div className="warning-message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>Este cliente possui {clienteToDelete.totalAgendamentos} agendamento(s) e não pode ser excluído.</span>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={handleDeleteCancel}>
                Cancelar
              </button>
              <button
                className="btn-danger"
                onClick={handleDeleteConfirm}
                disabled={clienteToDelete.totalAgendamentos > 0}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Novo Cliente */}
      <NovoClienteModal
        isOpen={showNovoClienteModal}
        onClose={() => setShowNovoClienteModal(false)}
        onSuccess={() => {
          loadClientes()
        }}
      />

      {/* Modal de Editar Cliente */}
      <EditarClienteModal
        isOpen={showEditarClienteModal}
        clienteId={clienteToEdit?.id || null}
        clienteData={clienteToEdit ? {
          id: clienteToEdit.id,
          nome: clienteToEdit.nome,
          telefone: clienteToEdit.telefone,
          observacoes: clienteToEdit.observacoes,
        } : undefined}
        onClose={() => {
          setShowEditarClienteModal(false)
          setClienteToEdit(null)
        }}
        onSuccess={() => {
          loadClientes()
        }}
      />
    </div>
  )
}

export default Clientes

