import { formatarData, formatarHora, formatarMoeda } from '../utils/formatacao'
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

/**
 * Formata o telefone para uso no WhatsApp (apenas números com código do país)
 */
function formatarTelefoneWhatsApp(telefone: string): string {
  // Remove tudo que não é número
  const numeros = telefone.replace(/\D/g, '')

  // Se já começar com 55 (código do Brasil), retornar como está
  if (numeros.startsWith('55')) {
    return numeros
  }

  // Se tiver 11 dígitos (DDD + 9 dígitos), adicionar código do país
  if (numeros.length === 11) {
    return `55${numeros}`
  }

  // Se tiver 10 dígitos (DDD + 8 dígitos), adicionar código do país
  if (numeros.length === 10) {
    return `55${numeros}`
  }

  // Retornar como está se não se encaixar nos padrões
  return numeros
}

/**
 * Formata o horário para exibição
 */
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

/**
 * Envia mensagem via API (Evolution API, Twilio, etc.)
 * 
 * APIs suportadas:
 * - Evolution API (recomendada, gratuita e open source)
 * - APIs genéricas com formato customizado
 */
async function enviarMensagemViaAPI(
  telefone: string,
  mensagem: string,
  config: ConfiguracoesUsuario
): Promise<boolean> {
  console.log('📤 [MENSAGENS] Iniciando envio de mensagem via API...')
  console.log('📤 [MENSAGENS] Telefone original:', telefone)
  console.log('📤 [MENSAGENS] Configurações:', {
    mensagensAutomaticas: config.mensagensAutomaticas,
    apiMensagensUrl: config.apiMensagensUrl ? 'Configurada' : 'Não configurada',
    temToken: !!config.apiMensagensToken,
    temInstancia: !!config.apiMensagensInstancia,
  })

  if (!config.mensagensAutomaticas || !config.apiMensagensUrl) {
    console.warn('⚠️ [MENSAGENS] Mensagens automáticas não estão configuradas')
    console.warn('⚠️ [MENSAGENS] mensagensAutomaticas:', config.mensagensAutomaticas)
    console.warn('⚠️ [MENSAGENS] apiMensagensUrl:', config.apiMensagensUrl)
    return false
  }

  const telefoneFormatado = formatarTelefoneWhatsApp(telefone)
  console.log('📤 [MENSAGENS] Telefone formatado:', telefoneFormatado)

  if (!telefoneFormatado || telefoneFormatado.length < 10) {
    console.error('❌ [MENSAGENS] Telefone inválido após formatação:', telefoneFormatado)
    return false
  }

  try {
    const url = config.apiMensagensUrl.trim().replace(/\/$/, '') // Remove barra final
    const token = config.apiMensagensToken?.trim() || ''
    const instancia = config.apiMensagensInstancia?.trim() || ''

    console.log('📤 [MENSAGENS] Preparando requisição...')
    console.log('📤 [MENSAGENS] URL base:', url)
    console.log('📤 [MENSAGENS] Token presente:', !!token)
    console.log('📤 [MENSAGENS] Instância:', instancia || '(não informada)')

    // Preparar headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
      console.log('📤 [MENSAGENS] Header Authorization adicionado')
    }

    // Preparar body baseado no formato da API
    let body: any
    let apiUrl: string

    // Detectar tipo de API pela URL
    const urlLower = url.toLowerCase()
    console.log('📤 [MENSAGENS] Detectando tipo de API pela URL...')

    if (urlLower.includes('wawp.net') || urlLower.includes('wawp')) {
      console.log('📤 [MENSAGENS] API detectada: Wawp')
      // Wawp API (serviço online)
      // Documentação: https://docs.wawp.net/send-messages-1300465m0
      // IMPORTANTE: A documentação mostra o formato mas não o endpoint exato

      // Testar endpoint baseado em padrões comuns de API
      // Formato 1: Usar o servidor específico com /api/v1/messages
      if (url.includes('wawp-api-prod')) {
        apiUrl = `${url}/api/v1/messages`
      } else {
        // Formato 2: Usar api.wawp.net genérico
        apiUrl = 'https://api.wawp.net/v1/messages'
      }

      // Formato da API Wawp baseado na documentação oficial
      // chatId deve estar no formato: telefone@c.us
      const chatId = `${telefoneFormatado}@c.us`

      body = {
        instance_id: instancia,
        access_token: token,
        chatId: chatId,
        text: mensagem,
      }

      console.log('📤 [MENSAGENS] Body preparado para Wawp:', {
        instance_id: instancia,
        hasAccessToken: !!token,
        chatId: chatId,
        textLength: mensagem.length,
      })
      console.log('📤 [MENSAGENS] Tentando endpoint:', apiUrl)

      // Remover Authorization do header (credenciais vão no body)
      if (headers['Authorization']) {
        delete headers['Authorization']
        console.log('📤 [MENSAGENS] Authorization removido do header (credenciais vão no body)')
      }
    } else if (urlLower.includes('wozzapi')) {
      console.log('📤 [MENSAGENS] API detectada: Wozzapi')
      body = {
        phone: telefoneFormatado,
        message: mensagem,
      }
      apiUrl = `${url}/sendMessage`
    } else if (urlLower.includes('chat-api.com')) {
      console.log('📤 [MENSAGENS] API detectada: ChatAPI')
      body = {
        phone: telefoneFormatado,
        body: mensagem,
      }
      apiUrl = `${url}/sendMessage`
    } else if (instancia) {
      console.log('📤 [MENSAGENS] API detectada: Evolution API')
      // Formato Evolution API (self-hosted)
      // Documentação: https://doc.evolution-api.com
      body = {
        number: telefoneFormatado,
        text: mensagem,
      }
      // Evolution API endpoint: /message/sendText/{instance}
      apiUrl = `${url}/message/sendText/${instancia}`
    } else {
      console.log('📤 [MENSAGENS] API detectada: Formato genérico')
      // Formato genérico para outras APIs
      body = {
        to: telefoneFormatado,
        message: mensagem,
      }
      apiUrl = url
    }

    console.log('📤 [MENSAGENS] URL final da requisição:', apiUrl)
    console.log('📤 [MENSAGENS] Headers:', headers)
    console.log('📤 [MENSAGENS] Body (sem token):', { ...body, access_token: body.access_token ? '***' : undefined })

    // Fazer requisição
    console.log('📤 [MENSAGENS] Enviando requisição POST para:', apiUrl)
    console.log('📤 [MENSAGENS] Iniciando fetch...')

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    console.log('📤 [MENSAGENS] Resposta recebida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [MENSAGENS] Erro na API de mensagens:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: apiUrl,
      })
      return false
    }

    const result = await response.json().catch((err) => {
      console.warn('⚠️ [MENSAGENS] Resposta não é JSON válido:', err)
      return { success: true, rawResponse: 'Resposta não-JSON recebida' }
    })

    console.log('✅ [MENSAGENS] Mensagem enviada com sucesso via API!')
    console.log('✅ [MENSAGENS] Resposta da API:', result)
    return true
  } catch (error) {
    console.error('❌ [MENSAGENS] Erro ao enviar mensagem via API:', error)
    if (error instanceof Error) {
      console.error('❌ [MENSAGENS] Detalhes do erro:', {
        message: error.message,
        stack: error.stack,
      })
    }
    return false
  }
}


