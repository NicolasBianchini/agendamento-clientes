import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'

export type UserRole = 'admin_master' | 'admin' | 'cliente'

export interface Usuario {
  id: string
  nome: string
  email: string
  ativo: boolean
  role: UserRole
  dataCriacao: string
  ultimoAcesso: string | null
  dataExpiracao: string | null // Data de expiração do acesso (null = sem expiração)
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

    // Verificar se o acesso está expirado (não bloqueia login, apenas marca)
    // O modal será exibido após o login no Layout

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
      role: userData.role || 'cliente', // Default para 'cliente' se não tiver role
      dataCriacao: userData.dataCriacao,
      ultimoAcesso: userData.ultimoAcesso || null,
      dataExpiracao: userData.dataExpiracao || null,
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

// Função para verificar se o usuário é admin master
export function isAdminMaster(usuario?: Usuario | null): boolean {
  const user = usuario || getUserSession()
  return user?.role === 'admin_master'
}

// Função para verificar se o usuário é admin (master ou admin)
export function isAdmin(usuario?: Usuario | null): boolean {
  const user = usuario || getUserSession()
  return user?.role === 'admin_master' || user?.role === 'admin'
}

// Função para verificar se o acesso do usuário está expirado
export function isAccessExpired(usuario?: Usuario | null): boolean {
  const user = usuario || getUserSession()
  if (!user || !user.dataExpiracao) {
    return false
  }

  // Se for string YYYY-MM-DD, converter usando métodos locais
  let dataExpiracao: Date
  if (typeof user.dataExpiracao === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(user.dataExpiracao)) {
    const [year, month, day] = user.dataExpiracao.split('-').map(Number)
    dataExpiracao = new Date(year, month - 1, day)
  } else {
    dataExpiracao = new Date(user.dataExpiracao)
  }

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  dataExpiracao.setHours(0, 0, 0, 0)

  return dataExpiracao < hoje
}

// Função para verificar se o acesso está expirando em 7 dias ou menos
export function isAccessExpiring(usuario?: Usuario | null): boolean {
  const user = usuario || getUserSession()
  if (!user || !user.dataExpiracao) {
    return false
  }

  // Se for string YYYY-MM-DD, converter usando métodos locais
  let dataExpiracao: Date
  if (typeof user.dataExpiracao === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(user.dataExpiracao)) {
    const [year, month, day] = user.dataExpiracao.split('-').map(Number)
    dataExpiracao = new Date(year, month - 1, day)
  } else {
    dataExpiracao = new Date(user.dataExpiracao)
  }

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  dataExpiracao.setHours(0, 0, 0, 0)

  // Se já expirou, não está expirando (será tratado como expirado)
  if (dataExpiracao < hoje) {
    return false
  }

  // Calcular diferença em dias
  const diffTime = dataExpiracao.getTime() - hoje.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  // Retornar true se faltar 7 dias ou menos para expirar (incluindo hoje, que é 0 dias)
  return diffDays <= 7 && diffDays >= 0
}

// Função para obter quantos dias faltam para expirar
export function getDaysUntilExpiration(usuario?: Usuario | null): number | null {
  const user = usuario || getUserSession()
  if (!user || !user.dataExpiracao) {
    return null
  }

  // Se for string YYYY-MM-DD, converter usando métodos locais
  let dataExpiracao: Date
  if (typeof user.dataExpiracao === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(user.dataExpiracao)) {
    const [year, month, day] = user.dataExpiracao.split('-').map(Number)
    dataExpiracao = new Date(year, month - 1, day)
  } else {
    dataExpiracao = new Date(user.dataExpiracao)
  }

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  dataExpiracao.setHours(0, 0, 0, 0)

  // Calcular diferença em dias
  const diffTime = dataExpiracao.getTime() - hoje.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

