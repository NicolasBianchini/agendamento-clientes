import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useConfiguracoes } from '../hooks/useConfiguracoes'

function RedirectAgenda() {
  const { config, loading } = useConfiguracoes()

  if (loading) {
    // Enquanto carrega, redireciona para dia (padrão)
    return <Navigate to="/agenda/dia" replace />
  }

  const view = config?.visualizacaoAgendaPadrao || 'dia'
  return <Navigate to={`/agenda/${view}`} replace />
}

export default RedirectAgenda
