import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  QueryConstraint,
  QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { getUserSession, isInternalUser, isAdminMaster, type Usuario } from './auth'
import type { ConfiguracoesUsuario } from '../types/configuracoes'
import { getCache, setCache, removeCache } from './cache'
import { buildCalendarAssociation } from './agendamentoIntegracoes'

export type FirestoreTimestamp = Timestamp
export type FirestoreDocument = QueryDocumentSnapshot<any>

const COLLECTIONS_OPERACIONAIS = new Set([
  'clientes',
  'servicos',
  'agendamentos',
  'profissionalServicos',
  'disponibilidadeProfissional',
  'bloqueiosProfissional',
])

export const toFirestoreDate = (date: Date | string): Timestamp => {
  if (date instanceof Date) {
    return Timestamp.fromDate(date)
  }

  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number)
    const localDate = new Date(year, month - 1, day, 0, 0, 0, 0)
    return Timestamp.fromDate(localDate)
  }

  return Timestamp.fromDate(new Date(date))
}

export const fromFirestoreDate = (timestamp: Timestamp): Date => {
  return timestamp.toDate()
}

const getCurrentUser = (): Usuario => {
  const usuario = getUserSession()
  if (!usuario || !usuario.id) {
    throw new Error('Usuário não autenticado. Faça login novamente.')
  }
  return usuario
}

const getCurrentUserId = (): string => {
  return getCurrentUser().id
}

type ScopeFilter = {
  field: 'userId' | 'estabelecimentoId' | 'profissionalId' | 'clienteUserId'
  value: string
}

const getCollectionScopeFilters = (collectionName: string): ScopeFilter[] => {
  const usuario = getCurrentUser()

  if (isAdminMaster(usuario) && !usuario.estabelecimentoId) {
    return [{ field: 'userId', value: usuario.id }]
  }

  if (collectionName === 'agendamentos' && usuario.role === 'profissional') {
    return [
      { field: 'profissionalId', value: usuario.id },
      { field: 'userId', value: usuario.id },
    ]
  }

  if (collectionName === 'agendamentos' && usuario.role === 'cliente') {
    return [
      { field: 'clienteUserId', value: usuario.id },
      { field: 'userId', value: usuario.id },
    ]
  }

  if (
    COLLECTIONS_OPERACIONAIS.has(collectionName) &&
    isInternalUser(usuario) &&
    usuario.estabelecimentoId
  ) {
    return [
      { field: 'estabelecimentoId', value: usuario.estabelecimentoId },
      { field: 'userId', value: usuario.id },
    ]
  }

  return [{ field: 'userId', value: usuario.id }]
}

const hasCollectionAccess = (
  collectionName: string,
  docData: Record<string, any>,
  usuario: Usuario
): boolean => {
  if (collectionName === 'agendamentos' && usuario.role === 'profissional') {
    return docData.profissionalId === usuario.id || docData.userId === usuario.id
  }

  if (collectionName === 'agendamentos' && usuario.role === 'cliente') {
    return docData.clienteUserId === usuario.id || docData.userId === usuario.id
  }

  if (
    COLLECTIONS_OPERACIONAIS.has(collectionName) &&
    isInternalUser(usuario) &&
    usuario.estabelecimentoId &&
    docData.estabelecimentoId === usuario.estabelecimentoId
  ) {
    return true
  }

  return docData.userId === usuario.id
}

const sortAgendamentosByHorarioAsc = <T extends Record<string, any>>(items: T[]): T[] =>
  items.sort((a, b) => String(a.horario || '').localeCompare(String(b.horario || '')))

const sortAgendamentosByDataDesc = <T extends Record<string, any>>(items: T[]): T[] =>
  items.sort((a, b) => {
    const dataCompare = String(b.data || '').localeCompare(String(a.data || ''))
    if (dataCompare !== 0) {
      return dataCompare
    }
    return String(b.horario || '').localeCompare(String(a.horario || ''))
  })

const fetchAgendamentosByDateRange = async (
  start: Date,
  end: Date
): Promise<Record<string, any>[]> => {
  const usuario = getCurrentUser()
  const q = query(
    collection(db, 'agendamentos'),
    where('data', '>=', Timestamp.fromDate(start)),
    where('data', '<=', Timestamp.fromDate(end))
  )
  const snapshot = await getDocs(q)

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((item) => hasCollectionAccess('agendamentos', item, usuario))
}

export const getDocument = async <T = any>(
  collectionName: string,
  documentId: string
): Promise<T | null> => {
  try {
    const usuario = getCurrentUser()
    const docRef = doc(db, collectionName, documentId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      if (!hasCollectionAccess(collectionName, data, usuario)) {
        return null
      }
      return { id: docSnap.id, ...data } as T
    }
    return null
  } catch (error) {
    console.error(`Erro ao buscar documento ${documentId} em ${collectionName}:`, error)
    throw error
  }
}

