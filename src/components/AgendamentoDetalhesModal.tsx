import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { agendamentosService, clientesService, servicosService } from '../services/firestore'
import './AgendamentoDetalhesModal.css'

interface AgendamentoDetalhes {
  id: string
  ids?: string[] // IDs de agendamentos relacionados (mesmo cliente, serviço e data)
  clienteId: string
  clienteNome: string
  servicoId: string
  servicoNome: string
  servicoValor: number
  data: string // YYYY-MM-DD
  horario: string | string[] // HH:MM ou array de horários
  status: 'agendado' | 'concluido' | 'cancelado'
  observacoes?: string
  formaPagamento?: 'cartao' | 'dinheiro' | 'pix' | null
}

interface AgendamentoDetalhesModalProps {
  isOpen: boolean
  agendamentoId: string | null
  onClose: () => void
  onEdit?: (agendamentoId: string) => void
  onDelete?: (agendamentoId: string) => void
  onStatusChange?: () => void
}

function AgendamentoDetalhesModal({
  isOpen,
  agendamentoId,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
}: AgendamentoDetalhesModalProps) {
  const navigate = useNavigate()
  const [agendamento, setAgendamento] = useState<AgendamentoDetalhes | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const [isSavingPagamento, setIsSavingPagamento] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showPagamentoDropdown, setShowPagamentoDropdown] = useState(false)
  const statusDropdownRef = useRef<HTMLDivElement>(null)
  const pagamentoDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false)
      }
      if (pagamentoDropdownRef.current && !pagamentoDropdownRef.current.contains(event.target as Node)) {
        setShowPagamentoDropdown(false)
      }
    }

    if (showStatusDropdown || showPagamentoDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showStatusDropdown, showPagamentoDropdown])

  useEffect(() => {
    if (isOpen && agendamentoId) {
      loadAgendamento()
    } else {
      setAgendamento(null)
      setShowDeleteConfirm(false)
    }
  }, [isOpen, agendamentoId])

  const loadAgendamento = async () => {
    if (!agendamentoId) return

    setIsLoading(true)
    try {
      // Buscar agendamento no Firestore
      const agendamentoData = await agendamentosService.getById(agendamentoId)
      
      if (!agendamentoData) {
        alert('Agendamento não encontrado.')
        onClose()
        return
      }
      
      // Buscar dados do cliente e serviço
      const [cliente, servico] = await Promise.all([
        agendamentoData.clienteId ? clientesService.getById(agendamentoData.clienteId) : null,
        agendamentoData.servicoId ? servicosService.getById(agendamentoData.servicoId) : null,
      ])
      
      // Converter data para string YYYY-MM-DD
      // IMPORTANTE: Usar timezone local para evitar problemas de conversão
      let agDate: string
      if (agendamentoData.data instanceof Date) {
        // Usar métodos locais para evitar problemas de timezone
        const year = agendamentoData.data.getFullYear()
        const month = String(agendamentoData.data.getMonth() + 1).padStart(2, '0')
        const day = String(agendamentoData.data.getDate()).padStart(2, '0')
        agDate = `${year}-${month}-${day}`
      } else if (typeof agendamentoData.data === 'string') {
        agDate = agendamentoData.data.split('T')[0]
      } else if (agendamentoData.data?.toDate && typeof agendamentoData.data.toDate === 'function') {
        // Se for Timestamp do Firestore, usar timezone local
        const date = agendamentoData.data.toDate()
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        agDate = `${year}-${month}-${day}`
      } else {
        console.error('Formato de data inválido:', agendamentoData.data)
        const hoje = new Date()
        const year = hoje.getFullYear()
        const month = String(hoje.getMonth() + 1).padStart(2, '0')
        const day = String(hoje.getDate()).padStart(2, '0')
        agDate = `${year}-${month}-${day}`
      }
      
      console.log('📅 Data do agendamento formatada:', agDate)
      console.log('📅 Data original do agendamento:', agendamentoData.data)
      
      // Buscar agendamentos relacionados (mesmo cliente, serviço e data)
      let agendamentosDoDia = await agendamentosService.getByDate(agDate)
      console.log('📅 Agendamentos do dia encontrados:', agendamentosDoDia.length, agendamentosDoDia.map((a: any) => ({ 
        id: a.id, 
        horario: a.horario, 
        clienteId: a.clienteId, 
        servicoId: a.servicoId,
        data: a.data 
      })))
      
      // Se não encontrou agendamentos, tentar buscar todos e filtrar manualmente
      if (agendamentosDoDia.length === 0) {
        console.log('⚠️ Nenhum agendamento encontrado com getByDate, tentando buscar todos...')
        const todosAgendamentos = await agendamentosService.getAll()
        console.log('📋 Total de agendamentos no sistema:', todosAgendamentos.length)
        
        // Filtrar manualmente por data (usando timezone local)
        agendamentosDoDia = todosAgendamentos.filter((ag: any) => {
          let agDateStr: string
          if (ag.data instanceof Date) {
            const year = ag.data.getFullYear()
            const month = String(ag.data.getMonth() + 1).padStart(2, '0')
            const day = String(ag.data.getDate()).padStart(2, '0')
            agDateStr = `${year}-${month}-${day}`
          } else if (typeof ag.data === 'string') {
            agDateStr = ag.data.split('T')[0]
          } else if (ag.data?.toDate && typeof ag.data.toDate === 'function') {
            const date = ag.data.toDate()
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            agDateStr = `${year}-${month}-${day}`
          } else {
            return false
          }
          return agDateStr === agDate
        })
        
        console.log('📅 Agendamentos do dia (busca manual):', agendamentosDoDia.length)
      }
      
      // Filtrar agendamentos do mesmo cliente, serviço e data
      console.log('🔍 Filtrando agendamentos - ClienteId procurado:', agendamentoData.clienteId, 'ServicoId procurado:', agendamentoData.servicoId)
      
      const agendamentosRelacionados = agendamentosDoDia.filter((ag: any) => {
        const matchCliente = ag.clienteId === agendamentoData.clienteId
        const matchServico = ag.servicoId === agendamentoData.servicoId
        console.log(`  - Agendamento ${ag.id}: clienteId=${ag.clienteId} (${matchCliente ? '✓' : '✗'}), servicoId=${ag.servicoId} (${matchServico ? '✓' : '✗'})`)
        return matchCliente && matchServico
      })
      
      console.log('🔗 Agendamentos relacionados (mesmo cliente/serviço):', agendamentosRelacionados.length, agendamentosRelacionados.map((a: any) => ({ id: a.id, horario: a.horario, status: a.status })))
      
      // Incluir o agendamento atual na lista se não estiver
      const agendamentoAtualNaLista = agendamentosRelacionados.find((ag: any) => ag.id === agendamentoId)
      if (!agendamentoAtualNaLista) {
        // Garantir que o agendamento atual tenha o id correto e horário
        agendamentosRelacionados.push({
          ...agendamentoData,
          id: agendamentoId,
          horario: agendamentoData.horario || ''
        })
      }
      
      // Ordenar todos os agendamentos relacionados por horário
      const todosAgendamentos = [...agendamentosRelacionados]
        .filter((ag: any) => ag.horario && typeof ag.horario === 'string') // Filtrar apenas agendamentos com horário válido
        .sort((a: any, b: any) => {
          return (a.horario || '').localeCompare(b.horario || '')
        })
      console.log('📋 Todos agendamentos ordenados:', todosAgendamentos.map((a: any) => ({ id: a.id, horario: a.horario, status: a.status })))
      console.log('🔍 Buscando agendamento atual (ID):', agendamentoId)
      
      // Agrupar apenas os consecutivos (diferença de 30 minutos)
      // IMPORTANTE: Buscar todos os agendamentos consecutivos, independente do status
      const horariosRelacionados: string[] = []
      const idsRelacionados: string[] = []
      
      // Encontrar o índice do agendamento atual
      const indiceAtual = todosAgendamentos.findIndex((ag: any) => ag.id === agendamentoId)
      
      if (indiceAtual >= 0 && todosAgendamentos.length > 0) {
        // Adicionar o agendamento atual primeiro
        const horarioAtual = todosAgendamentos[indiceAtual].horario || ''
        horariosRelacionados.push(horarioAtual)
        idsRelacionados.push(agendamentoId)
        
        // Verificar agendamentos anteriores consecutivos
        for (let i = indiceAtual - 1; i >= 0; i--) {
          const anterior = todosAgendamentos[i]
          // Comparar com o primeiro horário já adicionado (que será o mais cedo)
          const primeiroAdicionado = horariosRelacionados.length > 0 
            ? todosAgendamentos.find((ag: any) => ag.id === idsRelacionados[0])
            : todosAgendamentos[indiceAtual]
          
          if (!anterior.horario || !primeiroAdicionado?.horario) break
          
          const horarioAnteriorParts = anterior.horario.split(':').map(Number)
          const horarioPrimeiroParts = primeiroAdicionado.horario.split(':').map(Number)
          
          if (horarioAnteriorParts.length !== 2 || horarioPrimeiroParts.length !== 2) break
          
          const minutosAnterior = horarioAnteriorParts[0] * 60 + horarioAnteriorParts[1]
          const minutosPrimeiro = horarioPrimeiroParts[0] * 60 + horarioPrimeiroParts[1]
          
          // Verificar se a diferença é exatamente 30 minutos (o anterior é 30 min antes do primeiro)
          if (minutosPrimeiro - minutosAnterior === 30) {
            horariosRelacionados.unshift(anterior.horario)
            idsRelacionados.unshift(anterior.id)
          } else {
            break
          }
        }
        
        // Verificar agendamentos posteriores consecutivos
        let ultimoIndex = indiceAtual
        for (let i = indiceAtual + 1; i < todosAgendamentos.length; i++) {
          const proximo = todosAgendamentos[i]
          const atual = todosAgendamentos[ultimoIndex]
          
          if (!proximo.horario || !atual.horario) break
          
          const horarioProximoParts = proximo.horario.split(':').map(Number)
          const horarioAtualParts = atual.horario.split(':').map(Number)
          
          if (horarioProximoParts.length !== 2 || horarioAtualParts.length !== 2) break
          
          const minutosProximo = horarioProximoParts[0] * 60 + horarioProximoParts[1]
          const minutosAtual = horarioAtualParts[0] * 60 + horarioAtualParts[1]
          
          // Verificar se a diferença é exatamente 30 minutos
          if (minutosProximo - minutosAtual === 30) {
            horariosRelacionados.push(proximo.horario)
            idsRelacionados.push(proximo.id)
            ultimoIndex = i
          } else {
            break
          }
        }
      } else {
        // Se não encontrou na lista, adicionar apenas o atual
        horariosRelacionados.push(agendamentoData.horario || '')
        idsRelacionados.push(agendamentoId)
      }
      
      // Ordenar horários e IDs para manter consistência
      // Criar array de pares [horario, id] para ordenar juntos
      const pares = horariosRelacionados.map((h, i) => ({ horario: h, id: idsRelacionados[i] }))
      pares.sort((a, b) => a.horario.localeCompare(b.horario))
      
      // Extrair horários e IDs ordenados
      horariosRelacionados.length = 0
      idsRelacionados.length = 0
      pares.forEach(p => {
        horariosRelacionados.push(p.horario)
        idsRelacionados.push(p.id)
      })
      
      console.log('⏰ Horários relacionados encontrados:', horariosRelacionados)
      console.log('🆔 IDs relacionados:', idsRelacionados)
      console.log(`📊 Total de ${idsRelacionados.length} agendamento(s) relacionado(s) encontrado(s)`)
      
      // Verificar se encontrou múltiplos agendamentos
      if (idsRelacionados.length > 1) {
        console.log('✅ MÚLTIPLOS HORÁRIOS DETECTADOS! Todos serão atualizados juntos.')
      } else {
        console.log('ℹ️ Apenas um agendamento encontrado para este horário.')
      }
      
      // Sempre incluir os IDs relacionados, mesmo que seja apenas 1
      // Isso garante que a atualização funcione corretamente
      // IMPORTANTE: Se encontrou múltiplos agendamentos consecutivos, incluir todos
      const idsFinais = idsRelacionados.length > 0 ? idsRelacionados : [agendamentoId]
      
      const agendamento: AgendamentoDetalhes = {
        id: agendamentoId,
        ids: idsFinais.length > 1 ? idsFinais : (idsFinais.length === 1 ? idsFinais : [agendamentoId]),
        clienteId: agendamentoData.clienteId || '',
        clienteNome: cliente?.nome || 'Cliente',
        servicoId: agendamentoData.servicoId || '',
        servicoNome: servico?.nome || agendamentoData.servicoNome || 'Serviço',
        servicoValor: servico?.valor || agendamentoData.servicoValor || 0,
        data: agDate,
        horario: horariosRelacionados.length > 1 ? horariosRelacionados : horariosRelacionados[0],
        status: agendamentoData.status || 'agendado',
        observacoes: agendamentoData.observacoes || null,
        formaPagamento: agendamentoData.formaPagamento || null,
      }
      
      console.log('✅ Agendamento final:', {
        id: agendamento.id,
        ids: agendamento.ids,
        horario: agendamento.horario,
        status: agendamento.status,
        cliente: agendamento.clienteNome
      })
      setAgendamento(agendamento)
    } catch (error) {
      alert('Erro ao carregar detalhes do agendamento. Tente novamente.')
      console.error(error)
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: 'agendado' | 'concluido' | 'cancelado') => {
    if (!agendamento || !agendamentoId) return

    setIsChangingStatus(true)
    try {
      // Usar os IDs que já foram encontrados e armazenados no agendamento
      // Isso é mais confiável do que tentar buscar novamente (que pode falhar por problemas de timezone)
      const idsParaAtualizar = agendamento.ids && agendamento.ids.length > 0
        ? agendamento.ids 
        : [agendamento.id]
      
      console.log(`🔄 Atualizando status para "${newStatus}" em ${idsParaAtualizar.length} agendamento(s):`, idsParaAtualizar)
      console.log(`📋 IDs que serão atualizados (já encontrados anteriormente):`, idsParaAtualizar)
      
      // Atualizar todos os agendamentos relacionados em paralelo
      const resultados = await Promise.all(
        idsParaAtualizar.map(async (id) => {
          try {
            await agendamentosService.update(id, { status: newStatus })
            console.log(`✅ Agendamento ${id} atualizado para "${newStatus}"`)
            return { id, sucesso: true }
          } catch (error) {
            console.error(`❌ Erro ao atualizar agendamento ${id}:`, error)
            return { id, sucesso: false, error }
          }
        })
      )
      
      const sucessos = resultados.filter(r => r.sucesso).length
      const falhas = resultados.filter(r => !r.sucesso).length
      
      console.log(`✅ Status atualizado: ${sucessos} sucesso(s), ${falhas} falha(s)`)
      
      if (falhas > 0) {
        alert(`Atenção: ${sucessos} agendamento(s) atualizado(s) com sucesso, mas ${falhas} falharam.`)
      }
      
      setAgendamento({ ...agendamento, status: newStatus })
      onStatusChange?.()
      
      // Não fechar modal se mudou para concluído (para permitir definir forma de pagamento)
      if (newStatus !== 'concluido') {
        setTimeout(() => {
          onClose()
        }, 500)
      }
    } catch (error) {
      alert('Erro ao alterar status. Tente novamente.')
      console.error('❌ Erro ao atualizar status:', error)
    } finally {
      setIsChangingStatus(false)
    }
  }

  const handleDelete = async () => {
    if (!agendamentoId || !agendamento) return

    try {
      // Excluir todos os agendamentos relacionados
      const idsParaExcluir = agendamento.ids && agendamento.ids.length > 1 
        ? agendamento.ids 
        : [agendamentoId]
      
      await Promise.all(
        idsParaExcluir.map(id => agendamentosService.delete(id))
      )
      
      onDelete?.(agendamentoId)
      setShowDeleteConfirm(false)
      onClose()
    } catch (error) {
      alert('Erro ao excluir agendamento. Tente novamente.')
      console.error(error)
    }
  }

  const handleFormaPagamentoChange = async (formaPagamento: 'cartao' | 'dinheiro' | 'pix') => {
    if (!agendamento) return

    setIsSavingPagamento(true)
    try {
      // Atualizar forma de pagamento de todos os agendamentos relacionados
      // Sempre usar os IDs relacionados se existirem, caso contrário usar apenas o ID atual
      const idsParaAtualizar = agendamento.ids && agendamento.ids.length > 0
        ? agendamento.ids 
        : [agendamento.id]
      
      console.log(`💳 Atualizando forma de pagamento para "${formaPagamento}" em ${idsParaAtualizar.length} agendamento(s):`, idsParaAtualizar)
      
      await Promise.all(
        idsParaAtualizar.map(id => 
          agendamentosService.update(id, { formaPagamento })
        )
      )
      
      console.log(`✅ Forma de pagamento atualizada com sucesso para ${idsParaAtualizar.length} agendamento(s)`)
      
      setAgendamento({ ...agendamento, formaPagamento })
      setShowPagamentoDropdown(false)
      onStatusChange?.()
    } catch (error) {
      alert('Erro ao salvar forma de pagamento. Tente novamente.')
      console.error('❌ Erro ao atualizar forma de pagamento:', error)
    } finally {
      setIsSavingPagamento(false)
    }
  }

  const getFormaPagamentoLabel = (forma?: 'cartao' | 'dinheiro' | 'pix' | null): string => {
    if (!forma) return 'Não informado'
    const labels = {
      cartao: 'Cartão',
      dinheiro: 'Dinheiro',
      pix: 'PIX',
    }
    return labels[forma]
  }

  const getFormaPagamentoIcon = (forma?: 'cartao' | 'dinheiro' | 'pix' | null) => {
    if (!forma) return null
    
    switch (forma) {
      case 'cartao':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
            <line x1="1" y1="10" x2="23" y2="10"></line>
          </svg>
        )
      case 'dinheiro':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        )
      case 'pix':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect>
            <path d="M7 12h10M12 7v10"></path>
          </svg>
        )
    }
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatTime = (timeStr: string | string[]): string => {
    if (Array.isArray(timeStr)) {
      if (timeStr.length === 0) return '--:--'
      if (timeStr.length === 1) {
        return timeStr[0]
      }
      // Múltiplos horários: mostrar primeiro e último
      const primeiro = timeStr[0]
      const ultimo = timeStr[timeStr.length - 1]
      return `${primeiro} - ${ultimo} (${timeStr.length} horários)`
    }
    if (!timeStr) return '--:--'
    return timeStr
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      agendado: { label: 'Agendado', class: 'status-agendado' },
      concluido: { label: 'Concluído', class: 'status-concluido' },
      cancelado: { label: 'Cancelado', class: 'status-cancelado' },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.agendado
    return <span className={`status-badge ${config.class}`}>{config.label}</span>
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay agendamento-detalhes-overlay" onClick={onClose}>
      <div className="modal-content agendamento-detalhes-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Detalhes do Agendamento</h2>
          <button
            className="modal-close"
            onClick={onClose}
            disabled={isChangingStatus}
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
            <p>Carregando detalhes...</p>
          </div>
        ) : agendamento ? (
          <>
            <div className="detalhes-content">
              {/* Informações do Agendamento */}
              <div className="detalhes-section">
                <h3 className="section-title">Informações</h3>
                
                <div className="info-item">
                  <span className="info-label">Cliente:</span>
                  <div className="info-value-with-action">
                    <span className="info-value">{agendamento.clienteNome}</span>
                    <button
                      className="btn-link"
                      onClick={() => {
                        navigate(`/clientes/${agendamento.clienteId}`)
                        onClose()
                      }}
                    >
                      Ver Cliente
                    </button>
                  </div>
                </div>

                <div className="info-item">
                  <span className="info-label">Serviço:</span>
                  <span className="info-value">{agendamento.servicoNome}</span>
                </div>

                <div className="info-item">
                  <span className="info-label">Data:</span>
                  <span className="info-value">{formatDate(agendamento.data)}</span>
                </div>

                <div className="info-item">
                  <span className="info-label">Horário:</span>
                  <span className="info-value">{formatTime(agendamento.horario)}</span>
                </div>

                <div className="info-item">
                  <span className="info-label">Status:</span>
                  <div className="info-value">{getStatusBadge(agendamento.status)}</div>
                </div>

                {agendamento.observacoes && (
                  <div className="info-item">
                    <span className="info-label">Observações:</span>
                    <span className="info-value">{agendamento.observacoes}</span>
                  </div>
                )}

                <div className="info-item">
                  <span className="info-label">Valor:</span>
                  <span className="info-value info-value-price">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(agendamento.servicoValor)}
                  </span>
                </div>

                <div className="info-item">
                  <span className="info-label">Forma de Pagamento:</span>
                  {agendamento.status === 'concluido' ? (
                    <div className="info-value-with-action">
                      <div className="forma-pagamento-display">
                        {getFormaPagamentoIcon(agendamento.formaPagamento)}
                        <span className="info-value">
                          {getFormaPagamentoLabel(agendamento.formaPagamento)}
                        </span>
                      </div>
                      <div className="pagamento-dropdown-wrapper" ref={pagamentoDropdownRef}>
                        <button
                          className="btn-link btn-pagamento"
                          onClick={() => setShowPagamentoDropdown(!showPagamentoDropdown)}
                          disabled={isSavingPagamento}
                        >
                          {agendamento.formaPagamento ? 'Alterar' : 'Definir'}
                        </button>
                        {showPagamentoDropdown && (
                          <div className="pagamento-dropdown">
                            <button
                              className="pagamento-option"
                              onClick={() => handleFormaPagamentoChange('cartao')}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                <line x1="1" y1="10" x2="23" y2="10"></line>
                              </svg>
                              Cartão
                            </button>
                            <button
                              className="pagamento-option"
                              onClick={() => handleFormaPagamentoChange('dinheiro')}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="1" x2="12" y2="23"></line>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                              </svg>
                              Dinheiro
                            </button>
                            <button
                              className="pagamento-option"
                              onClick={() => handleFormaPagamentoChange('pix')}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect>
                                <path d="M7 12h10M12 7v10"></path>
                              </svg>
                              PIX
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="info-value info-value-disabled">
                      <span>Altere o status para "Concluído" para definir a forma de pagamento</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="detalhes-section">
                <h3 className="section-title">Ações</h3>
                
                <div className="actions-grid">
                  <button
                    className="action-btn action-edit"
                    onClick={() => {
                      onEdit?.(agendamento.id)
                      onClose()
                    }}
                    disabled={isChangingStatus}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Editar
                  </button>

                  <div className="status-dropdown-wrapper" ref={statusDropdownRef}>
                    <button
                      className="action-btn action-status"
                      disabled={isChangingStatus}
                      onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                      Alterar Status
                    </button>
                    {showStatusDropdown && (
                      <div className="status-dropdown">
                        {agendamento.status !== 'agendado' && (
                          <button
                            className="status-option"
                            onClick={() => {
                              handleStatusChange('agendado')
                              setShowStatusDropdown(false)
                            }}
                          >
                            Agendado
                          </button>
                        )}
                        {agendamento.status !== 'concluido' && (
                          <button
                            className="status-option"
                            onClick={() => {
                              handleStatusChange('concluido')
                              setShowStatusDropdown(false)
                            }}
                          >
                            Concluído
                          </button>
                        )}
                        {agendamento.status !== 'cancelado' && (
                          <button
                            className="status-option status-cancel"
                            onClick={() => {
                              handleStatusChange('cancelado')
                              setShowStatusDropdown(false)
                            }}
                          >
                            Cancelado
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    className="action-btn action-delete"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isChangingStatus}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Excluir
                  </button>
                </div>
              </div>
            </div>

            {/* Confirmação de Exclusão */}
            {showDeleteConfirm && (
              <div className="delete-confirm">
                <p>Tem certeza que deseja excluir este agendamento?</p>
                <div className="delete-confirm-actions">
                  <button
                    className="btn-cancel"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="btn-delete"
                    onClick={handleDelete}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="error-state">
            <p>Agendamento não encontrado.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AgendamentoDetalhesModal

