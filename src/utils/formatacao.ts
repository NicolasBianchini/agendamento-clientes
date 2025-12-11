import type { ConfiguracoesUsuario } from '../types/configuracoes'

/**
 * Formata uma data de acordo com as configurações do usuário
 */
export function formatarData(
  data: Date | string | null | undefined,
  config?: ConfiguracoesUsuario | null
): string {
  if (!data) return ''

  let date: Date

  // Se for string YYYY-MM-DD, converter usando métodos locais para evitar problemas de timezone
  if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
    // Extrair ano, mês e dia diretamente da string
    const [year, month, day] = data.split('-').map(Number)
    // Criar Date usando timezone local
    date = new Date(year, month - 1, day)
  } else {
    date = typeof data === 'string' ? new Date(data) : data
  }

  if (isNaN(date.getTime())) return ''

  const formato = config?.formatoData || 'DD/MM/YYYY'
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()

  switch (formato) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`
    case 'DD-MM-YYYY':
      return `${day}-${month}-${year}`
    default:
      return `${day}/${month}/${year}`
  }
}

/**
 * Formata um horário de acordo com as configurações do usuário
 */
export function formatarHora(
  horario: string | null | undefined,
  config?: ConfiguracoesUsuario | null
): string {
  if (!horario) return ''

  const formato = config?.formatoHora || '24h'
  const [hours, minutes] = horario.split(':').map(Number)

  if (formato === '12h') {
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  return horario
}

/**
 * Formata um valor monetário de acordo com as configurações do usuário
 */
export function formatarMoeda(
  valor: number | null | undefined,
  config?: ConfiguracoesUsuario | null
): string {
  if (valor === null || valor === undefined) return ''

  const moeda = config?.moeda || 'BRL'
  const locale = moeda === 'BRL' ? 'pt-BR' : moeda === 'USD' ? 'en-US' : moeda === 'EUR' ? 'de-DE' : 'en-GB'
  const currency = moeda === 'BRL' ? 'BRL' : moeda === 'USD' ? 'USD' : moeda === 'EUR' ? 'EUR' : 'GBP'

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(valor)
  } catch {
    // Fallback simples
    return `${moeda} ${valor.toFixed(2)}`
  }
}

/**
 * Formata data e hora juntos
 */
export function formatarDataHora(
  data: Date | string | null | undefined,
  horario: string | null | undefined,
  config?: ConfiguracoesUsuario | null
): string {
  const dataFormatada = formatarData(data, config)
  const horaFormatada = formatarHora(horario, config)

  if (!dataFormatada && !horaFormatada) return ''
  if (!dataFormatada) return horaFormatada
  if (!horaFormatada) return dataFormatada

  return `${dataFormatada} às ${horaFormatada}`
}

/**
 * Converte uma data (Date, string ISO, ou string YYYY-MM-DD) para formato YYYY-MM-DD
 * sem problemas de timezone. Usa métodos locais para garantir que o dia não mude.
 */
export function formatarDataParaInput(date: Date | string | null | undefined): string {
  if (!date) return ''

  // Se já for string YYYY-MM-DD, retornar diretamente (sem conversão)
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date
  }

  let data: Date

  if (date instanceof Date) {
    data = date
  } else if (typeof date === 'string') {
    // Para strings ISO ou outras, tentar extrair YYYY-MM-DD diretamente se possível
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      // Se a string começa com YYYY-MM-DD, usar diretamente
      return match[0]
    }
    // Caso contrário, converter para Date e usar métodos locais
    data = new Date(date)
  } else {
    return ''
  }

  if (isNaN(data.getTime())) return ''

  // Usar métodos locais para evitar problemas de timezone
  const year = data.getFullYear()
  const month = String(data.getMonth() + 1).padStart(2, '0')
  const day = String(data.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
