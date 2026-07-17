import { Timestamp } from 'firebase/firestore'

export interface Estabelecimento {
  id?: string
  nome: string
  slug: string
  endereco: string
  telefone: string
  email?: string
  descricao?: string
  ativo: boolean
  horarioAbertura: string
  horarioFechamento: string
  intervaloMinutos: number
  criadoPor?: string
  dataCriacao?: Date | Timestamp
  dataAtualizacao?: Date | Timestamp
}
