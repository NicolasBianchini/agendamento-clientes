import type { ConfiguracoesUsuario } from '../types/configuracoes'

export function formatarData(
  data: Date | string | null | undefined,
  config?: ConfiguracoesUsuario | null
): string {
  if (!data) return ''

  let date: Date

  if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
    const [year, month, day] = data.split('-').map(Number)
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
    return `${moeda} ${valor.toFixed(2)}`
  }
}

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

export function formatarDataParaInput(date: Date | string | null | undefined): string {
  if (!date) return ''

  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date
  }

  let data: Date

  if (date instanceof Date) {
    data = date
  } else if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      return match[0]
    }
    data = new Date(date)
  } else {
    return ''
  }

  if (isNaN(data.getTime())) return ''

  const year = data.getFullYear()
  const month = String(data.getMonth() + 1).padStart(2, '0')
  const day = String(data.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatarTelefoneWhatsApp(telefone: string): string {
  const numeros = telefone.replace(/\D/g, '')

  if (numeros.startsWith('55')) {
    return numeros
  }

  if (numeros.length === 11) {
    return `55${numeros}`
  }

  if (numeros.length === 10) {
    return `55${numeros}`
  }

  return numeros
}

export function gerarLinkWhatsApp(telefone: string, mensagem?: string): string {
  if (!telefone) return ''

  const telefoneFormatado = formatarTelefoneWhatsApp(telefone)
  const mensagemEncoded = mensagem ? encodeURIComponent(mensagem) : ''

  if (mensagemEncoded) {
    return `https://wa.me/${telefoneFormatado}?text=${mensagemEncoded}`
  }

  return `https://wa.me/${telefoneFormatado}`
}
