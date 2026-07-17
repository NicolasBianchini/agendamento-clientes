import type { ConfiguracoesUsuario } from '../types/configuracoes'

type AppointmentLike = {
  id?: string
  clienteNome?: string | null
  clienteTelefone?: string | null
  clienteEmail?: string | null
  servicoNome?: string | null
  profissionalNome?: string | null
  estabelecimentoNome?: string | null
  data: string | Date | { toDate?: () => Date }
  horario: string
  status?: string | null
}

type CalendarAssociation = {
  title: string
  startIso: string
  endIso: string
  googleCalendarUrl: string
  icsDataUri: string
  status: 'confirmed' | 'cancelled'
}

const DEFAULT_TEMPLATE_CONFIRMACAO =
  'Olá, {clienteNome}! Seu agendamento de {servicoNome} foi confirmado para {data} às {horario} com {profissionalNome} em {estabelecimentoNome}.'

const DEFAULT_TEMPLATE_LEMBRETE =
  'Olá, {clienteNome}! Lembrete do seu atendimento de {servicoNome}: {data} às {horario}, com {profissionalNome} em {estabelecimentoNome}.'

const DEFAULT_TEMPLATE_CANCELAMENTO =
  'Olá, {clienteNome}. Seu agendamento de {servicoNome} em {data} às {horario} foi cancelado/alterado. Se precisar, fale conosco.'

const escapeIcsText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')

const normalizeAppointmentDate = (date: string | Date | { toDate?: () => Date }) => {
  if (typeof date === 'string') {
    return date.split('T')[0]
  }

  if (date instanceof Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  if (date?.toDate && typeof date.toDate === 'function') {
    const parsed = date.toDate()
    const year = parsed.getFullYear()
    const month = String(parsed.getMonth() + 1).padStart(2, '0')
    const day = String(parsed.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return ''
}

export const combineDateAndTime = (
  date: string | Date | { toDate?: () => Date },
  time: string
) => {
  const normalizedDate = normalizeAppointmentDate(date)
  if (!normalizedDate) {
    return new Date(NaN)
  }
  const [year, month, day] = normalizedDate.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes, 0, 0)
}

export const canManageAppointmentByAntecedence = (
  agendamento: { data: string | Date | { toDate?: () => Date }; horario: string },
  antecedenciaHoras: number
) => {
  const dataAgendamento = combineDateAndTime(agendamento.data, agendamento.horario)
  const agora = new Date()
  return dataAgendamento.getTime() - agora.getTime() >= antecedenciaHoras * 60 * 60 * 1000
}

export const replaceTemplateTokens = (template: string, agendamento: AppointmentLike) => {
  const dataNormalizada = normalizeAppointmentDate(agendamento.data)
  const [year, month, day] = dataNormalizada.split('-').map(Number)
  const dataFormatada = new Date(year, month - 1, day).toLocaleDateString('pt-BR')

  const tokens: Record<string, string> = {
    clienteNome: agendamento.clienteNome || 'cliente',
    clienteTelefone: agendamento.clienteTelefone || '',
    clienteEmail: agendamento.clienteEmail || '',
    servicoNome: agendamento.servicoNome || 'serviço',
    profissionalNome: agendamento.profissionalNome || 'profissional',
    estabelecimentoNome: agendamento.estabelecimentoNome || 'estabelecimento',
    data: dataFormatada,
    horario: agendamento.horario || '',
    status: agendamento.status || '',
  }

  return Object.entries(tokens).reduce(
    (result, [token, value]) => result.replaceAll(`{${token}}`, value),
    template
  )
}

export const getWhatsAppTemplates = (config?: Partial<ConfiguracoesUsuario>) => ({
  confirmacao: config?.whatsappTemplateConfirmacao || DEFAULT_TEMPLATE_CONFIRMACAO,
  lembrete: config?.whatsappTemplateLembrete || DEFAULT_TEMPLATE_LEMBRETE,
  cancelamento: config?.whatsappTemplateCancelamento || DEFAULT_TEMPLATE_CANCELAMENTO,
})

export const buildWhatsAppMessage = (
  tipo: 'confirmacao' | 'lembrete' | 'cancelamento',
  agendamento: AppointmentLike,
  config?: Partial<ConfiguracoesUsuario>
) => {
  const templates = getWhatsAppTemplates(config)
  return replaceTemplateTokens(templates[tipo], agendamento)
}

export const buildWhatsAppLink = (telefone: string, mensagem: string) => {
  const numero = telefone.replace(/\D/g, '')
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
}

export const buildCalendarAssociation = (
  agendamento: AppointmentLike,
  durationMinutes: number
): CalendarAssociation => {
  const start = combineDateAndTime(agendamento.data, agendamento.horario)
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)
  const title = `${agendamento.servicoNome || 'Atendimento'} - ${agendamento.clienteNome || 'Cliente'}`
  const details = [
    agendamento.profissionalNome ? `Profissional: ${agendamento.profissionalNome}` : '',
    agendamento.estabelecimentoNome ? `Local: ${agendamento.estabelecimentoNome}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const startIso = start.toISOString()
  const endIso = end.toISOString()
  const startGoogle = startIso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const endGoogle = endIso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

  const googleCalendarUrl =
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${startGoogle}/${endGoogle}` +
    `&details=${encodeURIComponent(details)}` +
    `&location=${encodeURIComponent(agendamento.estabelecimentoNome || '')}`

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AgendaPro//Agendamento//PT-BR',
    'BEGIN:VEVENT',
    `UID:${agendamento.id || `${startGoogle}-${agendamento.clienteNome || 'cliente'}`}@agendapro`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`,
    `DTSTART:${startGoogle}`,
    `DTEND:${endGoogle}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(details)}`,
    `LOCATION:${escapeIcsText(agendamento.estabelecimentoNome || '')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  return {
    title,
    startIso,
    endIso,
    googleCalendarUrl,
    icsDataUri: `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`,
    status: agendamento.status === 'cancelado' ? 'cancelled' : 'confirmed',
  }
}
