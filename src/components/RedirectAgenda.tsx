import { Navigate } from 'react-router-dom'
import { useConfiguracoes } from '../hooks/useConfiguracoes'
import { getUserSession, isProfissional, isProprietario } from '../services/auth'

function RedirectAgenda() {
  const { config, loading } = useConfiguracoes()
  const usuario = getUserSession()

  if (!isProfissional(usuario) && !isProprietario(usuario)) {
    return <Navigate to="/dashboard" replace />
  }

  if (loading) {
    // Enquanto carrega, redireciona para dia (padrão)
    return <Navigate to="/agenda/dia" replace />
  }

  const view = config?.visualizacaoAgendaPadrao || 'dia'
  return <Navigate to={`/agenda/${view}`} replace />
}

export default RedirectAgenda
