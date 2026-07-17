import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { getUserSession, isAdmin, isAdminMaster, isInternalUser, isProprietario, type Usuario, type UserRole } from './auth'

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function getUserManagementContext(): Usuario {
  const usuario = getUserSession()

  if (!usuario) {
    throw new Error('Usuário não autenticado.')
  }

  if (isAdminMaster(usuario)) {
    return usuario
  }

  if (isProprietario(usuario) && usuario.estabelecimentoId) {
    return usuario
  }

  throw new Error('Acesso negado. Você não tem permissão para gerenciar usuários.')
}

function canManageRole(usuario: Usuario, role: UserRole): boolean {
  if (isAdminMaster(usuario)) {
    return true
  }

  if (isProprietario(usuario)) {
    return role === 'profissional'
  }

  return false
}

function canManageTargetUser(usuario: Usuario, target: Record<string, any>): boolean {
  if (isAdminMaster(usuario)) {
    return true
  }

  if (isProprietario(usuario)) {
    if (target.id === usuario.id) {
      return true
    }

    return (
      target.estabelecimentoId === usuario.estabelecimentoId &&
      target.role === 'profissional'
    )
  }

  return false
}

export interface NovoUsuario {
  nome: string
  email: string
  cpf: string
  senha: string
  whatsapp?: string | null
  role: UserRole
  ativo: boolean
  estabelecimentoId?: string | null
  dataExpiracao: string | null
}

export interface UsuarioCompleto extends Usuario {
  senhaHash?: string
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const usuario = getUserManagementContext()

  try {
    const q = isAdminMaster(usuario)
      ? query(collection(db, 'usuarios'))
      : query(collection(db, 'usuarios'), where('estabelecimentoId', '==', usuario.estabelecimentoId))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          nome: data.nome,
          email: data.email,
          cpf: data.cpf || '',
          whatsapp: data.whatsapp || null,
          ativo: data.ativo,
          role: data.role || 'cliente',
          estabelecimentoId: data.estabelecimentoId || null,
          dataCriacao: data.dataCriacao,
          ultimoAcesso: data.ultimoAcesso || null,
          dataExpiracao: data.dataExpiracao || null,
        } as Usuario
      })
      .filter((item) => isAdminMaster(usuario) || canManageTargetUser(usuario, item))
      .sort((a, b) => String(b.dataCriacao || '').localeCompare(String(a.dataCriacao || '')))
  } catch (error) {
    console.error('Erro ao listar usuários:', error)
    throw new Error('Erro ao listar usuários')
  }
}