export const getDocuments = async <T = any>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  useCache: boolean = true
): Promise<T[]> => {
  try {
    const cacheKey = `${collectionName}_${JSON.stringify(constraints)}`

    if (useCache && constraints.length <= 1) {
      const cached = getCache<T[]>(cacheKey)
      if (cached) {
        return cached
      }
    }

    const filters = getCollectionScopeFilters(collectionName)
    const documentsMap = new Map<string, T>()

    for (const filter of filters) {
      const q = query(
        collection(db, collectionName),
        where(filter.field, '==', filter.value),
        ...constraints
      )
      const querySnapshot = await getDocs(q)

      querySnapshot.docs.forEach((doc) => {
        documentsMap.set(doc.id, {
          id: doc.id,
          ...doc.data(),
        } as T)
      })
    }

    const results = Array.from(documentsMap.values())

    if (useCache && constraints.length <= 1) {
      setCache(cacheKey, results, 5 * 60 * 1000)
    }

    return results
  } catch (error) {
    console.error(`Erro ao buscar documentos de ${collectionName}:`, error)
    throw error
  }
}

export const createDocument = async <T = any>(
  collectionName: string,
  data: Omit<T, 'id'>
): Promise<string> => {
  try {
    const { getUserSession, isAccessExpired } = await import('./auth')
    const usuarioSessao = getUserSession()
    if (isAccessExpired(usuarioSessao)) {
      throw new Error('Seu acesso expirou. Você pode apenas visualizar os dados existentes. Entre em contato com o administrador para renovar seu acesso.')
    }

    const usuario = getCurrentUser()
    const userId = usuario.id
    const estabelecimentoId =
      COLLECTIONS_OPERACIONAIS.has(collectionName) && usuario.estabelecimentoId
        ? usuario.estabelecimentoId
        : null

    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      userId,
      ...(estabelecimentoId ? { estabelecimentoId } : {}),
    } as any)

    clearCollectionCache(collectionName)

    return docRef.id
  } catch (error) {
    console.error(`Erro ao criar documento em ${collectionName}:`, error)
    throw error
  }
}

function clearCollectionCache(collectionName: string): void {
  try {
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (key.includes(collectionName)) {
        removeCache(key.replace('agendamento_cache_', ''))
      }
    })
  } catch (error) {
    console.warn('Erro ao limpar cache da coleção:', error)
  }
}

export const updateDocument = async <T = any>(
  collectionName: string,
  documentId: string,
  data: Partial<Omit<T, 'id'>>
): Promise<void> => {
  try {
    const usuario = getCurrentUser()
    const docRef = doc(db, collectionName, documentId)

    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) {
      throw new Error('Documento não encontrado')
    }
    const docData = docSnap.data()
    if (!hasCollectionAccess(collectionName, docData, usuario)) {
      throw new Error('Você não tem permissão para atualizar este documento')
    }

    await updateDoc(docRef, data as any)

    clearCollectionCache(collectionName)
  } catch (error) {
    console.error(`Erro ao atualizar documento ${documentId} em ${collectionName}:`, error)
    throw error
  }
}

export const deleteDocument = async (
  collectionName: string,
  documentId: string
): Promise<void> => {
  try {
    const usuario = getCurrentUser()
    const docRef = doc(db, collectionName, documentId)

    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) {
      throw new Error('Documento não encontrado')
    }
    const docData = docSnap.data()
    if (!hasCollectionAccess(collectionName, docData, usuario)) {
      throw new Error('Você não tem permissão para excluir este documento')
    }

    await deleteDoc(docRef)

    clearCollectionCache(collectionName)
  } catch (error) {
    console.error(`Erro ao excluir documento ${documentId} de ${collectionName}:`, error)
    throw error
  }
}

