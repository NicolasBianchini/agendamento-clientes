import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { clientesService, agendamentosService } from '../services/firestore'
import EditarClienteModal from '../components/EditarClienteModal'
import AgendamentoModal from '../components/AgendamentoModal'
import ConfirmModal from '../components/ConfirmModal'
import './DetalhesCliente.css'

interface Cliente {
  id: string
  nome: string
  telefone: string
  observacoes?: string
  dataCadastro: string
}

interface AgendamentoHistorico {
  id: string
  servicoNome: string
  servicoValor: number
  data: string
  horario: string
  status: 'agendado' | 'concluido' | 'cancelado'
  formaPagamento?: 'cartao' | 'dinheiro' | 'pix' | null
}

function DetalhesCliente() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [historico, setHistorico] = useState<AgendamentoHistorico[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditarModal, setShowEditarModal] = useState(false)
  const [showNovoAgendamentoModal, setShowNovoAgendamentoModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (id) {
      loadCliente()
      loadHistorico()
    }
  }, [id])

  const loadCliente = async () => {
    if (!id) return

    setIsLoading(true)
    setError(null)

    try {
      // Buscar cliente no Firestore
      const clienteData = await clientesService.getById(id)

      if (!clienteData) {
        setError('Cliente não encontrado')
        return
      }

      // Formatar telefone para exibição
      const telefoneFormatado = formatPhone(clienteData.telefone || '')

      setCliente({
        id: clienteData.id,
        nome: clienteData.nome,
        telefone: telefoneFormatado,
        observacoes: clienteData.observacoes,
        dataCadastro: clienteData.dataCadastro || new Date().toISOString(),
      })
    } catch (err) {
      setError('Erro ao carregar dados do cliente. Tente novamente.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadHistorico = async () => {
    if (!id) return

    try {
      // Buscar agendamentos concluídos do cliente no Firestore
      const agendamentos = await agendamentosService.getByCliente(id)

      // Filtrar apenas concluídos e buscar dados dos serviços
      const concluidos = agendamentos.filter((ag: any) => ag.status === 'concluido')

      // Buscar dados dos serviços para cada agendamento
      const historicoCompleto = await Promise.all(
        concluidos.map(async (ag: any) => {
          // Buscar nome do serviço (se não estiver no agendamento)
          let servicoNome = ag.servicoNome || 'Serviço'
          let servicoValor = ag.servicoValor || 0

          if (ag.servicoId) {
            try {
              const { servicosService } = await import('../services/firestore')
              const servico = await servicosService.getById(ag.servicoId)
              if (servico) {
                servicoNome = servico.nome
                servicoValor = servico.valor || 0
              }
            } catch (err) {
              console.error('Erro ao buscar serviço:', err)
            }
          }

          return {
            id: ag.id,
            servicoNome,
            servicoValor,
            data: ag.data instanceof Date ? ag.data.toISOString().split('T')[0] : ag.data,
            horario: ag.horario,
            status: ag.status,
            formaPagamento: ag.formaPagamento || null,
          }
        })
      )

      setHistorico(historicoCompleto)
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
    }
  }

  const handleDelete = async () => {
    if (!cliente) return

    if (!cliente) return

    setIsDeleting(true)
    try {
      // Verificar se tem agendamentos
      const agendamentos = await agendamentosService.getByCliente(cliente.id)
      if (agendamentos.length > 0) {
        alert(`Este cliente possui ${agendamentos.length} agendamento(s). Não é possível excluir.`)
        setIsDeleting(false)
        setShowDeleteConfirm(false)
        return
      }

      // Excluir do Firestore
      await clientesService.delete(cliente.id)
      navigate('/clientes')
    } catch (err) {
      alert('Erro ao excluir cliente. Tente novamente.')
      console.error(err)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatPhone = (phone: string): string => {
    const numbers = phone.replace(/\D/g, '')
    if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
    return phone
  }

  const getFormaPagamentoLabel = (forma?: 'cartao' | 'dinheiro' | 'pix' | null): string => {
    if (!forma) return 'Não informado'
    const labels = {
      cartao: 'Cartão',
      dinheiro: 'Dinheiro',
      pix: 'PIX',
    }
    return labels[forma]
  }

  if (isLoading) {
    return (
      <div className="detalhes-cliente-loading">
        <div className="spinner-large"></div>
        <p>Carregando dados do cliente...</p>
      </div>
    )
  }

  if (error || !cliente) {
    return (
      <div className="detalhes-cliente-error">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>{error || 'Cliente não encontrado'}</p>
        <button className="btn-primary" onClick={() => navigate('/clientes')}>
          Voltar para Clientes
        </button>
      </div>
    )
  }

  return (
    <div className="detalhes-cliente">
      {/* Header */}
      <div className="detalhes-cliente-header">
        <button
          className="btn-back"
          onClick={() => navigate('/clientes')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Voltar
        </button>
        <h1 className="detalhes-cliente-title">Detalhes do Cliente</h1>
      </div>

      <div className="detalhes-cliente-content">
        {/* Informações do Cliente */}
        <div className="cliente-info-section">
          <div className="cliente-avatar-large">
            {cliente.nome.charAt(0).toUpperCase()}
          </div>

          <div className="cliente-info-details">
            <h2 className="cliente-nome-large">{cliente.nome}</h2>

            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  Telefone:
                </span>
                <span className="info-value">{formatPhone(cliente.telefone)}</span>
              </div>

              <div className="info-item">
                <span className="info-label">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  Data de Cadastro:
                </span>
                <span className="info-value">{formatDate(cliente.dataCadastro)}</span>
              </div>

              {cliente.observacoes && (
                <div className="info-item info-item-full">
                  <span className="info-label">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    Observações:
                  </span>
                  <span className="info-value">{cliente.observacoes}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="cliente-actions-section">
          <h3 className="section-title">Ações</h3>
          <div className="actions-grid">
            <button
              className="action-btn action-edit"
              onClick={() => setShowEditarModal(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Editar
            </button>

            <button
              className="action-btn action-new"
              onClick={() => setShowNovoAgendamentoModal(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Novo Agendamento
            </button>

            <button
              className="action-btn action-delete"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Excluir
            </button>
          </div>
        </div>

        {/* Histórico de Atendimentos */}
        <div className="historico-section">
          <div className="historico-header">
            <h3 className="section-title">Histórico de Atendimentos</h3>
            <button
              className="btn-link"
              onClick={() => navigate(`/historico?cliente=${cliente.nome}`)}
            >
              Ver histórico completo
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>

          {historico.length === 0 ? (
            <div className="historico-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <p>Nenhum atendimento concluído ainda</p>
            </div>
          ) : (
            <div className="historico-list">
              {historico.map((agendamento) => (
                <div key={agendamento.id} className="historico-item">
                  <div className="historico-item-main">
                    <div className="historico-servico">
                      <h4>{agendamento.servicoNome}</h4>
                      <span className="historico-valor">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(agendamento.servicoValor)}
                      </span>
                    </div>
                    <div className="historico-meta">
                      <span className="historico-data">
                        {new Date(agendamento.data).toLocaleDateString('pt-BR')} às {agendamento.horario}
                      </span>
                      {agendamento.formaPagamento && (
                        <span className="historico-pagamento">
                          {getFormaPagamentoLabel(agendamento.formaPagamento)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Editar Cliente */}
      <EditarClienteModal
        isOpen={showEditarModal}
        clienteId={cliente.id}
        clienteData={{
          id: cliente.id,
          nome: cliente.nome,
          telefone: cliente.telefone,
          observacoes: cliente.observacoes,
        }}
        onClose={() => setShowEditarModal(false)}
        onSuccess={() => {
          loadCliente()
          setShowEditarModal(false)
        }}
      />

      {/* Modal de Novo Agendamento */}
      <AgendamentoModal
        isOpen={showNovoAgendamentoModal}
        mode="create"
        initialClienteId={cliente.id}
        onClose={() => setShowNovoAgendamentoModal(false)}
        onSuccess={() => {
          loadHistorico()
          setShowNovoAgendamentoModal(false)
        }}
      />

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o cliente ${cliente.nome}?`}
        confirmText={isDeleting ? 'Excluindo...' : 'Excluir'}
        cancelText="Cancelar"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        confirmVariant="danger"
      />
    </div>
  )
}

export default DetalhesCliente

