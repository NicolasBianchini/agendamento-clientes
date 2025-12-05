import { useState, useEffect, useRef, useMemo } from 'react'
import { clientesService, servicosService, agendamentosService, toFirestoreDate } from '../services/firestore'
import { useConfiguracoes } from '../hooks/useConfiguracoes'
import { formatarMoeda } from '../utils/formatacao'
import { enviarConfirmacaoAgendamento } from '../services/mensagens'
import './AgendamentoModal.css'

interface Cliente {
  id: string
  nome: string
}

interface Servico {
  id: string
  nome: string
  valor: number
  ativo: boolean
}

interface AgendamentoModalProps {
  isOpen: boolean
  mode: 'create' | 'edit'
  agendamentoId?: string | null
  initialClienteId?: string | null
  initialData?: string | null // YYYY-MM-DD
  initialHorario?: string | null // HH:MM
  onClose: () => void
  onSuccess?: () => void
}

function AgendamentoModal({
  isOpen,
  mode,
  agendamentoId,
  initialClienteId,
  initialData,
  initialHorario,
  onClose,
  onSuccess,
}: AgendamentoModalProps) {
  const { config } = useConfiguracoes()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [clienteId, setClienteId] = useState<string>('')
  const [servicoId, setServicoId] = useState<string>('')
  const [data, setData] = useState<string>('')
  const [horarios, setHorarios] = useState<string[]>([])
  const [observacoes, setObservacoes] = useState<string>('')
  const [status, setStatus] = useState<'agendado' | 'concluido' | 'cancelado'>('agendado')
  const [errors, setErrors] = useState<{
    cliente?: string
    servico?: string
    data?: string
    horario?: string
    conflito?: string
  }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [clienteSearch, setClienteSearch] = useState('')
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)
  const autocompleteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowClienteDropdown(false)
      }
    }

    if (showClienteDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showClienteDropdown])

  useEffect(() => {
    if (isOpen) {
      loadData()
      if (mode === 'create') {
        // Pré-preenchimento para criação
        if (initialData) setData(initialData)
        if (initialHorario) setHorarios([initialHorario])
        if (initialClienteId) setClienteId(initialClienteId)
      } else {
        // Carregar dados do agendamento para edição
        loadAgendamentoData()
      }
    } else {
      resetForm()
    }
  }, [isOpen, mode, agendamentoId, initialClienteId, initialData, initialHorario])

  // Atualizar clienteSearch quando clienteId mudar e houver clientes carregados
  useEffect(() => {
    if (clienteId && clientes.length > 0) {
      const cliente = clientes.find(c => c.id === clienteId)
      if (cliente) {
        setClienteSearch(cliente.nome)
      }
    } else if (!clienteId) {
      setClienteSearch('')
    }
  }, [clienteId, clientes])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Buscar clientes e serviços no Firestore
      const [clientesData, servicosData] = await Promise.all([
        clientesService.getAll(),
        servicosService.getActive(),
      ])

      setClientes(clientesData.map((c: any) => ({ id: c.id, nome: c.nome })))
      setServicos(servicosData.map((s: any) => ({
        id: s.id,
        nome: s.nome,
        valor: s.valor || 0,
        ativo: s.ativo !== false
      })))
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadAgendamentoData = async () => {
    if (!agendamentoId) return

    setIsLoading(true)
    try {
      // Buscar agendamento no Firestore
      const agendamento = await agendamentosService.getById(agendamentoId)

      if (!agendamento) {
        alert('Agendamento não encontrado.')
        onClose()
        return
      }

      const agDate = agendamento.data instanceof Date
        ? agendamento.data.toISOString().split('T')[0]
        : agendamento.data

      setClienteId(agendamento.clienteId || '')
      setServicoId(agendamento.servicoId || '')
      setData(agDate)
      setHorarios(agendamento.horario ? [agendamento.horario] : [])
      setObservacoes(agendamento.observacoes || '')
      setStatus(agendamento.status || 'agendado')
      setErrors({})
    } catch (error) {
      alert('Erro ao carregar dados do agendamento. Tente novamente.')
      console.error(error)
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const filteredClientes = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(clienteSearch.toLowerCase())
  )

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {}

    if (!clienteId) {
      newErrors.cliente = 'Cliente é obrigatório'
    }

    if (!servicoId) {
      newErrors.servico = 'Serviço é obrigatório'
    }

    if (!data) {
      newErrors.data = 'Data é obrigatória'
    } else {
      // Criar data selecionada sem problemas de timezone
      const [year, month, day] = data.split('-').map(Number)
      const selectedDate = new Date(year, month - 1, day)

      // Criar data de hoje sem problemas de timezone
      const today = new Date()
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())

      if (selectedDateOnly < todayDate) {
        newErrors.data = 'Não é possível agendar em datas passadas'
      }
    }

    if (horarios.length === 0) {
      newErrors.horario = 'Selecione pelo menos um horário'
    } else if (data) {
      // Criar data selecionada sem problemas de timezone
      const [year, month, day] = data.split('-').map(Number)
      const selectedDate = new Date(year, month - 1, day)

      // Criar data de hoje sem problemas de timezone
      const today = new Date()
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())

      // Verificar se a data selecionada é hoje
      const isToday = selectedDateOnly.getTime() === todayDate.getTime()
      const now = new Date()

      // Verificar cada horário selecionado
      for (const horario of horarios) {
        const [hours, minutes] = horario.split(':').map(Number)
        const selectedDateTime = new Date(selectedDate)
        selectedDateTime.setHours(hours, minutes, 0, 0)

        if (isToday && selectedDateTime < now) {
          newErrors.horario = 'Não é possível agendar em horários passados'
          break
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const checkConflitoHorario = async (): Promise<boolean> => {
    try {
      // Verificar conflito para cada horário selecionado
      for (const horario of horarios) {
        const hasConflict = await agendamentosService.checkTimeConflict(
          data,
          horario,
          mode === 'edit' ? agendamentoId : null
        )

        if (hasConflict) {
          setErrors({ ...errors, conflito: `Já existe um agendamento no horário ${horario}` })
          return true
        }
      }

      return false
    } catch (error) {
      console.error('Erro ao verificar conflito:', error)
      return false
    }
  }

  // Gerar lista de horários disponíveis baseado nas configurações
  // Usar useMemo para recalcular quando as configurações mudarem
  const horariosDisponiveis = useMemo(() => {
    if (!config) {
      // Valores padrão enquanto carrega
      const horarios: string[] = []
      for (let hour = 6; hour <= 23; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const horaStr = hour.toString().padStart(2, '0')
          const minutoStr = minute.toString().padStart(2, '0')
          horarios.push(`${horaStr}:${minutoStr}`)
        }
      }
      return horarios
    }

    const horarios: string[] = []
    const [startHour, startMinute] = config.horarioInicial.split(':').map(Number)
    const [endHour, endMinute] = config.horarioFinal.split(':').map(Number)
    const intervalo = config.intervaloMinutos

    const startMinutes = startHour * 60 + startMinute
    const endMinutes = endHour * 60 + endMinute

    for (let minutes = startMinutes; minutes <= endMinutes; minutes += intervalo) {
      const hour = Math.floor(minutes / 60)
      const minute = minutes % 60
      horarios.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)
    }

    return horarios
  }, [config])

  const toggleHorario = (horario: string) => {
    if (horarios.includes(horario)) {
      setHorarios(horarios.filter(h => h !== horario))
    } else {
      setHorarios([...horarios, horario].sort())
    }
    setErrors({ ...errors, horario: undefined })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const hasConflito = await checkConflitoHorario()
    if (hasConflito) {
      return
    }

    setIsSubmitting(true)

    try {
      // Preparar dados base
      const baseData = {
        clienteId,
        servicoId,
        data: toFirestoreDate(data),
        observacoes: observacoes.trim() || null,
        status,
      }

      if (mode === 'create') {
        // Buscar dados do cliente e serviço para enviar mensagem
        const [cliente, servico] = await Promise.all([
          clienteId ? clientesService.getById(clienteId) : null,
          servicoId ? servicosService.getById(servicoId) : null,
        ])

        // Criar um agendamento para cada horário selecionado
        for (const horario of horarios) {
          await agendamentosService.create({
            ...baseData,
            horario,
          })
        }

        // Enviar mensagem de confirmação após criar o agendamento
        if (cliente?.telefone && servico) {
          console.log('📅 [AGENDAMENTO] Agendamento criado com sucesso, iniciando envio de mensagem...')
          console.log('📅 [AGENDAMENTO] Cliente:', cliente.nome, '- Telefone:', cliente.telefone)
          console.log('📅 [AGENDAMENTO] Serviço:', servico.nome, '- Valor:', servico.valor)

          try {
            const dadosMensagem = {
              clienteNome: cliente.nome,
              clienteTelefone: cliente.telefone,
              servicoNome: servico.nome,
              servicoValor: servico.valor,
              data: data,
              horario: horarios.length === 1 ? horarios[0] : horarios,
              observacoes: observacoes.trim() || undefined,
            }

            console.log('📅 [AGENDAMENTO] Dados preparados para mensagem:', dadosMensagem)

            // Enviar mensagem automaticamente via API
            const enviado = await enviarConfirmacaoAgendamento(dadosMensagem, config)

            if (enviado) {
              console.log('✅ [AGENDAMENTO] Mensagem de confirmação enviada com sucesso!')
            } else {
              console.warn('⚠️ [AGENDAMENTO] Mensagem não foi enviada.')
              console.warn('⚠️ [AGENDAMENTO] Verifique as configurações de mensagens automáticas em Configurações.')
            }
          } catch (error) {
            console.error('❌ [AGENDAMENTO] Erro ao enviar mensagem de confirmação:', error)
            if (error instanceof Error) {
              console.error('❌ [AGENDAMENTO] Detalhes:', error.message, error.stack)
            }
            // Não bloquear o fluxo se houver erro no envio da mensagem
          }
        } else {
          if (!cliente?.telefone) {
            console.warn('⚠️ [AGENDAMENTO] Cliente não possui telefone cadastrado. Mensagem não será enviada.')
          }
          if (!servico) {
            console.warn('⚠️ [AGENDAMENTO] Serviço não encontrado. Mensagem não será enviada.')
          }
        }
      } else if (agendamentoId) {
        // Em modo de edição, atualizar apenas o primeiro horário (comportamento original)
        // Se houver múltiplos horários, criar novos agendamentos para os adicionais
        if (horarios.length > 0) {
          await agendamentosService.update(agendamentoId, {
            ...baseData,
            horario: horarios[0],
          })

          // Criar novos agendamentos para horários adicionais
          for (let i = 1; i < horarios.length; i++) {
            await agendamentosService.create({
              ...baseData,
              horario: horarios[i],
            })
          }
        }
      }

      setShowSuccess(true)

      setTimeout(() => {
        resetForm()
        setShowSuccess(false)
        onSuccess?.()
        onClose()
      }, 1500)

    } catch (error) {
      alert(`Erro ao ${mode === 'create' ? 'criar' : 'atualizar'} agendamento. Tente novamente.`)
      console.error(error)
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setClienteId('')
    setServicoId('')
    setData('')
    setHorarios([])
    setObservacoes('')
    setStatus('agendado')
    setErrors({})
    setIsSubmitting(false)
    setIsLoading(false)
    setShowSuccess(false)
    setClienteSearch('')
    setShowClienteDropdown(false)
  }

  const handleClose = () => {
    if (!isSubmitting && !isLoading) {
      resetForm()
      onClose()
    }
  }

  const selectedCliente = clientes.find(c => c.id === clienteId)
  const selectedServico = servicos.find(s => s.id === servicoId)

  if (!isOpen) return null

  return (
    <div className="modal-overlay agendamento-overlay" onClick={handleClose}>
      <div className="modal-content agendamento-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {mode === 'create' ? 'Novo Agendamento' : 'Editar Agendamento'}
          </h2>
          <button
            className="modal-close"
            onClick={handleClose}
            disabled={isSubmitting || isLoading}
            aria-label="Fechar"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Carregando dados...</p>
          </div>
        ) : (
          <>
            {showSuccess && (
              <div className="success-message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Agendamento {mode === 'create' ? 'criado' : 'atualizado'} com sucesso!</span>
              </div>
            )}

            {errors.conflito && (
              <div className="error-message general-error">
                {errors.conflito}
              </div>
            )}

            <form onSubmit={handleSubmit} className="agendamento-form" noValidate>
              <div className="form-group">
                <label htmlFor="cliente" className="form-label">
                  Cliente <span className="required">*</span>
                </label>
                <div className="autocomplete-wrapper" ref={autocompleteRef}>
                  <input
                    type="text"
                    id="cliente"
                    className={`form-input ${errors.cliente ? 'input-error' : ''}`}
                    placeholder="Buscar cliente..."
                    value={clienteSearch}
                    onChange={(e) => {
                      const value = e.target.value
                      setClienteSearch(value)
                      setShowClienteDropdown(true)
                      if (!value) {
                        setClienteId('')
                      } else {
                        // Se o texto digitado corresponder exatamente a um cliente, selecionar automaticamente
                        const exactMatch = clientes.find(c =>
                          c.nome.toLowerCase() === value.toLowerCase()
                        )
                        if (exactMatch) {
                          setClienteId(exactMatch.id)
                          setErrors({ ...errors, cliente: undefined })
                        } else {
                          // Se não houver correspondência exata, limpar o clienteId
                          setClienteId('')
                        }
                      }
                    }}
                    onFocus={() => {
                      if (clientes.length > 0) {
                        setShowClienteDropdown(true)
                      }
                    }}
                    disabled={isSubmitting}
                    autoComplete="off"
                  />
                  {showClienteDropdown && clienteSearch && filteredClientes.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {filteredClientes.map((cliente) => (
                        <button
                          key={cliente.id}
                          type="button"
                          className="dropdown-item"
                          onClick={() => {
                            setClienteId(cliente.id)
                            setClienteSearch(cliente.nome)
                            setShowClienteDropdown(false)
                            setErrors({ ...errors, cliente: undefined })
                          }}
                        >
                          {cliente.nome}
                        </button>
                      ))}
                    </div>
                  )}
                  {showClienteDropdown && clienteSearch && filteredClientes.length === 0 && clientes.length > 0 && (
                    <div className="autocomplete-dropdown">
                      <div className="dropdown-item dropdown-item-empty">
                        Nenhum cliente encontrado
                      </div>
                    </div>
                  )}
                </div>
                {errors.cliente && (
                  <span className="error-message">{errors.cliente}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="servico" className="form-label">
                  Serviço <span className="required">*</span>
                </label>
                <select
                  id="servico"
                  className={`form-select ${errors.servico ? 'input-error' : ''}`}
                  value={servicoId}
                  onChange={(e) => {
                    setServicoId(e.target.value)
                    setErrors({ ...errors, servico: undefined })
                  }}
                  disabled={isSubmitting}
                >
                  <option value="">Selecione um serviço</option>
                  {servicos.map((servico) => (
                    <option key={servico.id} value={servico.id}>
                      {servico.nome} - {formatarMoeda(servico.valor, config)}
                    </option>
                  ))}
                </select>
                {errors.servico && (
                  <span className="error-message">{errors.servico}</span>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="data" className="form-label">
                    Data <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    id="data"
                    className={`form-input ${errors.data ? 'input-error' : ''}`}
                    value={data}
                    onChange={(e) => {
                      setData(e.target.value)
                      setErrors({ ...errors, data: undefined, horario: undefined })
                    }}
                    disabled={isSubmitting}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {errors.data && (
                    <span className="error-message">{errors.data}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Horário <span className="required">*</span>
                    {horarios.length > 0 && (
                      <span className="horarios-selected-count">
                        ({horarios.length} selecionado{horarios.length > 1 ? 's' : ''})
                      </span>
                    )}
                  </label>
                  <div className={`horarios-selector ${errors.horario ? 'input-error' : ''}`}>
                    <div className="horarios-grid">
                      {horariosDisponiveis.map((horario) => {
                        const isSelected = horarios.includes(horario)
                        const isPast = (() => {
                          if (!data) return false

                          // Criar data selecionada sem problemas de timezone
                          const [year, month, day] = data.split('-').map(Number)
                          const selectedDate = new Date(year, month - 1, day)

                          // Criar data de hoje sem problemas de timezone
                          const today = new Date()
                          const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
                          const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())

                          const isToday = selectedDateOnly.getTime() === todayDate.getTime()
                          if (!isToday) return false

                          // Se for hoje, verificar se o horário já passou
                          const [hours, minutes] = horario.split(':').map(Number)
                          const horarioDateTime = new Date(selectedDate)
                          horarioDateTime.setHours(hours, minutes, 0, 0)
                          return horarioDateTime < new Date()
                        })()

                        return (
                          <button
                            key={horario}
                            type="button"
                            className={`horario-button ${isSelected ? 'selected' : ''} ${isPast ? 'past' : ''}`}
                            onClick={() => !isPast && toggleHorario(horario)}
                            disabled={isSubmitting || isPast}
                            title={isPast ? 'Horário já passou' : isSelected ? 'Clique para remover' : 'Clique para selecionar'}
                          >
                            {horario}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  {errors.horario && (
                    <span className="error-message">{errors.horario}</span>
                  )}
                  {horarios.length > 0 && (
                    <div className="horarios-selected-list">
                      <strong>Horários selecionados:</strong> {horarios.join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {mode === 'edit' && (
                <div className="form-group">
                  <label htmlFor="status" className="form-label">
                    Status
                  </label>
                  <select
                    id="status"
                    className="form-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as typeof status)}
                    disabled={isSubmitting}
                  >
                    <option value="agendado">Agendado</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="observacoes" className="form-label">
                  Observações
                </label>
                <textarea
                  id="observacoes"
                  className="form-textarea"
                  placeholder="Observações sobre o agendamento (opcional)"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  disabled={isSubmitting}
                  rows={4}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-save"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-small"></span>
                      {mode === 'create' ? 'Salvando...' : 'Atualizando...'}
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      {mode === 'create' ? 'Salvar' : 'Salvar Alterações'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default AgendamentoModal