export const clientesService = {
  collection: 'clientes',

  getAll: () => getDocuments('clientes'),

  getById: (id: string) => getDocument('clientes', id),

  create: async (data: Omit<any, 'id'>) => {
    const usuario = getCurrentUser()
    return clientesService.upsertProfile({
      ...data,
      estabelecimentoId: data.estabelecimentoId || usuario.estabelecimentoId || null,
      userId: usuario.id,
    })
  },

  update: async (id: string, data: Partial<Omit<any, 'id'>>) => {
    const atual = await clientesService.getById(id)
    if (!atual) {
      throw new Error('Cliente não encontrado')
    }

    const payload = {
      ...atual,
      ...data,
    }

    const emailNormalizado = String(payload.email || '').trim().toLowerCase()
    const telefoneNormalizado = String(payload.telefone || '').replace(/\D/g, '')
    const identificador = payload.clienteUserId || emailNormalizado || telefoneNormalizado

    await updateDocument('clientes', id, {
      ...data,
      email: emailNormalizado,
      telefone: telefoneNormalizado,
      identificador,
    })
  },

  delete: (id: string) => deleteDocument('clientes', id),

  search: async (searchTerm: string) => {
    const clientes = await clientesService.getAll()
    const termoNormalizado = searchTerm.trim().toLowerCase()

    return clientes.filter((cliente: any) =>
      String(cliente.nome || '').toLowerCase().includes(termoNormalizado) ||
      String(cliente.email || '').toLowerCase().includes(termoNormalizado) ||
      String(cliente.telefone || '').includes(searchTerm.replace(/\D/g, ''))
    )
  },

  getByClienteUserId: async (clienteUserId: string) => {
    return getDocuments('clientes', [
      where('clienteUserId', '==', clienteUserId),
      orderBy('nome'),
    ])
  },

  upsertProfile: async (data: Record<string, any>): Promise<string> => {
    const estabelecimentoId = data.estabelecimentoId || null
    const emailNormalizado = String(data.email || '').trim().toLowerCase()
    const telefoneNormalizado = String(data.telefone || '').replace(/\D/g, '')
    const clienteUserId = data.clienteUserId || null
    const identificador = clienteUserId || emailNormalizado || telefoneNormalizado

    if (!data.nome || String(data.nome).trim().length < 2) {
      throw new Error('Nome é obrigatório')
    }

    if (!telefoneNormalizado || telefoneNormalizado.length < 10) {
      throw new Error('Telefone é obrigatório')
    }

    if (!emailNormalizado) {
      throw new Error('Email é obrigatório')
    }

    const todosClientes = estabelecimentoId
      ? await getDocs(query(collection(db, 'clientes'), where('estabelecimentoId', '==', estabelecimentoId)))
      : await getDocs(collection(db, 'clientes'))

    const existente = todosClientes.docs.find((doc) => {
      const current = doc.data()
      return (
        (clienteUserId && current.clienteUserId === clienteUserId) ||
        current.email === emailNormalizado ||
        current.telefone === telefoneNormalizado
      )
    })

    const payload = {
      nome: String(data.nome).trim(),
      telefone: telefoneNormalizado,
      email: emailNormalizado,
      observacoes: data.observacoes?.trim() || null,
      clienteUserId,
      identificador,
      estabelecimentoId,
      dataCadastro: data.dataCadastro || new Date().toISOString(),
      userId: data.userId || '',
    }

    if (existente) {
      await updateDoc(existente.ref, {
        ...payload,
        dataAtualizacao: Timestamp.now(),
      })
      clearCollectionCache('clientes')
      return existente.id
    }

    const docRef = await addDoc(collection(db, 'clientes'), {
      ...payload,
      dataCriacao: Timestamp.now(),
      dataAtualizacao: Timestamp.now(),
    })
    clearCollectionCache('clientes')
    return docRef.id
  },
}

export const estabelecimentosService = {
  collection: 'estabelecimentos',

  getAll: async () => {
    const usuario = getCurrentUser()

    if (isAdminMaster(usuario)) {
      const q = query(collection(db, 'estabelecimentos'), orderBy('nome'))
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    }

    if (!usuario.estabelecimentoId) {
      return []
    }

    const estabelecimento = await estabelecimentosService.getById(usuario.estabelecimentoId)
    return estabelecimento ? [estabelecimento] : []
  },

  getById: async (id: string) => {
    const usuario = getCurrentUser()
    if (!isAdminMaster(usuario) && usuario.estabelecimentoId !== id) {
      return null
    }

    const docRef = doc(db, 'estabelecimentos', id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    }
  },

  create: async (data: Omit<any, 'id'>) => {
    if (!isAdminMaster()) {
      throw new Error('Você não tem permissão para criar estabelecimentos.')
    }

    const docRef = await addDoc(collection(db, 'estabelecimentos'), {
      ...data,
      dataCriacao: Timestamp.now(),
      dataAtualizacao: Timestamp.now(),
      criadoPor: getCurrentUserId(),
    })
    return docRef.id
  },

  update: async (id: string, data: Partial<Omit<any, 'id'>>) => {
    if (!isAdminMaster()) {
      throw new Error('Você não tem permissão para atualizar estabelecimentos.')
    }

    const docRef = doc(db, 'estabelecimentos', id)
    await updateDoc(docRef, {
      ...data,
      dataAtualizacao: Timestamp.now(),
    })
  },

  delete: async (id: string) => {
    if (!isAdminMaster()) {
      throw new Error('Você não tem permissão para excluir estabelecimentos.')
    }

    await deleteDoc(doc(db, 'estabelecimentos', id))
  },
}

export const servicosService = {
  collection: 'servicos',

  getAll: async () => {
    const items = await getDocuments('servicos')
    return items.sort((a: any, b: any) => String(a.nome || '').localeCompare(String(b.nome || '')))
  },

  getById: (id: string) => getDocument('servicos', id),

  getActive: async () => {
    const items = await getDocuments('servicos', [
      where('ativo', '==', true),
    ])
    return items.sort((a: any, b: any) => String(a.nome || '').localeCompare(String(b.nome || '')))
  },

  create: (data: Omit<any, 'id'>) => createDocument('servicos', data),

  update: (id: string, data: Partial<Omit<any, 'id'>>) =>
    updateDocument('servicos', id, data),

  delete: (id: string) => deleteDocument('servicos', id),
}

