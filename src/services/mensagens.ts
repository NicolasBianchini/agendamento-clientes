import { formatarData, formatarMoeda } from '../utils/formatacao'
import type { ConfiguracoesUsuario } from '../types/configuracoes'

interface DadosAgendamento {
  clienteNome: string
  clienteTelefone: string
  servicoNome: string
  servicoValor: number
  data: Date | string
  horario: string | string[]
  observacoes?: string
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

function formatarHorarioDisplay(horario: string | string[]): string {
  if (Array.isArray(horario)) {
    if (horario.length === 1) {
      return horario[0]
    }
    const primeiro = horario[0]
    const ultimo = horario[horario.length - 1]
    return `${primeiro} - ${ultimo}`
  }
  return horario
}

/**
 * Cria a mensagem de confirmação do agendamento
 */
export function criarMensagemConfirmacao(
  dados: DadosAgendamento,
  config?: ConfiguracoesUsuario | null
): string {
  const dataFormatada = formatarData(dados.data, config)
  const horarioFormatado = formatarHorarioDisplay(dados.horario)
  const valorFormatado = formatarMoeda(dados.servicoValor, config)

  let mensagem = `✅ *Agendamento Confirmado*\n\n`
  mensagem += `Olá *${dados.clienteNome}*!\n\n`
  mensagem += `Seu agendamento foi confirmado:\n\n`
  mensagem += `📅 *Data:* ${dataFormatada}\n`
  mensagem += `⏰ *Horário:* ${horarioFormatado}\n`
  mensagem += `💅 *Serviço:* ${dados.servicoNome}\n`
  mensagem += `💰 *Valor:* ${valorFormatado}\n`

  if (dados.observacoes && dados.observacoes.trim()) {
    mensagem += `\n📝 *Observações:* ${dados.observacoes}\n`
  }

  mensagem += `\nAguardamos você! 😊`

  return mensagem
}

async function enviarMensagemViaAPI(
  telefone: string,
  mensagem: string,
  config: ConfiguracoesUsuario
): Promise<boolean> {
  if (!config.mensagensAutomaticas || !config.apiMensagensUrl) {
    return false
  }

  const telefoneFormatado = formatarTelefoneWhatsApp(telefone)

  if (!telefoneFormatado || telefoneFormatado.length < 10) {
    console.error('Telefone inválido após formatação:', telefoneFormatado)
    return false
  }

  try {
    const url = config.apiMensagensUrl.trim().replace(/\/$/, '')
    const token = config.apiMensagensToken?.trim() || ''
    const instancia = config.apiMensagensInstancia?.trim() || ''

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    let body: any
    let apiUrl: string

    const urlLower = url.toLowerCase()

    if (urlLower.includes('wawp.net') || urlLower.includes('wawp')) {
      if (url.includes('wawp-api-prod')) {
        apiUrl = `${url}/api/v1/messages`
      } else {
        apiUrl = 'https://api.wawp.net/v1/messages'
      }

      const chatId = `${telefoneFormatado}@c.us`

      body = {
        instance_id: instancia,
        access_token: token,
        chatId: chatId,
        text: mensagem,
      }

      if (headers['Authorization']) {
        delete headers['Authorization']
      }
    } else if (urlLower.includes('wozzapi')) {
      body = {
        phone: telefoneFormatado,
        message: mensagem,
      }
      apiUrl = `${url}/sendMessage`
    } else if (urlLower.includes('chat-api.com')) {
      body = {
        phone: telefoneFormatado,
        body: mensagem,
      }
      apiUrl = `${url}/sendMessage`
    } else if (instancia) {
      body = {
        number: telefoneFormatado,
        text: mensagem,
      }
      apiUrl = `${url}/message/sendText/${instancia}`
    } else {
      body = {
        to: telefoneFormatado,
        message: mensagem,
      }
      apiUrl = url
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Erro na API de mensagens:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: apiUrl,
      })
      return false
    }

    await response.json().catch(() => {
      return { success: true, rawResponse: 'Resposta não-JSON recebida' }
    })

    return true
  } catch (error) {
    console.error('Erro ao enviar mensagem via API:', error)
    return false
  }
}


export async function enviarConfirmacaoAgendamento(
  dados: DadosAgendamento,
  config?: ConfiguracoesUsuario | null
): Promise<boolean> {
  if (!dados.clienteTelefone) {
    return false
  }

  if (!config?.mensagensAutomaticas) {
    return false
  }

  if (!config?.apiMensagensUrl || config.apiMensagensUrl.trim() === '') {
    return false
  }

  if (!config?.apiMensagensToken || config.apiMensagensToken.trim() === '') {
    return false
  }

  const urlLower = config.apiMensagensUrl.toLowerCase()
  if ((urlLower.includes('wawp.net') || urlLower.includes('wawp')) && (!config?.apiMensagensInstancia || config.apiMensagensInstancia.trim() === '')) {
    return false
  }

  const mensagem = criarMensagemConfirmacao(dados, config)
  const enviado = await enviarMensagemViaAPI(dados.clienteTelefone, mensagem, config)

  return enviado
}
