/**
 * Serviço de cache local para dados do Firestore
 * Usa localStorage para persistir dados entre sessões
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresIn: number // em milissegundos
}

const CACHE_PREFIX = 'agendamento_cache_'
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutos

/**
 * Salva dados no cache
 */
export function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresIn: ttl,
    }
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry))
  } catch (error) {
    console.warn('Erro ao salvar no cache:', error)
    // Se o localStorage estiver cheio, limpar cache antigo
    clearExpiredCache()
  }
}

/**
 * Recupera dados do cache
 */
export function getCache<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(`${CACHE_PREFIX}${key}`)
    if (!item) return null

    const entry: CacheEntry<T> = JSON.parse(item)
    const now = Date.now()

    // Verificar se expirou
    if (now - entry.timestamp > entry.expiresIn) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`)
      return null
    }

    return entry.data
  } catch (error) {
    console.warn('Erro ao recuperar do cache:', error)
    return null
  }
}

/**
 * Remove um item específico do cache
 */
export function removeCache(key: string): void {
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`)
  } catch (error) {
    console.warn('Erro ao remover do cache:', error)
  }
}

/**
 * Limpa todo o cache
 */
export function clearCache(): void {
  try {
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.warn('Erro ao limpar cache:', error)
  }
}

/**
 * Limpa apenas itens expirados do cache
 */
export function clearExpiredCache(): void {
  try {
    const keys = Object.keys(localStorage)
    const now = Date.now()

    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const item = localStorage.getItem(key)
          if (item) {
            const entry: CacheEntry<any> = JSON.parse(item)
            if (now - entry.timestamp > entry.expiresIn) {
              localStorage.removeItem(key)
            }
          }
        } catch {
          // Se não conseguir parsear, remover
          localStorage.removeItem(key)
        }
      }
    })
  } catch (error) {
    console.warn('Erro ao limpar cache expirado:', error)
  }
}

/**
 * Verifica se um item existe no cache e não expirou
 */
export function hasCache(key: string): boolean {
  return getCache(key) !== null
}
