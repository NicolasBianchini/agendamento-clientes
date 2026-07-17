import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, query, updateDoc, where } from 'firebase/firestore'

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

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

async function main(): Promise<void> {
  loadEnvFile('.env.local')
  loadEnvFile('.env')

  const [, , emailArg, passwordArg] = process.argv
  const email = emailArg?.trim().toLowerCase()
  const newPassword = passwordArg?.trim()

  if (!email || !newPassword) {
    console.error('Uso: npm run reset-admin-password -- <email> <nova-senha>')
    process.exitCode = 1
    return
  }

  if (newPassword.length < 6) {
    throw new Error('A nova senha deve ter no minimo 6 caracteres.')
  }

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

  const usuariosQuery = query(
    collection(db, 'usuarios'),
    where('email', '==', email)
  )

  const snapshot = await getDocs(usuariosQuery)

  if (snapshot.empty) {
    throw new Error(`Nenhum usuario encontrado com o email ${email}.`)
  }

  if (snapshot.docs.length > 1) {
    throw new Error(`Mais de um usuario encontrado com o email ${email}.`)
  }

  const userDoc = snapshot.docs[0]
  const userData = userDoc.data()

  if (userData.role !== 'admin_master') {
    throw new Error(`O usuario ${email} nao possui o papel admin_master.`)
  }

  await updateDoc(userDoc.ref, {
    senhaHash: hashPassword(newPassword),
    ativo: true,
  })

  console.log(`Senha redefinida com sucesso para ${email}.`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Erro desconhecido.'
  console.error(`Erro ao redefinir senha: ${message}`)
  process.exitCode = 1
})
