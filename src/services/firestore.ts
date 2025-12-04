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

// Tipos auxiliares
export type FirestoreTimestamp = Timestamp
export type FirestoreDocument = QueryDocumentSnapshot<any>

// Funções auxiliares para conversão de datas
export const toFirestoreDate = (date: Date | string): Timestamp => {
  if (date instanceof Date) {
    return Timestamp.fromDate(date)
  }
  
  // Se for uma string no formato YYYY-MM-DD, criar data no timezone local
  // para evitar problemas de conversão que mudam o dia
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    // Formato YYYY-MM-DD - criar data local para meia-noite do dia especificado
    const [year, month, day] = date.split('-').map(Number)
    const localDate = new Date(year, month - 1, day, 0, 0, 0, 0)
    console.log(`📅 Convertendo data string "${date}" para Date local:`, localDate.toISOString())
    return Timestamp.fromDate(localDate)
  }
  
  // Para outros formatos de string, usar conversão padrão
  return Timestamp.fromDate(new Date(date))
}

export const fromFirestoreDate = (timestamp: Timestamp): Date => {
  return timestamp.toDate()
}

// Funções genéricas CRUD

/**
 * Busca um documento por ID
 */
export const getDocument = async <T = any>(
  collectionName: string,
  documentId: string
): Promise<T | null> => {
  try {
    const docRef = doc(db, collectionName, documentId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T
    }
    return null
  } catch (error) {
    console.error(`Erro ao buscar documento ${documentId} em ${collectionName}:`, error)
    throw error
  }
}

/**
 * Busca todos os documentos de uma coleção
 */
export const getDocuments = async <T = any>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> => {
  try {
    const q = query(collection(db, collectionName), ...constraints)
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as T[]
  } catch (error) {
    console.error(`Erro ao buscar documentos de ${collectionName}:`, error)
    throw error
  }
}

/**
 * Cria um novo documento
 */
export const createDocument = async <T = any>(
  collectionName: string,
  data: Omit<T, 'id'>
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, collectionName), data as any)
    return docRef.id
  } catch (error) {
    console.error(`Erro ao criar documento em ${collectionName}:`, error)
    throw error
  }
}

/**
 * Atualiza um documento existente
 */
export const updateDocument = async <T = any>(
  collectionName: string,
  documentId: string,
  data: Partial<Omit<T, 'id'>>
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, documentId)
    await updateDoc(docRef, data as any)
  } catch (error) {
    console.error(`Erro ao atualizar documento ${documentId} em ${collectionName}:`, error)
    throw error
  }
}

/**
 * Exclui um documento
 */
export const deleteDocument = async (
  collectionName: string,
  documentId: string
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, documentId)
    await deleteDoc(docRef)
  } catch (error) {
    console.error(`Erro ao excluir documento ${documentId} de ${collectionName}:`, error)
    throw error
  }
}

// Funções específicas para as coleções do sistema

/**
 * Clientes
 */
export const clientesService = {
  collection: 'clientes',
  
  getAll: () => getDocuments('clientes'),
  
  getById: (id: string) => getDocument('clientes', id),
  
  create: (data: Omit<any, 'id'>) => createDocument('clientes', data),
  
  update: (id: string, data: Partial<Omit<any, 'id'>>) => 
    updateDocument('clientes', id, data),
  
  delete: (id: string) => deleteDocument('clientes', id),
  
  search: async (searchTerm: string) => {
    const constraints = [
      where('nome', '>=', searchTerm),
      where('nome', '<=', searchTerm + '\uf8ff'),
      orderBy('nome'),
    ]
    return getDocuments('clientes', constraints)
  },
}

/**
 * Serviços
 */
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

/**
 * Agendamentos
 */
export const agendamentosService = {
  collection: 'agendamentos',
  
  getAll: () => getDocuments('agendamentos', [orderBy('data', 'desc'), orderBy('horario', 'desc')]),
  
  getById: (id: string) => getDocument('agendamentos', id),
  
  getByDate: async (date: string | Date) => {
    // Converter para string YYYY-MM-DD se necessário
    let dateStr: string
    if (date instanceof Date) {
      dateStr = date.toISOString().split('T')[0]
    } else if (typeof date === 'string') {
      dateStr = date.split('T')[0] // Remove hora se houver
    } else {
      throw new Error('Data inválida')
    }
    
    console.log('🔍 getByDate chamado com:', date, '-> formatado como:', dateStr)
    
    // Converter string YYYY-MM-DD para Date (usando UTC para evitar problemas de timezone)
    const [year, month, day] = dateStr.split('-').map(Number)
    // Usar UTC para garantir consistência
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
    
    // Também criar versões locais para comparação
    const startOfDayLocal = new Date(year, month - 1, day, 0, 0, 0, 0)
    const endOfDayLocal = new Date(year, month - 1, day, 23, 59, 59, 999)
    
    console.log('📅 Range de busca - UTC:', startOfDay.toISOString(), 'até', endOfDay.toISOString())
    console.log('📅 Range de busca - Local:', startOfDayLocal.toISOString(), 'até', endOfDayLocal.toISOString())
    
    // Usar a versão local (como estava antes) para manter compatibilidade
    const resultados = await getDocuments('agendamentos', [
      where('data', '>=', Timestamp.fromDate(startOfDayLocal)),
      where('data', '<=', Timestamp.fromDate(endOfDayLocal)),
      orderBy('data'),
      orderBy('horario'),
    ])
    
    console.log('📊 getByDate retornou', resultados.length, 'agendamento(s)')
    
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

// Exportar funções auxiliares do Firestore
export { collection, doc, query, where, orderBy, limit, Timestamp }

