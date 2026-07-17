import { Timestamp } from 'firebase/firestore'

export interface ConfiguracoesUsuario {
  id?: string
  userId: string
  // Configurações de horários
  horarioInicial: string // HH:MM
  horarioFinal: string // HH:MM
  intervaloMinutos: number // 15, 30, 60, etc.
  // Configurações de visualização
  tema: 'claro' | 'escuro' | 'auto'
  template: 'padrao' | 'barbearia' | 'manicure' | 'salon' | 'spa'
  visualizacaoAgendaPadrao: 'dia' | 'semana' | 'mes'
  // Configurações de notificações
  notificacoesEmail: boolean
  notificacoesPush: boolean
  lembrarAgendamentos: boolean
  permiteCancelamentoCliente: boolean
  permiteRemarcacaoCliente: boolean
  antecedenciaCancelamentoHoras: number
  antecedenciaRemarcacaoHoras: number
  // Configurações gerais
  moeda: string // BRL, USD, EUR, etc.
  formatoData: string // DD/MM/YYYY, MM/DD/YYYY, etc.
  formatoHora: '12h' | '24h'
  // Configurações de suporte
  whatsappSuporte?: string // Número de WhatsApp para suporte (opcional)
  whatsappNotificacoesAtivo?: boolean
  whatsappTemplateConfirmacao?: string
  whatsappTemplateLembrete?: string
  whatsappTemplateCancelamento?: string
  backendNotificacoesUrl?: string
  calendarioIntegrado?: boolean
  calendarioTitulo?: string
  // Timestamps
  dataCriacao?: Date | Timestamp
  dataAtualizacao?: Date | Timestamp
}
