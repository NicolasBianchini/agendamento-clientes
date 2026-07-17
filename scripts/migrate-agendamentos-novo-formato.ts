import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeApp } from 'firebase/app'
import {
  collection,
  getDocs,
  getFirestore,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'

function loadEnvFile(fileName: string): void {
  const filePath = resolve(process.cwd(), fileName)

  if (!existsSync(filePath)) {
    return
  }

  const content = readFileSync(filePath, 'utf-8')

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Variável obrigatória ausente: ${name}`)
  }

  return value
}

function hasFlag(flagName: string): boolean {
  return process.argv.includes(flagName)
}

function getFlagValue(flagName: string): string | null {
  const arg = process.argv.find((entry) => entry.startsWith(`${flagName}=`))
  if (!arg) {
    return null
  }

  return arg.slice(flagName.length + 1).trim() || null
}

function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase()
}

function normalizePhone(value: unknown): string {
  return String(value || '').replace(/\D/g, '')
}

function normalizeDateKey(value: unknown): string | null {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return value.split('T')[0]
  }

  if (value instanceof Date) {
    return value.toISOString().split('T')[0]
  }

  if (typeof (value as any)?.toDate === 'function') {
    return (value as any).toDate().toISOString().split('T')[0]
  }

  return null
}

function combineDateAndTime(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes, 0, 0)
}

function formatUtcCalendarDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

function buildCalendarAssociation(data: {
  estabelecimentoNome?: string
  profissionalNome?: string
  servicoNome?: string
  data: string
  horario: string
  duracaoMinutos: number
  status?: string
}) {
  const startDate = combineDateAndTime(data.data, data.horario)
  const endDate = new Date(startDate.getTime() + data.duracaoMinutos * 60 * 1000)
  const titleBase = data.servicoNome || 'Agendamento'
  const professionalSuffix = data.profissionalNome ? ` com ${data.profissionalNome}` : ''
  const title = `${titleBase}${professionalSuffix}`.trim()
  const details = [`Estabelecimento: ${data.estabelecimentoNome || 'Não informado'}`]
  const location = data.estabelecimentoNome || 'Estabelecimento'

  const googleParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatUtcCalendarDate(startDate)}/${formatUtcCalendarDate(endDate)}`,
    details: details.join('\n'),
    location,
  })

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Agendamento Clientes//PT-BR',
    'BEGIN:VEVENT',
    `SUMMARY:${title}`,
    `DTSTART:${formatUtcCalendarDate(startDate)}`,
    `DTEND:${formatUtcCalendarDate(endDate)}`,
    `DESCRIPTION:${details.join('\\n')}`,
    `LOCATION:${location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  return {
    title,
    startIso: startDate.toISOString(),
    endIso: endDate.toISOString(),
    googleCalendarUrl: `https://calendar.google.com/calendar/render?${googleParams.toString()}`,
    icsDataUri: `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`,
    status: data.status || 'agendado',
  }
}

function findById(
  snapshots: Array<QueryDocumentSnapshot<DocumentData>>,
  id: string | null | undefined
): QueryDocumentSnapshot<DocumentData> | null {
  if (!id) {
    return null
  }

  return snapshots.find((doc) => doc.id === id) || null
}

function findClienteForAgendamento(
  clienteSnapshots: Array<QueryDocumentSnapshot<DocumentData>>,
  agendamento: Record<string, any>
): QueryDocumentSnapshot<DocumentData> | null {
  const clienteId = String(agendamento.clienteId || '').trim()
  const clienteById = findById(clienteSnapshots, clienteId)
  if (clienteById) {
    return clienteById
  }

  const email = normalizeEmail(agendamento.clienteEmail)
  const telefone = normalizePhone(agendamento.clienteTelefone)

  return (
    clienteSnapshots.find((doc) => {
      const current = doc.data()
      return (
        normalizeEmail(current.email) === email ||
        normalizePhone(current.telefone) === telefone
      )
    }) || null
  )
}

