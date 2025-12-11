import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { getUserSession, isAdminMaster, type Usuario, type UserRole } from './auth'

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function checkAdminMaster(): void {
  const usuario = getUserSession()
  if (!isAdminMaster(usuario)) {
    throw new Error('Acesso negado. Apenas administradores master podem gerenciar usuários.')
  }
}

export interface NovoUsuario {
  nome: string
  email: string
  senha: string
  role: UserRole
  ativo: boolean
  dataExpiracao: string | null
}

export interface UsuarioCompleto extends Usuario {
  senhaHash?: string
}

export async function listarUsuarios(): Promise<Usuario[]> {
  checkAdminMaster()

  try {
    const q = query(
      collection(db, 'usuarios'),
      orderBy('dataCriacao', 'desc')
    )
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        nome: data.nome,
        email: data.email,
        ativo: data.ativo,
        role: data.role || 'cliente',
        dataCriacao: data.dataCriacao,
        ultimoAcesso: data.ultimoAcesso || null,
        dataExpiracao: data.dataExpiracao || null,
      } as Usuario
    })
  } catch (error) {
    console.error('Erro ao listar usuários:', error)
    throw new Error('Erro ao listar usuários')
  }
}

export async function buscarUsuarioPorId(userId: string): Promise<Usuario | null> {
  checkAdminMaster()

  try {
    const docRef = doc(db, 'usuarios', userId)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    const data = docSnap.data()
    return {
      id: docSnap.id,
      nome: data.nome,
      email: data.email,
      ativo: data.ativo,
      role: data.role || 'cliente',
      dataCriacao: data.dataCriacao,
      ultimoAcesso: data.ultimoAcesso || null,
      dataExpiracao: data.dataExpiracao || null,
    } as Usuario
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    throw new Error('Erro ao buscar usuário')
  }
}

export async function emailExiste(email: string): Promise<boolean> {
  checkAdminMaster()

  try {
    const emailNormalized = email.toLowerCase().trim()
    const q = query(
      collection(db, 'usuarios'),
      where('email', '==', emailNormalized)
    )
    const querySnapshot = await getDocs(q)
    return !querySnapshot.empty
  } catch (error) {
    console.error('Erro ao verificar email:', error)
    return false
  }
}

export async function criarUsuario(dados: NovoUsuario): Promise<string> {
  checkAdminMaster()

  if (!dados.nome || !dados.nome.trim()) {
    throw new Error('Nome é obrigatório')
  }

  if (!dados.email || !dados.email.trim()) {
    throw new Error('Email é obrigatório')
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(dados.email)) {
    throw new Error('Email inválido')
  }

  if (!dados.senha || dados.senha.length < 6) {
    throw new Error('Senha deve ter no mínimo 6 caracteres')
  }

  const existe = await emailExiste(dados.email)
  if (existe) {
    throw new Error('Este email já está cadastrado')
  }

  try {
    const senhaHash = await hashPassword(dados.senha)

    const userData = {
      nome: dados.nome.trim(),
      email: dados.email.toLowerCase().trim(),
      senhaHash: senhaHash,
      role: dados.role || 'cliente',
      ativo: dados.ativo !== undefined ? dados.ativo : true,
      dataCriacao: new Date().toISOString(),
      ultimoAcesso: null,
      dataExpiracao: dados.dataExpiracao || null,
    }

    const docRef = await addDoc(collection(db, 'usuarios'), userData)
    return docRef.id
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error)
    if (error.message) {
      throw error
    }
    throw new Error('Erro ao criar usuário')
  }
}

export async function atualizarUsuario(
  userId: string,
  dados: Partial<Omit<NovoUsuario, 'senha'> & { senha?: string }>
): Promise<void> {
  checkAdminMaster()

  try {
    const docRef = doc(db, 'usuarios', userId)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      throw new Error('Usuário não encontrado')
    }

    const updateData: any = {}

    if (dados.nome !== undefined) {
      updateData.nome = dados.nome.trim()
    }

    if (dados.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(dados.email)) {
        throw new Error('Email inválido')
      }

      const emailNormalized = dados.email.toLowerCase().trim()
      const q = query(
        collection(db, 'usuarios'),
        where('email', '==', emailNormalized)
      )
      const querySnapshot = await getDocs(q)
      const emailExisteEmOutroUsuario = querySnapshot.docs.some(
        (doc) => doc.id !== userId
      )

      if (emailExisteEmOutroUsuario) {
        throw new Error('Este email já está cadastrado')
      }

      updateData.email = emailNormalized
    }

    if (dados.role !== undefined) {
      updateData.role = dados.role
    }

    if (dados.ativo !== undefined) {
      updateData.ativo = dados.ativo
    }

    if (dados.dataExpiracao !== undefined) {
      updateData.dataExpiracao = dados.dataExpiracao
    }

    if (dados.senha !== undefined) {
      if (dados.senha.length < 6) {
        throw new Error('Senha deve ter no mínimo 6 caracteres')
      }
      updateData.senhaHash = await hashPassword(dados.senha)
    }

    await updateDoc(docRef, updateData)
  } catch (error: any) {
    console.error('Erro ao atualizar usuário:', error)
    if (error.message) {
      throw error
    }
    throw new Error('Erro ao atualizar usuário')
  }
}

export async function alterarStatusUsuario(userId: string, ativo: boolean): Promise<void> {
  checkAdminMaster()

  try {
    const docRef = doc(db, 'usuarios', userId)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      throw new Error('Usuário não encontrado')
    }

    const usuarioAtual = getUserSession()
    if (usuarioAtual && usuarioAtual.id === userId && !ativo) {
      throw new Error('Você não pode desativar sua própria conta')
    }

    await updateDoc(docRef, { ativo })
  } catch (error: any) {
    console.error('Erro ao alterar status do usuário:', error)
    if (error.message) {
      throw error
    }
    throw new Error('Erro ao alterar status do usuário')
  }
}

export async function renovarAcessoUsuario(userId: string, novaDataExpiracao: string | null): Promise<void> {
  checkAdminMaster()

  try {
    const docRef = doc(db, 'usuarios', userId)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      throw new Error('Usuário não encontrado')
    }

    await updateDoc(docRef, { dataExpiracao: novaDataExpiracao })
  } catch (error: any) {
    console.error('Erro ao renovar acesso do usuário:', error)
    if (error.message) {
      throw error
    }
    throw new Error('Erro ao renovar acesso do usuário')
  }
}