export const profissionalServicosService = {
  collection: 'profissionalServicos',

  getAll: () => getDocuments('profissionalServicos', [orderBy('profissionalNome')]),

  getByProfissional: async (profissionalId: string) => {
    const items = await getDocuments('profissionalServicos', [
      where('profissionalId', '==', profissionalId),
    ])
    return items.sort((a: any, b: any) => String(a.servicoNome || '').localeCompare(String(b.servicoNome || '')))
  },

  getByEstabelecimentoAndServico: async (estabelecimentoId: string, servicoId: string) => {
    const items = await getDocuments('profissionalServicos', [
      where('estabelecimentoId', '==', estabelecimentoId),
      where('servicoId', '==', servicoId),
    ], false)
    return items.sort((a: any, b: any) => String(a.profissionalNome || '').localeCompare(String(b.profissionalNome || '')))
  },

  upsertMany: async (profissional: Record<string, any>, servicos: Array<Record<string, any>>) => {
    const existentes = await profissionalServicosService.getByProfissional(profissional.id)
    const existentesIds = new Set(existentes.map((item: any) => item.servicoId))
    const novosIds = new Set(servicos.map((item) => item.id))

    await Promise.all(
      existentes
        .filter((item: any) => !novosIds.has(item.servicoId))
        .map((item: any) => profissionalServicosService.delete(item.id))
    )

    for (const servico of servicos) {
      if (existentesIds.has(servico.id)) {
        continue
      }

      await createDocument('profissionalServicos', {
        estabelecimentoId: profissional.estabelecimentoId || null,
        profissionalId: profissional.id,
        profissionalNome: profissional.nome,
        servicoId: servico.id,
        servicoNome: servico.nome,
      })
    }
  },

  delete: (id: string) => deleteDocument('profissionalServicos', id),
}

export const disponibilidadeProfissionalService = {
  collection: 'disponibilidadeProfissional',

  getByProfissional: async (profissionalId: string) => {
    const items = await getDocuments('disponibilidadeProfissional', [
      where('profissionalId', '==', profissionalId),
    ])
    return items.sort((a: any, b: any) => Number(a.diaSemana || 0) - Number(b.diaSemana || 0))
  },

  replaceForProfissional: async (profissional: Record<string, any>, disponibilidades: Array<Record<string, any>>) => {
    const existentes = await disponibilidadeProfissionalService.getByProfissional(profissional.id)
    await Promise.all(existentes.map((item: any) => deleteDocument('disponibilidadeProfissional', item.id)))

    for (const disponibilidade of disponibilidades) {
      await createDocument('disponibilidadeProfissional', {
        estabelecimentoId: profissional.estabelecimentoId || null,
        profissionalId: profissional.id,
        profissionalNome: profissional.nome,
        diaSemana: disponibilidade.diaSemana,
        inicio: disponibilidade.inicio,
        fim: disponibilidade.fim,
        ativo: disponibilidade.ativo !== false,
      })
    }
  },
}

export const bloqueiosProfissionalService = {
  collection: 'bloqueiosProfissional',

  getByProfissional: async (profissionalId: string) => {
    const items = await getDocuments('bloqueiosProfissional', [
      where('profissionalId', '==', profissionalId),
    ])
    return items.sort((a: any, b: any) => String(a.dataInicio || '').localeCompare(String(b.dataInicio || '')))
  },

  create: (data: Omit<any, 'id'>) => createDocument('bloqueiosProfissional', data),

  delete: (id: string) => deleteDocument('bloqueiosProfissional', id),
}