async function main(): Promise<void> {
  loadEnvFile('.env.local')
  loadEnvFile('.env')

  const dryRun = hasFlag('--dry-run')
  const estabelecimentoPadrao = getFlagValue('--estabelecimento')
  const duracaoPadrao = Number(getFlagValue('--duracao') || '30')

  const firebaseConfig = {
    apiKey: getRequiredEnv('VITE_FIREBASE_API_KEY'),
    authDomain: getRequiredEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getRequiredEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: getRequiredEnv('VITE_FIREBASE_APP_ID'),
  }

  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  const [agendamentosSnapshot, clientesSnapshot, servicosSnapshot, usuariosSnapshot, estabelecimentosSnapshot] = await Promise.all([
    getDocs(collection(db, 'agendamentos')),
    getDocs(collection(db, 'clientes')),
    getDocs(collection(db, 'servicos')),
    getDocs(collection(db, 'usuarios')),
    getDocs(collection(db, 'estabelecimentos')),
  ])

  let atualizados = 0
  let ignorados = 0
  let semEstabelecimento = 0

  for (const agendamentoDoc of agendamentosSnapshot.docs) {
    const agendamento = agendamentoDoc.data()
    const cliente = findClienteForAgendamento(clientesSnapshot.docs, agendamento)
    const servico = findById(servicosSnapshot.docs, String(agendamento.servicoId || '').trim())
    const profissional = findById(usuariosSnapshot.docs, String(agendamento.profissionalId || '').trim())

    let estabelecimentoId = String(agendamento.estabelecimentoId || '').trim()
    if (!estabelecimentoId) {
      estabelecimentoId = String(cliente?.data()?.estabelecimentoId || '').trim()
    }
    if (!estabelecimentoId) {
      estabelecimentoId = String(profissional?.data()?.estabelecimentoId || '').trim()
    }
    if (!estabelecimentoId) {
      estabelecimentoId = String(servico?.data()?.estabelecimentoId || '').trim()
    }
    if (!estabelecimentoId && estabelecimentoPadrao) {
      estabelecimentoId = estabelecimentoPadrao
    }

    if (!estabelecimentoId) {
      semEstabelecimento += 1
      console.warn(`Agendamento ${agendamentoDoc.id} sem estabelecimento inferido.`)
      continue
    }

    const estabelecimento = findById(estabelecimentosSnapshot.docs, estabelecimentoId)
    const data = normalizeDateKey(agendamento.data)
    const horario = String(agendamento.horario || '').trim()
    const duracaoMinutos = Number(agendamento.duracaoMinutos || servico?.data()?.duracaoMinutos || duracaoPadrao)
    const status = String(agendamento.status || 'agendado')

    const clienteNome = String(
      agendamento.clienteNome ||
      cliente?.data()?.nome ||
      'Cliente'
    ).trim()
    const clienteEmail = normalizeEmail(agendamento.clienteEmail || cliente?.data()?.email)
    const clienteTelefone = normalizePhone(agendamento.clienteTelefone || cliente?.data()?.telefone)
    const servicoNome = String(agendamento.servicoNome || servico?.data()?.nome || 'Serviço').trim()
    const servicoValor = agendamento.servicoValor ?? servico?.data()?.valor ?? null
    const profissionalNome = String(agendamento.profissionalNome || profissional?.data()?.nome || '').trim() || null
    const estabelecimentoNome = String(agendamento.estabelecimentoNome || estabelecimento?.data()?.nome || '').trim() || null
    const clienteUserId = String(agendamento.clienteUserId || cliente?.data()?.clienteUserId || '').trim() || null

    const calendarEvent =
      data && horario
        ? buildCalendarAssociation({
            estabelecimentoNome: estabelecimentoNome || undefined,
            profissionalNome: profissionalNome || undefined,
            servicoNome,
            data,
            horario,
            duracaoMinutos,
            status,
          })
        : agendamento.calendarEvent || null

    const payload = {
      estabelecimentoId,
      estabelecimentoNome,
      clienteUserId,
      clienteNome,
      clienteEmail,
      clienteTelefone,
      servicoNome,
      servicoValor,
      profissionalNome,
      status,
      ...(calendarEvent ? { calendarEvent } : {}),
    }

    const alreadyUpToDate =
      String(agendamento.estabelecimentoId || '') === estabelecimentoId &&
      String(agendamento.estabelecimentoNome || '') === String(estabelecimentoNome || '') &&
      String(agendamento.clienteUserId || '') === String(clienteUserId || '') &&
      String(agendamento.clienteNome || '') === clienteNome &&
      normalizeEmail(agendamento.clienteEmail) === clienteEmail &&
      normalizePhone(agendamento.clienteTelefone) === clienteTelefone &&
      String(agendamento.servicoNome || '') === servicoNome &&
      String(agendamento.profissionalNome || '') === String(profissionalNome || '') &&
      String(agendamento.status || 'agendado') === status &&
      !!agendamento.calendarEvent

    if (alreadyUpToDate) {
      ignorados += 1
      continue
    }

    if (!dryRun) {
      await updateDoc(agendamentoDoc.ref, payload)
    }

    atualizados += 1
    console.log(`[agendamento] ${dryRun ? 'simulação' : 'atualizado'} ${agendamentoDoc.id} -> estabelecimentoId=${estabelecimentoId}`)
  }

  console.log('')
  console.log(`Agendamentos atualizados: ${atualizados}`)
  console.log(`Agendamentos ignorados: ${ignorados}`)
  console.log(`Agendamentos sem estabelecimento inferido: ${semEstabelecimento}`)
  console.log(`Modo: ${dryRun ? 'dry-run' : 'execução real'}`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Erro desconhecido.'
  console.error(`Erro na migração de agendamentos: ${message}`)
  process.exitCode = 1
})