/**
 * Envia mensagem de confirmação de agendamento via WhatsApp automaticamente
 * Requer configuração de API nas configurações do sistema
 */
export async function enviarConfirmacaoAgendamento(
  dados: DadosAgendamento,
  config?: ConfiguracoesUsuario | null
): Promise<boolean> {
  console.log('📨 [CONFIRMAÇÃO] Iniciando envio de confirmação de agendamento...')
  console.log('📨 [CONFIRMAÇÃO] Dados do agendamento:', {
    clienteNome: dados.clienteNome,
    clienteTelefone: dados.clienteTelefone ? 'Presente' : 'Não informado',
    servicoNome: dados.servicoNome,
    servicoValor: dados.servicoValor,
    data: dados.data,
    horario: dados.horario,
    temObservacoes: !!dados.observacoes,
  })

  if (!dados.clienteTelefone) {
    console.warn('⚠️ [CONFIRMAÇÃO] Cliente não possui telefone cadastrado. Não foi possível enviar a mensagem.')
    return false
  }

  // Verificar se mensagens automáticas estão configuradas
  if (!config?.mensagensAutomaticas) {
    console.warn('⚠️ [CONFIRMAÇÃO] Mensagens automáticas estão desativadas.')
    console.warn('⚠️ [CONFIRMAÇÃO] Ative em Configurações → Mensagens Automáticas → "Enviar Mensagens Automaticamente"')
    return false
  }

  if (!config?.apiMensagensUrl || config.apiMensagensUrl.trim() === '') {
    console.error('❌ [CONFIRMAÇÃO] URL da API não está configurada!')
    console.error('❌ [CONFIRMAÇÃO] Preencha o campo "URL da API" em Configurações → Mensagens Automáticas')
    console.error('❌ [CONFIRMAÇÃO] Para Wawp, use: https://api.wawp.net/v1')
    console.error('❌ [CONFIRMAÇÃO] Configurações atuais:', {
      mensagensAutomaticas: config?.mensagensAutomaticas,
      apiMensagensUrl: config?.apiMensagensUrl || '(vazio)',
      temToken: !!config?.apiMensagensToken,
      temInstancia: !!config?.apiMensagensInstancia,
    })
    return false
  }

  if (!config?.apiMensagensToken || config.apiMensagensToken.trim() === '') {
    console.error('❌ [CONFIRMAÇÃO] Token de autenticação não está configurado!')
    console.error('❌ [CONFIRMAÇÃO] Preencha o campo "Token de Autenticação" em Configurações → Mensagens Automáticas')
    console.error('❌ [CONFIRMAÇÃO] Para Wawp, use o Access Token do dashboard')
    return false
  }

  // Para Wawp, também precisa do Instance ID
  const urlLower = config.apiMensagensUrl.toLowerCase()
  if ((urlLower.includes('wawp.net') || urlLower.includes('wawp')) && (!config?.apiMensagensInstancia || config.apiMensagensInstancia.trim() === '')) {
    console.error('❌ [CONFIRMAÇÃO] Instance ID não está configurado!')
    console.error('❌ [CONFIRMAÇÃO] Para Wawp, é necessário preencher o campo "ID da Instância"')
    console.error('❌ [CONFIRMAÇÃO] Encontre o Instance ID no dashboard do Wawp')
    return false
  }

  console.log('📨 [CONFIRMAÇÃO] Criando mensagem de confirmação...')
  const mensagem = criarMensagemConfirmacao(dados, config)
  console.log('📨 [CONFIRMAÇÃO] Mensagem criada (primeiros 100 caracteres):', mensagem.substring(0, 100) + '...')
  console.log('📨 [CONFIRMAÇÃO] Tamanho da mensagem:', mensagem.length, 'caracteres')

  // Tentar enviar via API
  console.log('📨 [CONFIRMAÇÃO] Chamando enviarMensagemViaAPI...')
  const enviado = await enviarMensagemViaAPI(dados.clienteTelefone, mensagem, config)

  if (enviado) {
    console.log('✅ [CONFIRMAÇÃO] Mensagem enviada automaticamente via API com sucesso!')
    return true
  } else {
    console.error('❌ [CONFIRMAÇÃO] Falha ao enviar mensagem via API')
    return false
  }
}
