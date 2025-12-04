import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, query, where, getDocs } from 'firebase/firestore'
import * as crypto from 'crypto'
import * as readline from 'readline'

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyARWVfjlfpRleEBjsIKedUAxf9gkdW-6YY",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "agendamentos-clientes-7d7bd.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "agendamentos-clientes-7d7bd",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "agendamentos-clientes-7d7bd.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "121175364166",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:121175364166:web:8d41e2112a675a6e8eb047"
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Função para criar hash da senha usando SHA-256
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

// Função para ler input do usuário
function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise(resolve => {
    rl.question(query, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

// Função para verificar se email já existe
async function emailExists(email: string): Promise<boolean> {
  try {
    const q = query(collection(db, 'usuarios'), where('email', '==', email.toLowerCase().trim()))
    const querySnapshot = await getDocs(q)
    return !querySnapshot.empty
  } catch (error) {
    console.error('Erro ao verificar email:', error)
    return false
  }
}

// Função principal
async function createUser() {
  console.log('\n=== Criar Novo Usuário ===\n')

  try {
    // Solicitar dados do usuário
    const nome = await askQuestion('Nome completo: ')
    if (!nome.trim()) {
      console.error('Nome é obrigatório!')
      process.exit(1)
    }

    const email = await askQuestion('Email: ')
    if (!email.trim()) {
      console.error('Email é obrigatório!')
      process.exit(1)
    }

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.error('Email inválido!')
      process.exit(1)
    }

    // Verificar se email já existe
    const exists = await emailExists(email)
    if (exists) {
      console.error('Este email já está cadastrado!')
      process.exit(1)
    }

    const senha = await askQuestion('Senha: ')
    if (!senha.trim() || senha.length < 6) {
      console.error('Senha deve ter no mínimo 6 caracteres!')
      process.exit(1)
    }

    const confirmarSenha = await askQuestion('Confirmar senha: ')
    if (senha !== confirmarSenha) {
      console.error('As senhas não coincidem!')
      process.exit(1)
    }

    // Criar hash da senha
    const senhaHash = hashPassword(senha)

    // Dados do usuário
    const userData = {
      nome: nome.trim(),
      email: email.toLowerCase().trim(),
      senhaHash: senhaHash,
      ativo: true,
      dataCriacao: new Date().toISOString(),
      ultimoAcesso: null,
    }

    // Adicionar ao Firestore
    console.log('\nCriando usuário...')
    const docRef = await addDoc(collection(db, 'usuarios'), userData)

    console.log('\n✅ Usuário criado com sucesso!')
    console.log(`ID: ${docRef.id}`)
    console.log(`Nome: ${userData.nome}`)
    console.log(`Email: ${userData.email}`)
    console.log('\n')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Erro ao criar usuário:', error)
    process.exit(1)
  }
}

// Executar script
createUser()