export const agendamentosService = {
  collection: 'agendamentos',

  getAll: async () => {
    const items = await getDocuments('agendamentos')
    return items.sort((a: any, b: any) => {
      const dataCompare = String(b.data || '').localeCompare(String(a.data || ''))
      if (dataCompare !== 0) {
        return dataCompare
      }
      return String(b.horario || '').localeCompare(String(a.horario || ''))
    })
  },

  getById: (id: string) => getDocument('agendamentos', id),

  getByDate: async (date: string | Date) => {
    let dateStr: string
    if (date instanceof Date) {
      dateStr = date.toISOString().split('T')[0]
    } else if (typeof date === 'string') {
      dateStr = date.split('T')[0]
    } else {
      throw new Error('Data inválida')
    }

    const [year, month, day] = dateStr.split('-').map(Number)
    const startOfDayLocal = new Date(year, month - 1, day, 0, 0, 0, 0)
    const endOfDayLocal = new Date(year, month - 1, day, 23, 59, 59, 999)

    const resultados = await fetchAgendamentosByDateRange(startOfDayLocal, endOfDayLocal)

    return sortAgendamentosByHorarioAsc(resultados)
  },

  getByDateRange: async (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    const items = await fetchAgendamentosByDateRange(start, end)
    return items.sort((a: any, b: any) => {
      const dataCompare = String(a.data || '').localeCompare(String(b.data || ''))
      if (dataCompare !== 0) {
        return dataCompare
      }
      return String(a.horario || '').localeCompare(String(b.horario || ''))
    })
  },

  getByCliente: async (clienteId: string) => {
    const items = await getDocuments('agendamentos', [
      where('clienteId', '==', clienteId),
    ])
    return items.sort((a: any, b: any) => {
      const dataCompare = String(b.data || '').localeCompare(String(a.data || ''))
      if (dataCompare !== 0) {
        return dataCompare
      }
      return String(b.horario || '').localeCompare(String(a.horario || ''))
    })
  },

  getByClienteUserId: async (clienteUserId: string) => {
    const q = query(collection(db, 'agendamentos'), where('clienteUserId', '==', clienteUserId))
    const snapshot = await getDocs(q)
    const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
    return sortAgendamentosByDataDesc(items)
  },

  getByProfissional: async (profissionalId: string) => {
    const items = await getDocuments('agendamentos', [
      where('profissionalId', '==', profissionalId),
    ])
    return items.sort((a: any, b: any) => {
      const dataCompare = String(b.data || '').localeCompare(String(a.data || ''))
      if (dataCompare !== 0) {
        return dataCompare
      }
      return String(b.horario || '').localeCompare(String(a.horario || ''))
    })
  },

  getByStatus: async (status: 'agendado' | 'concluido' | 'cancelado') => {
    const items = await getDocuments('agendamentos', [
      where('status', '==', status),
    ])
    return items.sort((a: any, b: any) => {
      const dataCompare = String(b.data || '').localeCompare(String(a.data || ''))
      if (dataCompare !== 0) {
        return dataCompare
      }
      return String(b.horario || '').localeCompare(String(a.horario || ''))
    })
  },

  getConcluidos: () => agendamentosService.getByStatus('concluido'),

  create: (data: Omit<any, 'id'>) => createDocument('agendamentos', data),

  update: (id: string, data: Partial<Omit<any, 'id'>>) =>
    updateDocument('agendamentos', id, data),

  delete: (id: string) => deleteDocument('agendamentos', id),

  checkTimeConflict: async (
    estabelecimentoId: string,
    data: string,
    horario: string,
    profissionalId?: string | null,
    excludeId?: string
  ) => {
    const inicio = new Date(`${data}T00:00:00`)
    const fim = new Date(`${data}T23:59:59`)
    const q = query(
      collection(db, 'agendamentos'),
      where('data', '>=', Timestamp.fromDate(inicio)),
      where('data', '<=', Timestamp.fromDate(fim))
    )
    const snapshot = await getDocs(q)
    const agendamentos = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((item: any) => item.estabelecimentoId === estabelecimentoId)

    return agendamentos.some(
      (ag: any) =>
        ag.horario === horario &&
        ag.status === 'agendado' &&
        (profissionalId ? ag.profissionalId === profissionalId : true) &&
        ag.id !== excludeId
    )
  },
}

const normalizeDateString = (input: any): string => {
  if (!input) return ''
  if (input?.toDate && typeof input.toDate === 'function') {
    return input.toDate().toISOString().split('T')[0]
  }
  if (input instanceof Date) {
    return input.toISOString().split('T')[0]
  }
  if (typeof input === 'string') {
    return input.split('T')[0]
  }
  return ''
}

const getWeekdayFromDate = (dateStr: string): number => {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).getDay()
}

const buildSlots = (inicio: string, fim: string, intervalo: number): string[] => {
  const slots: string[] = []
  const [inicioHora, inicioMinuto] = inicio.split(':').map(Number)
  const [fimHora, fimMinuto] = fim.split(':').map(Number)
  const start = inicioHora * 60 + inicioMinuto
  const end = fimHora * 60 + fimMinuto

  for (let minutes = start; minutes < end; minutes += intervalo) {
    const hora = Math.floor(minutes / 60)
    const minuto = minutes % 60
    slots.push(`${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`)
  }

  return slots
}

