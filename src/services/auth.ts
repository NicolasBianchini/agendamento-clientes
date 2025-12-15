import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'

export type UserRole = 'admin_master' | 'admin' | 'cliente'

export interface Usuario {
  id: string
  nome: string
  email: string
  cpf?: string
  ativo: boolean
  role: UserRole
  dataCriacao: string
  ultimoAcesso: string | null
  dataExpiracao: string | null
}

interface LoginCredentials {
  email: string
  senha: string
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function saveUserSession(usuario: Usuario): void {
  localStorage.setItem('usuario', JSON.stringify(usuario))
  localStorage.setItem('isAuthenticated', 'true')

  // Disparar evento customizado para notificar mudanças de autenticação
  window.dispatchEvent(new Event('auth-changed'))
}

export function clearUserSession(): void {
  localStorage.removeItem('usuario')
  localStorage.removeItem('isAuthenticated')

  // Disparar evento customizado para notificar mudanças de autenticação
  window.dispatchEvent(new Event('auth-changed'))
}

export function getUserSession(): Usuario | null {
  const usuarioStr = localStorage.getItem('usuario')
  if (!usuarioStr) return null

  try {
    return JSON.parse(usuarioStr) as Usuario
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return localStorage.getItem('isAuthenticated') === 'true' && getUserSession() !== null
}

export async function login(credentials: LoginCredentials): Promise<Usuario> {
  const { email, senha } = credentials

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
    const emailNormalized = email.toLowerCase().trim()

    const q = query(
      collection(db, 'usuarios'),
      where('email', '==', emailNormalized)
    )

    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      throw new Error('Email ou senha incorretos')
    }

    const doc = querySnapshot.docs[0]
    const userData = doc.data()

    if (!userData.ativo) {
      throw new Error('Usuário inativo. Entre em contato com o administrador.')
    }

    const senhaHash = await hashPassword(senhaTrimmed)
    const senhaCorreta = userData.senhaHash === senhaHash

    if (!senhaCorreta) {
      throw new Error('Email ou senha incorretos')
    }

    const usuario: Usuario = {
      id: doc.id,
      nome: userData.nome,
      email: userData.email,
      cpf: userData.cpf || '',
      ativo: userData.ativo,
      role: userData.role || 'cliente',
      dataCriacao: userData.dataCriacao,
      ultimoAcesso: userData.ultimoAcesso || null,
      dataExpiracao: userData.dataExpiracao || null,
    }

    saveUserSession(usuario)

    return usuario
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      throw new Error('Erro de permissão. Verifique as regras do Firestore.')
    }

    if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
      throw new Error('Erro de conexão. Verifique sua internet e tente novamente.')
    }

    if (error.message) {
      throw error
    }

    throw new Error('Erro ao fazer login. Tente novamente.')
  }
}

export function logout(): void {
  clearUserSession()
}

export async function updateLastAccess(userId: string): Promise<void> {
  try {
    const { updateDoc, doc } = await import('firebase/firestore')
    const userRef = doc(db, 'usuarios', userId)
    await updateDoc(userRef, {
      ultimoAcesso: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Erro ao atualizar último acesso:', error)
  }
}

export async function refreshUserSession(): Promise<Usuario | null> {
  const usuario = getUserSession()
  if (!usuario) return null

  try {
    const { doc, getDoc } = await import('firebase/firestore')
    const userRef = doc(db, 'usuarios', usuario.id)
    const docSnap = await getDoc(userRef)

    if (!docSnap.exists()) {
      return null
    }

    const userData = docSnap.data()
    const usuarioAtualizado: Usuario = {
      id: docSnap.id,
      nome: userData.nome,
      email: userData.email,
      cpf: userData.cpf || '',
      ativo: userData.ativo,
      role: userData.role || 'cliente',
      dataCriacao: userData.dataCriacao,
      ultimoAcesso: userData.ultimoAcesso || null,
      dataExpiracao: userData.dataExpiracao || null,
    }

    saveUserSession(usuarioAtualizado)

    return usuarioAtualizado
  } catch (error) {
    console.error('Erro ao atualizar sessão do usuário:', error)
    return null
  }
}

export function isAdminMaster(usuario?: Usuario | null): boolean {
  const user = usuario || getUserSession()
  return user?.role === 'admin_master'
}

export function isAdmin(usuario?: Usuario | null): boolean {
  const user = usuario || getUserSession()
  return user?.role === 'admin_master' || user?.role === 'admin'
}

export function isAccessExpired(usuario?: Usuario | null): boolean {
  const user = usuario || getUserSession()

  if (!user) {
    return false
  }

  if (!user.dataExpiracao || user.dataExpiracao.trim() === '') {
    return false
  }

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

export function isAccessExpiring(usuario?: Usuario | null): boolean {
  const user = usuario || getUserSession()

  if (!user) {
    return false
  }

  if (!user.dataExpiracao || user.dataExpiracao.trim() === '') {
    return false
  }

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

  if (dataExpiracao < hoje) {
    return false
  }

  const diffTime = dataExpiracao.getTime() - hoje.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays <= 7 && diffDays >= 0
}

export function getDaysUntilExpiration(usuario?: Usuario | null): number | null {
  const user = usuario || getUserSession()
  if (!user || !user.dataExpiracao) {
    return null
  }

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

  const diffTime = dataExpiracao.getTime() - hoje.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

