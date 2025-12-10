import { useEffect } from 'react'
import { useConfiguracoes } from '../contexts/ConfiguracoesContext'

export function useTema() {
  const { config } = useConfiguracoes()

  useEffect(() => {
    if (!config) return

    const root = document.documentElement
    const body = document.body

    // Remover classes anteriores de tema
    root.classList.remove('tema-claro', 'tema-escuro')
    body.classList.remove('tema-claro', 'tema-escuro')

    // Remover classes anteriores de template
    const templates = ['template-padrao', 'template-barbearia', 'template-manicure', 'template-salon', 'template-spa']
    root.classList.remove(...templates)
    body.classList.remove(...templates)

    let temaAplicar: 'claro' | 'escuro' = 'claro'

    if (config.tema === 'auto') {
      // Detectar preferência do sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      temaAplicar = prefersDark ? 'escuro' : 'claro'

      // Escutar mudanças na preferência do sistema
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e: MediaQueryListEvent) => {
        const novoTema = e.matches ? 'escuro' : 'claro'
        root.classList.remove('tema-claro', 'tema-escuro')
        body.classList.remove('tema-claro', 'tema-escuro')
        root.classList.add(`tema-${novoTema}`)
        body.classList.add(`tema-${novoTema}`)
      }

      mediaQuery.addEventListener('change', handleChange)

      return () => {
        mediaQuery.removeEventListener('change', handleChange)
      }
    } else {
      temaAplicar = config.tema
    }

    // Aplicar tema
    root.classList.add(`tema-${temaAplicar}`)
    body.classList.add(`tema-${temaAplicar}`)

    // Aplicar template
    const template = config.template || 'padrao'
    root.classList.add(`template-${template}`)
    body.classList.add(`template-${template}`)
  }, [config?.tema, config?.template])
}