export const autoAgendamentoService = {
  listarEstabelecimentos: async () => {
    const q = query(
      collection(db, 'estabelecimentos'),
      where('ativo', '==', true)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => String(a.nome || '').localeCompare(String(b.nome || '')))
  },

  listarServicosPorEstabelecimento: async (estabelecimentoId: string) => {
    const q = query(
      collection(db, 'servicos'),
      where('estabelecimentoId', '==', estabelecimentoId),
      where('ativo', '==', true)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => String(a.nome || '').localeCompare(String(b.nome || '')))
  },

  listarProfissionaisPorServico: async (estabelecimentoId: string, servicoId: string) => {
    const q = query(
      collection(db, 'profissionalServicos'),
      where('estabelecimentoId', '==', estabelecimentoId),
      where('servicoId', '==', servicoId)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) =>
        String(a.profissionalNome || '').localeCompare(String(b.profissionalNome || ''))
      ) as Array<{ id: string; profissionalId: string; profissionalNome: string }>
  },

  listarHorariosDisponiveis: async (params: {
    estabelecimentoId: string
    servicoId: string
    data: string
    profissionalId?: string | null
  }) => {
    const estabelecimento = await getDoc(doc(db, 'estabelecimentos', params.estabelecimentoId))
    if (!estabelecimento.exists()) {
      return []
    }

    const estabelecimentoData = estabelecimento.data()
    const intervalo = Number(estabelecimentoData.intervaloMinutos || 30)
    const profissionaisBase = await autoAgendamentoService.listarProfissionaisPorServico(
      params.estabelecimentoId,
      params.servicoId
    )
    const profissionais = params.profissionalId
      ? profissionaisBase.filter((profissional: any) => profissional.profissionalId === params.profissionalId)
      : profissionaisBase
    const weekday = getWeekdayFromDate(params.data)
    const horariosDisponiveis: Array<{ horario: string; profissionalId: string; profissionalNome: string }> = []

    for (const profissional of profissionais) {
      const disponibilidadeQuery = query(
        collection(db, 'disponibilidadeProfissional'),
        where('profissionalId', '==', profissional.profissionalId),
        where('diaSemana', '==', weekday)
      )
      const disponibilidadeSnapshot = await getDocs(disponibilidadeQuery)
      const disponibilidade = disponibilidadeSnapshot.docs
        .map((item) => item.data())
        .find((item) => item.ativo !== false)

      if (!disponibilidade) {
        continue
      }

      const bloqueiosQuery = query(
        collection(db, 'bloqueiosProfissional'),
        where('profissionalId', '==', profissional.profissionalId)
      )
      const [bloqueiosSnapshot, agendamentosDoDia] = await Promise.all([
        getDocs(bloqueiosQuery),
        autoAgendamentoService.listarAgendamentosDoDia(params.estabelecimentoId, profissional.profissionalId, params.data),
      ])

      const bloqueios = bloqueiosSnapshot.docs.map((item) => item.data())
      const slots = buildSlots(disponibilidade.inicio, disponibilidade.fim, intervalo)

      for (const horario of slots) {
        const temAgendamento = agendamentosDoDia.some((agendamento: any) => agendamento.horario === horario && agendamento.status === 'agendado')
        const bloqueado = bloqueios.some((bloqueio) => {
          const inicioData = normalizeDateString(bloqueio.dataInicio)
          const fimData = normalizeDateString(bloqueio.dataFim)
          if (params.data < inicioData || params.data > fimData) {
            return false
          }

          if (!bloqueio.horarioInicio || !bloqueio.horarioFim) {
            return true
          }

          return horario >= bloqueio.horarioInicio && horario <= bloqueio.horarioFim
        })

        if (!temAgendamento && !bloqueado) {
          horariosDisponiveis.push({
            horario,
            profissionalId: profissional.profissionalId,
            profissionalNome: profissional.profissionalNome,
          })
        }
      }
    }

    return horariosDisponiveis.sort((a, b) => a.horario.localeCompare(b.horario))
  },

  listarAgendamentosDoDia: async (estabelecimentoId: string, profissionalId: string, data: string) => {
    const inicio = new Date(`${data}T00:00:00`)
    const fim = new Date(`${data}T23:59:59`)
    const q = query(
      collection(db, 'agendamentos'),
      where('data', '>=', Timestamp.fromDate(inicio)),
      where('data', '<=', Timestamp.fromDate(fim))
    )
    const snapshot = await getDocs(q)
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter(
        (item: any) =>
          item.estabelecimentoId === estabelecimentoId &&
          item.profissionalId === profissionalId
      )
      .sort((a: any, b: any) => String(a.horario || '').localeCompare(String(b.horario || '')))
  },

  criarAgendamento: async (payload: Record<string, any>): Promise<string> => {
    const conflito = await agendamentosService.checkTimeConflict(
      payload.estabelecimentoId,
      payload.data,
      payload.horario,
      payload.profissionalId || null
    )

    if (conflito) {
      throw new Error('Este horário não está mais disponível para o profissional selecionado.')
    }

    const [estabelecimentoSnap, servicoSnap] = await Promise.all([
      getDoc(doc(db, 'estabelecimentos', payload.estabelecimentoId)),
      getDoc(doc(db, 'servicos', payload.servicoId)),
    ])

    const estabelecimentoData = estabelecimentoSnap.exists() ? estabelecimentoSnap.data() : null
    const servicoData = servicoSnap.exists() ? servicoSnap.data() : null
    const intervalo = Number(estabelecimentoData?.intervaloMinutos || 30)

    const clienteId = await clientesService.upsertProfile({
      nome: payload.clienteNome,
      telefone: payload.clienteTelefone,
      email: payload.clienteEmail,
      clienteUserId: payload.clienteUserId || null,
      estabelecimentoId: payload.estabelecimentoId,
      userId: payload.clienteUserId || '',
      dataCadastro: new Date().toISOString(),
    })

    const calendarEvent = buildCalendarAssociation(
      {
        data: payload.data,
        horario: payload.horario,
        clienteNome: payload.clienteNome,
        clienteTelefone: payload.clienteTelefone,
        clienteEmail: payload.clienteEmail,
        servicoNome: servicoData?.nome || null,
        profissionalNome: payload.profissionalNome || null,
        estabelecimentoNome: estabelecimentoData?.nome || null,
        status: 'agendado',
      },
      intervalo
    )

    const docRef = await addDoc(collection(db, 'agendamentos'), {
      estabelecimentoId: payload.estabelecimentoId,
      estabelecimentoNome: estabelecimentoData?.nome || null,
      clienteId,
      clienteUserId: payload.clienteUserId || null,
      clienteNome: payload.clienteNome,
      clienteTelefone: payload.clienteTelefone,
      clienteEmail: payload.clienteEmail,
      servicoId: payload.servicoId,
      servicoNome: servicoData?.nome || null,
      servicoValor: servicoData?.valor || null,
      profissionalId: payload.profissionalId,
      profissionalNome: payload.profissionalNome || null,
      data: toFirestoreDate(payload.data),
      horario: payload.horario,
      observacoes: payload.observacoes || null,
      status: 'agendado',
      remarcadoDeId: payload.remarcadoDeId || null,
      calendarEvent,
      userId: payload.clienteUserId || '',
      dataCriacao: Timestamp.now(),
    })

    clearCollectionCache('agendamentos')
    return docRef.id
  },
}

