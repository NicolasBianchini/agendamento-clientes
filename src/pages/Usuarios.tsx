import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarUsuarios, alterarStatusUsuario, renovarAcessoUsuario } from '../services/usuarios'
import { isAdminMaster, getUserSession, type Usuario, type UserRole } from '../services/auth'
import NovoUsuarioModal from '../components/NovoUsuarioModal'
import EditarUsuarioModal from '../components/EditarUsuarioModal'
import ConfirmModal from '../components/ConfirmModal'
import LoadingSpinner from '../components/LoadingSpinner'
import ToastContainer from '../components/ToastContainer'
import type { ToastType } from '../components/Toast'
import './Usuarios.css'

function Usuarios() {
  const navigate = useNavigate()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [filteredUsuarios, setFilteredUsuarios] = useState<Usuario[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNovoUsuarioModal, setShowNovoUsuarioModal] = useState(false)
  const [showEditarUsuarioModal, setShowEditarUsuarioModal] = useState(false)
  const [usuarioToEdit, setUsuarioToEdit] = useState<Usuario | null>(null)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [usuarioToChangeStatus, setUsuarioToChangeStatus] = useState<Usuario | null>(null)
  const [showRenovarModal, setShowRenovarModal] = useState(false)
  const [usuarioToRenovar, setUsuarioToRenovar] = useState<Usuario | null>(null)
  const [novaDataExpiracao, setNovaDataExpiracao] = useState<string>('')
  const [semExpiracaoRenovar, setSemExpiracaoRenovar] = useState(false)
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([])

  useEffect(() => {
    // Verificar se é admin master
    if (!isAdminMaster()) {
      navigate('/dashboard')
      return
    }

    loadUsuarios()
  }, [navigate])

  useEffect(() => {
    filterUsuarios()
  }, [searchTerm, usuarios])

  const loadUsuarios = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const usuariosData = await listarUsuarios()
      setUsuarios(usuariosData)
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao carregar usuários. Tente novamente.'
      setError(errorMessage)
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const filterUsuarios = () => {
    let filtered = [...usuarios]

    // Busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (usuario) =>
          usuario.nome.toLowerCase().includes(term) ||
          usuario.email.toLowerCase().includes(term)
      )
    }

    setFilteredUsuarios(filtered)
  }

  const handleNovoUsuario = () => {
    setShowNovoUsuarioModal(true)
  }

  const handleEditUsuario = (usuario: Usuario) => {
    setUsuarioToEdit(usuario)
    setShowEditarUsuarioModal(true)
  }

  const handleStatusChange = (usuario: Usuario) => {
    setUsuarioToChangeStatus(usuario)
    setShowStatusModal(true)
  }

  const handleRenovarAcesso = (usuario: Usuario) => {
    setUsuarioToRenovar(usuario)
    if (usuario.dataExpiracao) {
      const data = new Date(usuario.dataExpiracao)
      setNovaDataExpiracao(data.toISOString().split('T')[0])
      setSemExpiracaoRenovar(false)
    } else {
      setNovaDataExpiracao('')
      setSemExpiracaoRenovar(true)
    }
    setShowRenovarModal(true)
  }

  const handleRenovarConfirm = async () => {
    if (!usuarioToRenovar) return

    try {
      await renovarAcessoUsuario(
        usuarioToRenovar.id,
        semExpiracaoRenovar ? null : (novaDataExpiracao || null)
      )

      addToast('Acesso renovado com sucesso!', 'success')
      await loadUsuarios()
      setShowRenovarModal(false)
      setUsuarioToRenovar(null)
      setNovaDataExpiracao('')
      setSemExpiracaoRenovar(false)
    } catch (err: any) {
      addToast(err.message || 'Erro ao renovar acesso', 'error')
    }
  }

  const addToast = (message: string, type: ToastType) => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, message, type }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const handleStatusConfirm = async () => {
    if (!usuarioToChangeStatus) return

    try {
      const novoStatus = !usuarioToChangeStatus.ativo
      await alterarStatusUsuario(usuarioToChangeStatus.id, novoStatus)

      addToast(`Usuário ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`, 'success')

      await loadUsuarios()
      setShowStatusModal(false)
      setUsuarioToChangeStatus(null)
    } catch (err: any) {
      addToast(err.message || 'Erro ao alterar status do usuário', 'error')
    }
  }

  const handleNovoUsuarioSuccess = () => {
    setShowNovoUsuarioModal(false)
    addToast('Usuário criado com sucesso!', 'success')
    loadUsuarios()
  }

  const handleEditarUsuarioSuccess = () => {
    setShowEditarUsuarioModal(false)
    setUsuarioToEdit(null)
    addToast('Usuário atualizado com sucesso!', 'success')
    loadUsuarios()
  }

  const getRoleLabel = (role: UserRole): string => {
    const labels: Record<UserRole, string> = {
      admin_master: 'Admin Master',
      admin: 'Admin',
      cliente: 'Profissional',
    }
    return labels[role]
  }

  const getRoleBadgeClass = (role: UserRole): string => {
    const classes: Record<UserRole, string> = {
      admin_master: 'role-badge-master',
      admin: 'role-badge-admin',
      cliente: 'role-badge-cliente',
    }
    return classes[role]
  }

  const usuarioAtual = getUserSession()
  const isCurrentUser = (usuario: Usuario) => usuarioAtual?.id === usuario.id

  const isAcessoExpirado = (usuario: Usuario): boolean => {
    if (!usuario.dataExpiracao) return false
    const dataExpiracao = new Date(usuario.dataExpiracao)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    dataExpiracao.setHours(0, 0, 0, 0)
    return dataExpiracao < hoje
  }

  const isAcessoExpirando = (usuario: Usuario): boolean => {
    if (!usuario.dataExpiracao) return false
    const dataExpiracao = new Date(usuario.dataExpiracao)
    const hoje = new Date()
    const em7Dias = new Date()
    em7Dias.setDate(hoje.getDate() + 7)
    hoje.setHours(0, 0, 0, 0)
    dataExpiracao.setHours(0, 0, 0, 0)
    em7Dias.setHours(0, 0, 0, 0)
    return dataExpiracao >= hoje && dataExpiracao <= em7Dias
  }

  if (isLoading) {
    return (
      <div className="usuarios-container">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="usuarios-container">
      <div className="usuarios-header">
        <div>
          <h1 className="usuarios-title">Gerenciamento de Usuários</h1>
          <p className="usuarios-subtitle">
            Crie e gerencie acessos para profissionais (barbeiros, manicures, etc.) e administradores
          </p>
        </div>
        <button
          className="btn-primary btn-novo-usuario"
          onClick={handleNovoUsuario}
          title="Criar novo usuário do sistema"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Novo Usuário</span>
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="usuarios-filters">
        <div className="search-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="usuarios-table-container">
        {filteredUsuarios.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum usuário encontrado</p>
          </div>
        ) : (
          <table className="usuarios-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Data de Expiração</th>
                <th>Data de Criação</th>
                <th>Último Acesso</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>
                    <div className="user-name">
                      {usuario.nome}
                      {isCurrentUser(usuario) && (
                        <span className="current-user-badge">Você</span>
                      )}
                    </div>
                  </td>
                  <td>{usuario.email}</td>
                  <td>
                    <span className={`role-badge ${getRoleBadgeClass(usuario.role)}`}>
                      {getRoleLabel(usuario.role)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${usuario.ativo ? 'status-active' : 'status-inactive'}`}>
                      {usuario.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    {usuario.dataExpiracao ? (
                      <div className="data-expiracao-cell">
                        <span className={isAcessoExpirado(usuario) ? 'data-expirada' : isAcessoExpirando(usuario) ? 'data-expirando' : ''}>
                          {new Date(usuario.dataExpiracao).toLocaleDateString('pt-BR')}
                        </span>
                        {isAcessoExpirado(usuario) && (
                          <span className="badge-expirado">Expirado</span>
                        )}
                        {isAcessoExpirando(usuario) && !isAcessoExpirado(usuario) && (
                          <span className="badge-expirando">Expira em breve</span>
                        )}
                      </div>
                    ) : (
                      <span className="sem-expiracao">Sem expiração</span>
                    )}
                  </td>
                  <td>
                    {usuario.dataCriacao
                      ? new Date(usuario.dataCriacao).toLocaleDateString('pt-BR')
                      : '-'}
                  </td>
                  <td>
                    {usuario.ultimoAcesso
                      ? new Date(usuario.ultimoAcesso).toLocaleDateString('pt-BR')
                      : 'Nunca'}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon"
                        onClick={() => handleEditUsuario(usuario)}
                        title="Editar"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleRenovarAcesso(usuario)}
                        title="Renovar acesso"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 4v6h6"></path>
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                        </svg>
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleStatusChange(usuario)}
                        title={usuario.ativo ? 'Desativar' : 'Ativar'}
                        disabled={isCurrentUser(usuario)}
                      >
                        {usuario.ativo ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12"></path>
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showNovoUsuarioModal && (
        <NovoUsuarioModal
          isOpen={showNovoUsuarioModal}
          onClose={() => setShowNovoUsuarioModal(false)}
          onSuccess={handleNovoUsuarioSuccess}
        />
      )}

      {showEditarUsuarioModal && usuarioToEdit && (
        <EditarUsuarioModal
          isOpen={showEditarUsuarioModal}
          onClose={() => {
            setShowEditarUsuarioModal(false)
            setUsuarioToEdit(null)
          }}
          onSuccess={handleEditarUsuarioSuccess}
          usuario={usuarioToEdit}
        />
      )}

      {showStatusModal && usuarioToChangeStatus && (
        <ConfirmModal
          isOpen={showStatusModal}
          onCancel={() => {
            setShowStatusModal(false)
            setUsuarioToChangeStatus(null)
          }}
          onConfirm={handleStatusConfirm}
          title={usuarioToChangeStatus.ativo ? 'Desativar Usuário' : 'Ativar Usuário'}
          message={
            usuarioToChangeStatus.ativo
              ? `Tem certeza que deseja desativar o usuário "${usuarioToChangeStatus.nome}"?`
              : `Tem certeza que deseja ativar o usuário "${usuarioToChangeStatus.nome}"?`
          }
          confirmText={usuarioToChangeStatus.ativo ? 'Desativar' : 'Ativar'}
          cancelText="Cancelar"
        />
      )}

      {showRenovarModal && usuarioToRenovar && (
        <div className="modal-overlay" onClick={() => setShowRenovarModal(false)}>
          <div className="modal-content renovar-acesso-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Renovar Acesso</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowRenovarModal(false)
                  setUsuarioToRenovar(null)
                  setNovaDataExpiracao('')
                  setSemExpiracaoRenovar(false)
                }}
                aria-label="Fechar"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p>Renovar acesso para: <strong>{usuarioToRenovar.nome}</strong></p>
              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={semExpiracaoRenovar}
                    onChange={(e) => {
                      setSemExpiracaoRenovar(e.target.checked)
                      if (e.target.checked) {
                        setNovaDataExpiracao('')
                      }
                    }}
                  />
                  <span>Sem data de expiração (acesso permanente)</span>
                </label>
              </div>
              {!semExpiracaoRenovar && (
                <div className="form-group">
                  <label htmlFor="novaDataExpiracao" className="form-label">
                    Nova Data de Expiração <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    id="novaDataExpiracao"
                    className="form-input"
                    value={novaDataExpiracao}
                    onChange={(e) => setNovaDataExpiracao(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowRenovarModal(false)
                  setUsuarioToRenovar(null)
                  setNovaDataExpiracao('')
                  setSemExpiracaoRenovar(false)
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleRenovarConfirm}
                disabled={!semExpiracaoRenovar && !novaDataExpiracao}
              >
                Renovar Acesso
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer
        toasts={toasts.map((t) => ({ id: t.id, message: t.message, type: t.type }))}
        onClose={removeToast}
      />
    </div>
  )
}

export default Usuarios
