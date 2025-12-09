import type { ReactNode } from 'react'
import { useTema } from '../hooks/useTema'

export function TemaProvider({ children }: { children: ReactNode }) {
  useTema()
  return <>{children}</>
}
