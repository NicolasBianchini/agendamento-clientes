import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { configuracoesService, disponibilidadeProfissionalService } from '../services/firestore'
import { getUserSession, isAuthenticated, isProfissional, isProprietario } from '../services/auth'
import type { ConfiguracoesUsuario } from '../types/configuracoes'

const DEFAULT_CONFIG: ConfiguracoesUsuario = {
  userId: '',
  horarioInicial: '06:00',
  horarioFinal: '23:00',
  intervaloMinutos: 30,
  tema: 'claro',
  template: 'padrao',
  visualizacaoAgendaPadrao: 'dia',
  notificacoesEmail: false,
  notificacoesPush: false,
  lembrarAgendamentos: true,
  permiteCancelamentoCliente: true,
  permiteRemarcacaoCliente: true,
  antecedenciaCancelamentoHoras: 24,
  antecedenciaRemarcacaoHoras: 24,
  moeda: 'BRL',
  formatoData: 'DD/MM/YYYY',
  formatoHora: '24h',
  whatsappSuporte: '',
}

interface ConfiguracoesContextType {
  config: ConfiguracoesUsuario | null
  loading: boolean
  reload: () => Promise<void>
}

const ConfiguracoesContext = createContext<ConfiguracoesContextType | undefined>(undefined)

export function ConfiguracoesProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ConfiguracoesUsuario | null>(null)
  const [loading, setLoading] = useState(true)

  const syncProfessionalAgendaWindow = async (baseConfig: ConfiguracoesUsuario) => {
    const usuario = getUserSession()

    if (!usuario || (!isProfissional(usuario) && !isProprietario(usuario))) {
      return baseConfig
    }

    try {
      const disponibilidades = await disponibilidadeProfissionalService.getByProfissional(usuario.id)
      const ativos = disponibilidades.filter((item: any) => item.ativo !== false)

      if (ativos.length === 0) {
        return {
          ...baseConfig,
          horarioInicial: '08:00',
          horarioFinal: '18:00',
        }
      }

      const inicioOrdenado = [...ativos].sort((a: any, b: any) => String(a.inicio || '').localeCompare(String(b.inicio || '')))
      const fimOrdenado = [...ativos].sort((a: any, b: any) => String(b.fim || '').localeCompare(String(a.fim || '')))

      return {
        ...baseConfig,
        horarioInicial: inicioOrdenado[0]?.inicio || baseConfig.horarioInicial,
        horarioFinal: fimOrdenado[0]?.fim || baseConfig.horarioFinal,
      }
    } catch (error) {
      console.error('Erro ao sincronizar janela da agenda do profissional:', error)
      return baseConfig
    }
  }

  const loadConfiguracoes = async () => {
    // Se não estiver autenticado, usar apenas valores padrão com WhatsApp do admin master
    if (!isAuthenticated()) {
      try {
        // Tentar buscar apenas o WhatsApp do admin master (não requer autenticação)
        const whatsappSuporteAdmin = await configuracoesService.getWhatsappSuporteAdminMaster()
        setConfig({
          ...DEFAULT_CONFIG,
          whatsappSuporte: whatsappSuporteAdmin,
        })
      } catch (error) {
        console.error('Erro ao carregar WhatsApp de suporte:', error)
        // Usar valores padrão sem WhatsApp em caso de erro
        setConfig({
          ...DEFAULT_CONFIG,
          whatsappSuporte: '',
        })
      } finally {
        setLoading(false)
      }
      return
    }

    // Se estiver autenticado, carregar configurações completas
    try {
      setLoading(true)
      const configuracoesBase = await configuracoesService.getComPadroes()
      const configuracoes = await syncProfessionalAgendaWindow(configuracoesBase)
      setConfig(configuracoes)
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      // Usar valores padrão em caso de erro
      setConfig(DEFAULT_CONFIG)
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

    // Escutar mudanças de autenticação (login/logout)
    const handleAuthChange = () => {
      loadConfiguracoes()
    }

    window.addEventListener('configuracoes-updated', handleConfigUpdate)
    window.addEventListener('auth-changed', handleAuthChange) // Evento customizado de autenticação
    window.addEventListener('storage', handleAuthChange) // Escutar mudanças de outras abas

    return () => {
      window.removeEventListener('configuracoes-updated', handleConfigUpdate)
      window.removeEventListener('auth-changed', handleAuthChange)
      window.removeEventListener('storage', handleAuthChange)
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
