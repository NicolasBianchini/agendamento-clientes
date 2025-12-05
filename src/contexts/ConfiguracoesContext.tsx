import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { configuracoesService } from '../services/firestore'
import type { ConfiguracoesUsuario } from '../types/configuracoes'

interface ConfiguracoesContextType {
  config: ConfiguracoesUsuario | null
  loading: boolean
  reload: () => Promise<void>
}

const ConfiguracoesContext = createContext<ConfiguracoesContextType | undefined>(undefined)

export function ConfiguracoesProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ConfiguracoesUsuario | null>(null)
  const [loading, setLoading] = useState(true)

  const loadConfiguracoes = async () => {
    try {
      setLoading(true)
      const configuracoes = await configuracoesService.getComPadroes()
      setConfig(configuracoes)
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      // Usar valores padrão em caso de erro
      setConfig({
        userId: '',
        horarioInicial: '06:00',
        horarioFinal: '23:00',
        intervaloMinutos: 30,
        tema: 'claro',
        visualizacaoAgendaPadrao: 'dia',
        notificacoesEmail: false,
        notificacoesPush: false,
        lembrarAgendamentos: true,
        moeda: 'BRL',
        formatoData: 'DD/MM/YYYY',
        formatoHora: '24h',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfiguracoes()

    // Escutar eventos de atualização de configurações
    const handleConfigUpdate = () => {
      loadConfiguracoes()
    }

    window.addEventListener('configuracoes-updated', handleConfigUpdate)

    return () => {
      window.removeEventListener('configuracoes-updated', handleConfigUpdate)
    }
  }, [])

  return (
    <ConfiguracoesContext.Provider value={{ config, loading, reload: loadConfiguracoes }}>
      {children}
    </ConfiguracoesContext.Provider>
  )
}

export function useConfiguracoes() {
  const context = useContext(ConfiguracoesContext)
  if (context === undefined) {
    throw new Error('useConfiguracoes deve ser usado dentro de um ConfiguracoesProvider')
  }
  return context
}