export const configuracoesService = {
  collection: 'configuracoes',

  getByUserId: async (userId: string): Promise<ConfiguracoesUsuario | null> => {
    try {
      const q = query(
        collection(db, 'configuracoes'),
        where('userId', '==', userId),
        limit(1)
      )
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0]
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          whatsappSuporte: data.whatsappSuporte ?? '',
          whatsappNotificacoesAtivo: data.whatsappNotificacoesAtivo ?? false,
          whatsappTemplateConfirmacao: data.whatsappTemplateConfirmacao ?? '',
          whatsappTemplateLembrete: data.whatsappTemplateLembrete ?? '',
          whatsappTemplateCancelamento: data.whatsappTemplateCancelamento ?? '',
          backendNotificacoesUrl: data.backendNotificacoesUrl ?? '',
          calendarioIntegrado: data.calendarioIntegrado ?? false,
          calendarioTitulo: data.calendarioTitulo ?? '',
          permiteCancelamentoCliente: data.permiteCancelamentoCliente ?? true,
          permiteRemarcacaoCliente: data.permiteRemarcacaoCliente ?? true,
          antecedenciaCancelamentoHoras: data.antecedenciaCancelamentoHoras ?? 24,
          antecedenciaRemarcacaoHoras: data.antecedenciaRemarcacaoHoras ?? 24,
        } as ConfiguracoesUsuario
      }
      return null
    } catch (error) {
      console.error('Erro ao buscar configurações:', error)
      throw error
    }
  },

  getMinhas: async (): Promise<ConfiguracoesUsuario | null> => {
    const userId = getCurrentUserId()
    return configuracoesService.getByUserId(userId)
  },

  save: async (config: Partial<Omit<ConfiguracoesUsuario, 'id'>>): Promise<string> => {
    try {
      const userId = getCurrentUserId()

      const existente = await configuracoesService.getByUserId(userId)

      if (existente) {
        const docRef = doc(db, 'configuracoes', existente.id!)
        const updateData: Record<string, unknown> = {
          ...config,
          userId,
          whatsappSuporte: config.whatsappSuporte ?? '',
          whatsappNotificacoesAtivo: config.whatsappNotificacoesAtivo ?? false,
          whatsappTemplateConfirmacao: config.whatsappTemplateConfirmacao ?? '',
          whatsappTemplateLembrete: config.whatsappTemplateLembrete ?? '',
          whatsappTemplateCancelamento: config.whatsappTemplateCancelamento ?? '',
          backendNotificacoesUrl: config.backendNotificacoesUrl ?? '',
          calendarioIntegrado: config.calendarioIntegrado ?? false,
          calendarioTitulo: config.calendarioTitulo ?? '',
          permiteCancelamentoCliente: config.permiteCancelamentoCliente ?? true,
          permiteRemarcacaoCliente: config.permiteRemarcacaoCliente ?? true,
          antecedenciaCancelamentoHoras: config.antecedenciaCancelamentoHoras ?? 24,
          antecedenciaRemarcacaoHoras: config.antecedenciaRemarcacaoHoras ?? 24,
          dataAtualizacao: Timestamp.now(),
        }
        await updateDoc(docRef, updateData)
        return existente.id!
      } else {
        const newData: Record<string, unknown> = {
          ...config,
          userId,
          whatsappSuporte: config.whatsappSuporte ?? '',
          whatsappNotificacoesAtivo: config.whatsappNotificacoesAtivo ?? false,
          whatsappTemplateConfirmacao: config.whatsappTemplateConfirmacao ?? '',
          whatsappTemplateLembrete: config.whatsappTemplateLembrete ?? '',
          whatsappTemplateCancelamento: config.whatsappTemplateCancelamento ?? '',
          backendNotificacoesUrl: config.backendNotificacoesUrl ?? '',
          calendarioIntegrado: config.calendarioIntegrado ?? false,
          calendarioTitulo: config.calendarioTitulo ?? '',
          permiteCancelamentoCliente: config.permiteCancelamentoCliente ?? true,
          permiteRemarcacaoCliente: config.permiteRemarcacaoCliente ?? true,
          antecedenciaCancelamentoHoras: config.antecedenciaCancelamentoHoras ?? 24,
          antecedenciaRemarcacaoHoras: config.antecedenciaRemarcacaoHoras ?? 24,
          dataCriacao: Timestamp.now(),
          dataAtualizacao: Timestamp.now(),
        }
        const docRef = await addDoc(collection(db, 'configuracoes'), newData)
        return docRef.id
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      throw error
    }
  },

  getWhatsappSuporteAdminMaster: async (): Promise<string> => {
    try {
      const usuariosQuery = query(
        collection(db, 'usuarios'),
        where('role', '==', 'admin_master'),
        where('ativo', '==', true),
        limit(1)
      )
      const usuariosSnapshot = await getDocs(usuariosQuery)

      if (usuariosSnapshot.empty) {
        return ''
      }

      const adminMasterId = usuariosSnapshot.docs[0].id

      const config = await configuracoesService.getByUserId(adminMasterId)

      return config?.whatsappSuporte || ''
    } catch (error) {
      console.error('Erro ao buscar WhatsApp de suporte do admin master:', error)
      return ''
    }
  },

  getComPadroes: async (): Promise<ConfiguracoesUsuario> => {
    const whatsappSuporteAdmin = await configuracoesService.getWhatsappSuporteAdminMaster()

    try {
      const userId = getCurrentUserId()
      const config = await configuracoesService.getByUserId(userId)

      if (config) {
        return {
          ...config,
          whatsappSuporte: whatsappSuporteAdmin || config.whatsappSuporte || '',
        }
      }

      return {
        userId,
        horarioInicial: '06:00',
        horarioFinal: '23:00',
        intervaloMinutos: 30,
        tema: 'claro',
        template: 'padrao',
        visualizacaoAgendaPadrao: 'dia',
        notificacoesEmail: false,
        notificacoesPush: false,
        lembrarAgendamentos: true,
        permiteCancelamentoCliente: true,
        permiteRemarcacaoCliente: true,
        antecedenciaCancelamentoHoras: 24,
        antecedenciaRemarcacaoHoras: 24,
        moeda: 'BRL',
        formatoData: 'DD/MM/YYYY',
        formatoHora: '24h',
        whatsappSuporte: whatsappSuporteAdmin,
        whatsappNotificacoesAtivo: false,
        whatsappTemplateConfirmacao: '',
        whatsappTemplateLembrete: '',
        whatsappTemplateCancelamento: '',
        backendNotificacoesUrl: '',
        calendarioIntegrado: true,
        calendarioTitulo: 'Agendamento - {servicoNome}',
      }
    } catch (error) {
      console.warn('Não foi possível obter userId, retornando configurações padrão:', error)
      return {
        userId: '',
        horarioInicial: '06:00',
        horarioFinal: '23:00',
        intervaloMinutos: 30,
        tema: 'claro',
        template: 'padrao',
        visualizacaoAgendaPadrao: 'dia',
        notificacoesEmail: false,
        notificacoesPush: false,
        lembrarAgendamentos: true,
        permiteCancelamentoCliente: true,
        permiteRemarcacaoCliente: true,
        antecedenciaCancelamentoHoras: 24,
        antecedenciaRemarcacaoHoras: 24,
        moeda: 'BRL',
        formatoData: 'DD/MM/YYYY',
        formatoHora: '24h',
        whatsappSuporte: whatsappSuporteAdmin,
        whatsappNotificacoesAtivo: false,
        whatsappTemplateConfirmacao: '',
        whatsappTemplateLembrete: '',
        whatsappTemplateCancelamento: '',
        backendNotificacoesUrl: '',
        calendarioIntegrado: true,
        calendarioTitulo: 'Agendamento - {servicoNome}',
      }
    }
  },
}

export { collection, doc, query, where, orderBy, limit, Timestamp }

export type { ConfiguracoesUsuario } from '../types/configuracoes'
