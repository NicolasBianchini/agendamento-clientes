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

function getFlagValue(flagName: string): string | null {
  const arg = process.argv.find((entry) => entry.startsWith(`${flagName}=`))
  if (!arg) {
    return null
  }

  return arg.slice(flagName.length + 1).trim() || null
}

function hasFlag(flagName: string): boolean {
  return process.argv.includes(flagName)
}

function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase()
}

function normalizePhone(value: unknown): string {
  return String(value || '').replace(/\D/g, '')
}

function buildIdentifier(data: Record<string, unknown>): string | null {
  const clienteUserId = String(data.clienteUserId || '').trim()
  const email = normalizeEmail(data.email)
  const telefone = normalizePhone(data.telefone)

  return clienteUserId || email || telefone || null
}

function loadUniqueByField(
  snapshots: Array<QueryDocumentSnapshot<DocumentData>>,
  field: string,
  value: string
): QueryDocumentSnapshot<DocumentData> | null {
  const normalizedValue = value.trim().toLowerCase()
  const match = snapshots.find((doc) => String(doc.data()?.[field] || '').trim().toLowerCase() === normalizedValue)
  return match || null
}

async function main(): Promise<void> {
  loadEnvFile('.env.local')
  loadEnvFile('.env')

  const dryRun = hasFlag('--dry-run')
  const estabelecimentoPadrao = getFlagValue('--estabelecimento')

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

  const [clientesSnapshot, usuariosSnapshot] = await Promise.all([
    getDocs(collection(db, 'clientes')),
    getDocs(collection(db, 'usuarios')),
  ])

  let atualizados = 0
  let ignorados = 0
  let semEstabelecimento = 0

  for (const clienteDoc of clientesSnapshot.docs) {
    const cliente = clienteDoc.data()
    const email = normalizeEmail(cliente.email)
    const telefone = normalizePhone(cliente.telefone)
    const clienteUserId = String(cliente.clienteUserId || '').trim()

    let estabelecimentoId = String(cliente.estabelecimentoId || '').trim()

    if (!estabelecimentoId && clienteUserId) {
      const usuario = usuariosSnapshot.docs.find((doc) => doc.id === clienteUserId)
      estabelecimentoId = String(usuario?.data()?.estabelecimentoId || '').trim()
    }

    if (!estabelecimentoId && cliente.userId) {
      const usuario = usuariosSnapshot.docs.find((doc) => doc.id === cliente.userId)
      estabelecimentoId = String(usuario?.data()?.estabelecimentoId || '').trim()
    }

    if (!estabelecimentoId && email) {
      const usuario = loadUniqueByField(usuariosSnapshot.docs, 'email', email)
      estabelecimentoId = String(usuario?.data()?.estabelecimentoId || '').trim()
    }

    if (!estabelecimentoId && estabelecimentoPadrao) {
      estabelecimentoId = estabelecimentoPadrao
    }

    const payload = {
      email,
      telefone,
      identificador: buildIdentifier(cliente),
      ...(estabelecimentoId ? { estabelecimentoId } : {}),
    }

    const alreadyUpToDate =
      email === normalizeEmail(cliente.email) &&
      telefone === normalizePhone(cliente.telefone) &&
      String(cliente.identificador || '') === String(payload.identificador || '') &&
      String(cliente.estabelecimentoId || '') === estabelecimentoId

    if (alreadyUpToDate) {
      ignorados += 1
      continue
    }

    if (!estabelecimentoId) {
      semEstabelecimento += 1
      console.warn(`Cliente ${clienteDoc.id} sem estabelecimento inferido.`)
      continue
    }

    if (!dryRun) {
      await updateDoc(clienteDoc.ref, payload)
    }

    atualizados += 1
    console.log(`[cliente] ${dryRun ? 'simulação' : 'atualizado'} ${clienteDoc.id} -> estabelecimentoId=${estabelecimentoId}`)
  }

  console.log('')
  console.log(`Clientes atualizados: ${atualizados}`)
  console.log(`Clientes ignorados: ${ignorados}`)
  console.log(`Clientes sem estabelecimento inferido: ${semEstabelecimento}`)
  console.log(`Modo: ${dryRun ? 'dry-run' : 'execução real'}`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Erro desconhecido.'
  console.error(`Erro na migração de clientes: ${message}`)
  process.exitCode = 1
})
