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
import { getUserSession } from './auth'
import type { ConfiguracoesUsuario } from '../types/configuracoes'
import { getCache, setCache, removeCache } from './cache'

export type FirestoreTimestamp = Timestamp
export type FirestoreDocument = QueryDocumentSnapshot<any>

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

const getCurrentUserId = (): string => {
  const usuario = getUserSession()
  if (!usuario || !usuario.id) {
    throw new Error('Usuário não autenticado. Faça login novamente.')
  }
  return usuario.id
}

export const getDocument = async <T = any>(
  collectionName: string,
  documentId: string
): Promise<T | null> => {
  try {
    const userId = getCurrentUserId()
    const docRef = doc(db, collectionName, documentId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      if (data.userId !== userId) {
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

    const userId = getCurrentUserId()
    const q = query(
      collection(db, collectionName),
      where('userId', '==', userId),
      ...constraints
    )
    const querySnapshot = await getDocs(q)
    const results = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as T[]

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
    const usuario = getUserSession()
    if (isAccessExpired(usuario)) {
      throw new Error('Seu acesso expirou. Você pode apenas visualizar os dados existentes. Entre em contato com o administrador para renovar seu acesso.')
    }

    const userId = getCurrentUserId()
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      userId,
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
    const userId = getCurrentUserId()
    const docRef = doc(db, collectionName, documentId)

    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) {
      throw new Error('Documento não encontrado')
    }
    const docData = docSnap.data()
    if (docData.userId !== userId) {
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
    const userId = getCurrentUserId()
    const docRef = doc(db, collectionName, documentId)

    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) {
      throw new Error('Documento não encontrado')
    }
    const docData = docSnap.data()
    if (docData.userId !== userId) {
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

  create: (data: Omit<any, 'id'>) => createDocument('clientes', data),

  update: (id: string, data: Partial<Omit<any, 'id'>>) =>
    updateDocument('clientes', id, data),

  delete: (id: string) => deleteDocument('clientes', id),

  search: async (searchTerm: string) => {
    const userId = getCurrentUserId()
    const constraints = [
      where('userId', '==', userId),
      where('nome', '>=', searchTerm),
      where('nome', '<=', searchTerm + '\uf8ff'),
      orderBy('nome'),
    ]
    const q = query(collection(db, 'clientes'), ...constraints)
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  },
}

export const servicosService = {
  collection: 'servicos',

  getAll: () => getDocuments('servicos', [orderBy('nome')]),

  getById: (id: string) => getDocument('servicos', id),

  getActive: () => getDocuments('servicos', [
    where('ativo', '==', true),
    orderBy('nome'),
  ]),

  create: (data: Omit<any, 'id'>) => createDocument('servicos', data),

  update: (id: string, data: Partial<Omit<any, 'id'>>) =>
    updateDocument('servicos', id, data),

  delete: (id: string) => deleteDocument('servicos', id),
}

export const agendamentosService = {
  collection: 'agendamentos',

  getAll: () => getDocuments('agendamentos', [orderBy('data', 'desc'), orderBy('horario', 'desc')]),

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

    const resultados = await getDocuments('agendamentos', [
      where('data', '>=', Timestamp.fromDate(startOfDayLocal)),
      where('data', '<=', Timestamp.fromDate(endOfDayLocal)),
      orderBy('data'),
      orderBy('horario'),
    ])

    return resultados
  },

  getByDateRange: async (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    return getDocuments('agendamentos', [
      where('data', '>=', Timestamp.fromDate(start)),
      where('data', '<=', Timestamp.fromDate(end)),
      orderBy('data'),
      orderBy('horario'),
    ])
  },

  getByCliente: async (clienteId: string) => {
    return getDocuments('agendamentos', [
      where('clienteId', '==', clienteId),
      orderBy('data', 'desc'),
      orderBy('horario', 'desc'),
    ])
  },

  getByStatus: async (status: 'agendado' | 'concluido' | 'cancelado') => {
    return getDocuments('agendamentos', [
      where('status', '==', status),
      orderBy('data', 'desc'),
      orderBy('horario', 'desc'),
    ])
  },

  getConcluidos: () => agendamentosService.getByStatus('concluido'),

  create: (data: Omit<any, 'id'>) => createDocument('agendamentos', data),

  update: (id: string, data: Partial<Omit<any, 'id'>>) =>
    updateDocument('agendamentos', id, data),

  delete: (id: string) => deleteDocument('agendamentos', id),

  checkTimeConflict: async (data: string, horario: string, excludeId?: string) => {
    const agendamentos = await agendamentosService.getByDate(data)
    return agendamentos.some(
      (ag: any) =>
        ag.horario === horario &&
        ag.status === 'agendado' &&
        ag.id !== excludeId
    )
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
          dataAtualizacao: Timestamp.now(),
        }
        await updateDoc(docRef, updateData)
        return existente.id!
      } else {
        const newData: Record<string, unknown> = {
          ...config,
          userId,
          whatsappSuporte: config.whatsappSuporte ?? '',
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
        moeda: 'BRL',
        formatoData: 'DD/MM/YYYY',
        formatoHora: '24h',
        whatsappSuporte: whatsappSuporteAdmin,
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
        moeda: 'BRL',
        formatoData: 'DD/MM/YYYY',
        formatoHora: '24h',
        whatsappSuporte: whatsappSuporteAdmin,
      }
    }
  },
}

export { collection, doc, query, where, orderBy, limit, Timestamp }

export type { ConfiguracoesUsuario } from '../types/configuracoes'