export async function buscarUsuarioPorId(userId: string): Promise<Usuario | null> {
  const usuario = getUserManagementContext()

  try {
    const docRef = doc(db, 'usuarios', userId)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    const data = docSnap.data()
    if (!canManageTargetUser(usuario, data) && !isAdminMaster(usuario)) {
      throw new Error('Acesso negado.')
    }
    return {
      id: docSnap.id,
      nome: data.nome,
      email: data.email,
      cpf: data.cpf || '',
      whatsapp: data.whatsapp || null,
      ativo: data.ativo,
      role: data.role || 'cliente',
      estabelecimentoId: data.estabelecimentoId || null,
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
  const usuario = getUserManagementContext()

  try {
    const emailNormalized = email.toLowerCase().trim()
    const q = query(
      collection(db, 'usuarios'),
      where('email', '==', emailNormalized)
    )
    const querySnapshot = await getDocs(q)
    if (isAdminMaster(usuario)) {
      return !querySnapshot.empty
    }

    return querySnapshot.docs.some((doc) => canManageTargetUser(usuario, doc.data()))
  } catch (error) {
    console.error('Erro ao verificar email:', error)
    return false
  }
}

export async function criarUsuario(dados: NovoUsuario): Promise<string> {
  const usuario = getUserManagementContext()

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

  if (!dados.cpf || !dados.cpf.trim()) {
    throw new Error('CPF é obrigatório')
  }

  const cpfNumeros = dados.cpf.replace(/\D/g, '')
  if (cpfNumeros.length !== 11) {
    throw new Error('CPF inválido')
  }

  if (!dados.senha || dados.senha.length < 6) {
    throw new Error('Senha deve ter no mínimo 6 caracteres')
  }

  if (!canManageRole(usuario, dados.role)) {
    throw new Error('Você não tem permissão para criar este tipo de usuário.')
  }

  const existe = await emailExiste(dados.email)
  if (existe) {
    throw new Error('Este email já está cadastrado')
  }

  try {
    const senhaHash = await hashPassword(dados.senha)
    const estabelecimentoId = isProprietario(usuario)
      ? usuario.estabelecimentoId || null
      : dados.estabelecimentoId || null

    const userData = {
      nome: dados.nome.trim(),
      email: dados.email.toLowerCase().trim(),
      cpf: dados.cpf.replace(/\D/g, ''),
      whatsapp: dados.whatsapp ? dados.whatsapp.replace(/\D/g, '') : null,
      senhaHash: senhaHash,
      role: dados.role || 'cliente',
      ativo: dados.ativo !== undefined ? dados.ativo : true,
      estabelecimentoId,
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
  dados: Partial<
    Omit<NovoUsuario, 'senha'> & {
      senha?: string
      cpf?: string
      whatsapp?: string | null
    }
  >
): Promise<void> {
  const usuario = getUserManagementContext()

  try {
    const docRef = doc(db, 'usuarios', userId)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      throw new Error('Usuário não encontrado')
    }

    const currentData = docSnap.data()
    if (!canManageTargetUser(usuario, currentData) && !isAdminMaster(usuario)) {
      throw new Error('Você não tem permissão para editar este usuário.')
    }

    const updateData: any = {}

    if (dados.nome !== undefined) {
      updateData.nome = dados.nome.trim()
    }

    if (dados.cpf !== undefined) {
      const cpfNumeros = dados.cpf.replace(/\D/g, '')
      if (cpfNumeros.length !== 11) {
        throw new Error('CPF inválido')
      }
      updateData.cpf = cpfNumeros
    }

    if (dados.whatsapp !== undefined) {
      const whatsappNumeros = String(dados.whatsapp || '').replace(/\D/g, '')
      if (whatsappNumeros && whatsappNumeros.length < 10) {
        throw new Error('WhatsApp deve ter DDD e número válidos')
      }
      updateData.whatsapp = whatsappNumeros || null
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
      const mantendoProprioPapel =
        isProprietario(usuario) &&
        currentData.id === usuario.id &&
        currentData.role === 'proprietario' &&
        dados.role === 'proprietario'

      if (!canManageRole(usuario, dados.role) && !mantendoProprioPapel) {
        throw new Error('Você não tem permissão para definir este tipo de usuário.')
      }
      updateData.role = dados.role
    }

    if (dados.estabelecimentoId !== undefined) {
      updateData.estabelecimentoId = isProprietario(usuario)
        ? usuario.estabelecimentoId || null
        : dados.estabelecimentoId || null
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

export async function listarProfissionaisDisponiveis(estabelecimentoId?: string | null): Promise<Usuario[]> {
  const usuario = getUserSession()
  const podeListar = usuario && isInternalUser(usuario) && (isAdmin(usuario) || usuario.role === 'profissional')

  if (!podeListar) {
    throw new Error('Acesso negado.')
  }

  try {
    const q = query(
      collection(db, 'usuarios'),
      where('ativo', '==', true)
    )
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          nome: data.nome,
          email: data.email,
          cpf: data.cpf || '',
          whatsapp: data.whatsapp || null,
          ativo: data.ativo,
          role: data.role || 'cliente',
          estabelecimentoId: data.estabelecimentoId || null,
          dataCriacao: data.dataCriacao,
          ultimoAcesso: data.ultimoAcesso || null,
          dataExpiracao: data.dataExpiracao || null,
        } as Usuario
      })
      .filter((item) => {
        const isLegacyProfessional = item.role === 'cliente'
        const isProfessional =
          item.role === 'profissional' ||
          item.role === 'proprietario' ||
          isLegacyProfessional

        if (!isProfessional) {
          return false
        }

        if (!estabelecimentoId) {
          return true
        }

        return item.estabelecimentoId === estabelecimentoId
      })
      .sort((a, b) => a.nome.localeCompare(b.nome))
  } catch (error) {
    console.error('Erro ao listar profissionais:', error)
    throw new Error('Erro ao listar profissionais')
  }
}

export async function alterarStatusUsuario(userId: string, ativo: boolean): Promise<void> {
  const usuarioGestor = getUserManagementContext()

  try {
    const docRef = doc(db, 'usuarios', userId)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      throw new Error('Usuário não encontrado')
    }

    if (!canManageTargetUser(usuarioGestor, docSnap.data()) && !isAdminMaster(usuarioGestor)) {
      throw new Error('Você não tem permissão para alterar este usuário.')
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
  const usuario = getUserManagementContext()

  try {
    const docRef = doc(db, 'usuarios', userId)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      throw new Error('Usuário não encontrado')
    }

    if (!canManageTargetUser(usuario, docSnap.data()) && !isAdminMaster(usuario)) {
      throw new Error('Você não tem permissão para renovar o acesso deste usuário.')
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
