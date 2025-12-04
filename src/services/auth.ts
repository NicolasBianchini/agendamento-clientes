import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'

export interface Usuario {
  id: string
  nome: string
  email: string
  ativo: boolean
  dataCriacao: string
  ultimoAcesso: string | null
}

interface LoginCredentials {
  email: string
  senha: string
}

// Função para criar hash da senha (mesma usada no script de criação)
// Usa Web Crypto API para compatibilidade com navegadores
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Função para salvar usuário na sessão
function saveUserSession(usuario: Usuario): void {
  localStorage.setItem('usuario', JSON.stringify(usuario))
  localStorage.setItem('isAuthenticated', 'true')
}

// Função para remover usuário da sessão
export function clearUserSession(): void {
  localStorage.removeItem('usuario')
  localStorage.removeItem('isAuthenticated')
}

// Função para obter usuário da sessão
export function getUserSession(): Usuario | null {
  const usuarioStr = localStorage.getItem('usuario')
  if (!usuarioStr) return null
  
  try {
    return JSON.parse(usuarioStr) as Usuario
  } catch {
    return null
  }
}

// Função para verificar se está autenticado
export function isAuthenticated(): boolean {
  return localStorage.getItem('isAuthenticated') === 'true' && getUserSession() !== null
}

// Função de login
export async function login(credentials: LoginCredentials): Promise<Usuario> {
  const { email, senha } = credentials

  // Validações básicas
  if (!email || !email.trim()) {
    throw new Error('Email é obrigatório')
  }

  const senhaTrimmed = senha?.trim() || ''
  if (!senhaTrimmed) {
    throw new Error('Senha é obrigatória')
  }

  if (senhaTrimmed.length < 6) {
    throw new Error('Senha deve ter no mínimo 6 caracteres')
  }

  try {
    // Buscar usuário no Firestore
    const emailNormalized = email.toLowerCase().trim()
    
    const q = query(
      collection(db, 'usuarios'),
      where('email', '==', emailNormalized)
    )
    
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      throw new Error('Email ou senha incorretos')
    }

    // Pegar o primeiro documento (deve haver apenas um com esse email)
    const doc = querySnapshot.docs[0]
    const userData = doc.data()

    // Verificar se o usuário está ativo
    if (!userData.ativo) {
      throw new Error('Usuário inativo. Entre em contato com o administrador.')
    }

    // Verificar senha
    const senhaHash = await hashPassword(senhaTrimmed)
    if (userData.senhaHash !== senhaHash) {
      throw new Error('Email ou senha incorretos')
    }

    // Criar objeto do usuário (sem a senha)
    const usuario: Usuario = {
      id: doc.id,
      nome: userData.nome,
      email: userData.email,
      ativo: userData.ativo,
      dataCriacao: userData.dataCriacao,
      ultimoAcesso: userData.ultimoAcesso || null,
    }

    // Atualizar último acesso (opcional - pode ser feito em background)
    // Por enquanto, apenas salvamos na sessão

    // Salvar na sessão
    saveUserSession(usuario)

    return usuario
  } catch (error: any) {
    // Se for erro de permissão do Firestore
    if (error.code === 'permission-denied') {
      throw new Error('Erro de permissão. Verifique as regras do Firestore.')
    }
    
    // Se já for uma mensagem de erro nossa, apenas relançar
    if (error.message) {
      throw error
    }

    // Erro genérico
    throw new Error('Erro ao fazer login. Tente novamente.')
  }
}

// Função de logout
export function logout(): void {
  clearUserSession()
}

// Função para atualizar último acesso (opcional)
export async function updateLastAccess(userId: string): Promise<void> {
  try {
    const { updateDoc, doc } = await import('firebase/firestore')
    const userRef = doc(db, 'usuarios', userId)
    await updateDoc(userRef, {
      ultimoAcesso: new Date().toISOString(),
    })
  } catch (error) {
    // Falha silenciosa - não é crítico
    console.error('Erro ao atualizar último acesso:', error)
  }
}

