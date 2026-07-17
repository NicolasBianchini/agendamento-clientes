import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { agendamentosService, autoAgendamentoService, fromFirestoreDate } from '../services/firestore'
import { buildCalendarAssociation } from '../services/agendamentoIntegracoes'
import { getUserSession, isCliente } from '../services/auth'
import './AutoAgendamento.css'

type HorarioDisponivel = {
  horario: string
  profissionalId: string
  profissionalNome: string
}

function AutoAgendamento() {
  const usuario = getUserSession()
  const clienteAutenticado = isCliente(usuario)
  const navigate = useNavigate()
  const confirmacaoRef = useRef<HTMLElement | null>(null)
  const [searchParams] = useSearchParams()
  const reagendarId = searchParams.get('reagendar')
  const [estabelecimentos, setEstabelecimentos] = useState<any[]>([])
  const [servicos, setServicos] = useState<any[]>([])
  const [profissionais, setProfissionais] = useState<any[]>([])
  const [horarios, setHorarios] = useState<HorarioDisponivel[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState({
    estabelecimentoId: usuario?.estabelecimentoFavoritoId || usuario?.estabelecimentoId || '',
    servicoId: '',
    data: new Date().toISOString().split('T')[0],
    filtroProfissionalId: '',
    horario: '',
    profissionalId: '',
    clienteNome: usuario?.nome || '',
    clienteEmail: usuario?.email || '',
    clienteTelefone: '',
    observacoes: '',
  })

  const selectedSlot = useMemo(
    () => horarios.find((item) => item.horario === form.horario && item.profissionalId === form.profissionalId) || null,
    [horarios, form.horario, form.profissionalId]
  )

  const horariosVisiveis = useMemo(() => {
    if (!form.data) {
      return horarios
    }

    const hoje = new Date()
    const hojeLocal = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`

    if (form.data !== hojeLocal) {
      return horarios
    }

    const minutosAgora = hoje.getHours() * 60 + hoje.getMinutes()

    return horarios.filter((slot) => {
      const [hora, minuto] = slot.horario.split(':').map(Number)
      return hora * 60 + minuto >= minutosAgora
    })
  }, [horarios, form.data])

  const estabelecimentoSelecionado = useMemo(
    () => estabelecimentos.find((item) => item.id === form.estabelecimentoId) || null,
    [estabelecimentos, form.estabelecimentoId]
  )

  const servicoSelecionado = useMemo(
    () => servicos.find((item) => item.id === form.servicoId) || null,
    [servicos, form.servicoId]
  )

  const profissionalSelecionado = useMemo(
    () => profissionais.find((item) => item.profissionalId === (selectedSlot?.profissionalId || form.filtroProfissionalId)) || null,
    [profissionais, selectedSlot?.profissionalId, form.filtroProfissionalId]
  )

  const horariosAgrupados = useMemo(() => {
    const grupos = {
      manha: [] as HorarioDisponivel[],
      tarde: [] as HorarioDisponivel[],
      noite: [] as HorarioDisponivel[],
    }

    for (const slot of horariosVisiveis) {
      const [hora] = slot.horario.split(':').map(Number)
      if (hora < 12) {
        grupos.manha.push(slot)
      } else if (hora < 18) {
        grupos.tarde.push(slot)
      } else {
        grupos.noite.push(slot)
      }
    }

    return grupos
  }, [horariosVisiveis])

  useEffect(() => {
    loadEstabelecimentos()
  }, [])

  useEffect(() => {
    if (reagendarId) {
      loadReagendamento(reagendarId)
    }
  }, [reagendarId])

  useEffect(() => {
    if (form.estabelecimentoId) {
      loadServicos(form.estabelecimentoId)
    } else {
      setServicos([])
      setProfissionais([])
    }
  }, [form.estabelecimentoId])

  useEffect(() => {
    if (form.estabelecimentoId && form.servicoId) {
      loadProfissionais(form.estabelecimentoId, form.servicoId)
    } else {
      setProfissionais([])
      setForm((prev) => ({ ...prev, filtroProfissionalId: '', horario: '', profissionalId: '' }))
    }
  }, [form.estabelecimentoId, form.servicoId])

  useEffect(() => {
    if (form.estabelecimentoId && form.servicoId && form.data) {
      loadHorarios()
    } else {
      setHorarios([])
    }
  }, [form.estabelecimentoId, form.servicoId, form.data, form.filtroProfissionalId])

  const loadEstabelecimentos = async () => {
    setLoading(true)
    try {
      const data = await autoAgendamentoService.listarEstabelecimentos()
      setEstabelecimentos(data)
    } catch (error) {
      console.error(error)
      setMessage('Erro ao carregar estabelecimentos.')
    } finally {
      setLoading(false)
    }
  }

  const loadReagendamento = async (agendamentoId: string) => {
    try {
      const agendamento = await agendamentosService.getById(agendamentoId)
      if (!agendamento) {
        return
      }

      const dataNormalizada = agendamento.data?.toDate
        ? fromFirestoreDate(agendamento.data).toISOString().split('T')[0]
        : String(agendamento.data || '').split('T')[0]

      setForm((prev) => ({
        ...prev,
        estabelecimentoId: agendamento.estabelecimentoId || prev.estabelecimentoId,
        servicoId: agendamento.servicoId || prev.servicoId,
        data: dataNormalizada || prev.data,
        filtroProfissionalId: agendamento.profissionalId || '',
        clienteNome: agendamento.clienteNome || prev.clienteNome,
        clienteEmail: agendamento.clienteEmail || prev.clienteEmail,
        clienteTelefone: agendamento.clienteTelefone || prev.clienteTelefone,
        observacoes: agendamento.observacoes || '',
      }))
    } catch (error) {
      console.error(error)
    }
  }

  const loadServicos = async (estabelecimentoId: string) => {
    try {
      const data = await autoAgendamentoService.listarServicosPorEstabelecimento(estabelecimentoId)
      setServicos(data)
      setForm((prev) => ({
        ...prev,
        servicoId: data.some((item) => item.id === prev.servicoId) ? prev.servicoId : '',
        filtroProfissionalId: '',
        horario: '',
        profissionalId: '',
      }))
    } catch (error) {
      console.error(error)
      setMessage('Erro ao carregar serviços.')
    }
  }

  const loadProfissionais = async (estabelecimentoId: string, servicoId: string) => {
    try {
      const data = await autoAgendamentoService.listarProfissionaisPorServico(estabelecimentoId, servicoId)
      setProfissionais(data)
      setForm((prev) => ({
        ...prev,
        filtroProfissionalId: data.some((item) => item.profissionalId === prev.filtroProfissionalId)
          ? prev.filtroProfissionalId
          : '',
        horario: '',
        profissionalId: data.some((item) => item.profissionalId === prev.profissionalId)
          ? prev.profissionalId
          : '',
      }))
    } catch (error) {
      console.error(error)
      setMessage('Erro ao carregar profissionais.')
    }
  }

  const loadHorarios = async () => {
    try {
      const data = await autoAgendamentoService.listarHorariosDisponiveis({
        estabelecimentoId: form.estabelecimentoId,
        servicoId: form.servicoId,
        data: form.data,
        profissionalId: form.filtroProfissionalId || null,
      })
      setHorarios(data)
      setForm((prev) => ({ ...prev, horario: '', profissionalId: '' }))
    } catch (error) {
      console.error(error)
      setMessage('Erro ao carregar horários disponíveis.')
    }
  }

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSelectHorario = (slot: HorarioDisponivel) => {
    setForm((prev) => ({
      ...prev,
      horario: slot.horario,
      profissionalId: slot.profissionalId,
    }))
  }

  const scrollToConfirmacao = () => {
    confirmacaoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const calendarEvent = buildCalendarAssociation(
        {
          data: form.data,
          horario: selectedSlot?.horario || form.horario,
          clienteNome: clienteAutenticado ? usuario?.nome || form.clienteNome : form.clienteNome,
          clienteTelefone: form.clienteTelefone,
          clienteEmail: clienteAutenticado ? usuario?.email || form.clienteEmail : form.clienteEmail,
          servicoNome: servicoSelecionado?.nome || null,
          profissionalNome:
            selectedSlot?.profissionalNome || profissionalSelecionado?.profissionalNome || null,
          estabelecimentoNome: estabelecimentoSelecionado?.nome || null,
          status: 'agendado',
        },
        Number(estabelecimentoSelecionado?.intervaloMinutos || 30)
      )

      const novoAgendamentoId = await autoAgendamentoService.criarAgendamento({
        ...form,
        clienteNome: clienteAutenticado ? usuario?.nome || form.clienteNome : form.clienteNome,
        clienteEmail: clienteAutenticado ? usuario?.email || form.clienteEmail : form.clienteEmail,
        clienteUserId: clienteAutenticado ? usuario?.id : null,
        profissionalId: selectedSlot?.profissionalId || form.profissionalId,
        profissionalNome: selectedSlot?.profissionalNome || null,
        remarcadoDeId: reagendarId || null,
      })
      if (reagendarId) {
        await agendamentosService.update(reagendarId, {
          status: 'cancelado',
          remarcadoParaId: novoAgendamentoId,
        })
      }
      navigate('/agendar/sucesso', {
        replace: true,
        state: {
          agendamentoId: novoAgendamentoId,
          data: form.data,
          horario: selectedSlot?.horario || form.horario,
          estabelecimentoNome: estabelecimentoSelecionado?.nome || '',
          servicoNome: servicoSelecionado?.nome || '',
          profissionalNome:
            selectedSlot?.profissionalNome ||
            profissionalSelecionado?.profissionalNome ||
            '',
          clienteNome: clienteAutenticado ? usuario?.nome || form.clienteNome : form.clienteNome,
          clienteEmail: clienteAutenticado ? usuario?.email || form.clienteEmail : form.clienteEmail,
          clienteTelefone: form.clienteTelefone,
          reagendamento: Boolean(reagendarId),
          clienteAutenticado,
          calendarEvent,
        },
      })
    } catch (error) {
      console.error(error)
      setMessage(error instanceof Error ? error.message : 'Erro ao criar agendamento.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auto-agendamento-page">
      <header className="auto-agendamento-header">
        <div>
          <p className="auto-agendamento-eyebrow">Autoagendamento</p>
          <h1>Escolha seu estabelecimento e serviço</h1>
          <p>Fluxo público/logado para o cliente selecionar unidade, serviço, profissional e horário.</p>
          {reagendarId && <p className="auto-agendamento-eyebrow">Modo de remarcação ativo para o agendamento anterior.</p>}
        </div>
        {clienteAutenticado && (
          <Link to="/portal" className="auto-agendamento-link">
            Voltar ao portal
          </Link>
        )}
      </header>

      {message && <div className="auto-agendamento-message">{message}</div>}

      <form className="auto-agendamento-grid" onSubmit={handleSubmit}>
        <section className="auto-agendamento-card auto-agendamento-card-selection">
          <div className="auto-agendamento-card-heading">
            <div>
              <span className="auto-agendamento-card-step">Etapa 1</span>
              <h2>Seleções iniciais</h2>
            </div>
            <p>Defina onde e com quem você quer ser atendido.</p>
          </div>
          {loading ? (
            <p>Carregando estabelecimentos...</p>
          ) : (
            <>
              <label>
                <span>Estabelecimento</span>
                <select
                  value={form.estabelecimentoId}
                  onChange={(e) => updateField('estabelecimentoId', e.target.value)}
                  required
                >
                  <option value="">Selecione</option>
                  {estabelecimentos.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Serviço</span>
                <select
                  value={form.servicoId}
                  onChange={(e) => updateField('servicoId', e.target.value)}
                  required
                  disabled={!form.estabelecimentoId}
                >
                  <option value="">Selecione</option>
                  {servicos.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Profissional</span>
                <select
                  value={form.filtroProfissionalId}
                  onChange={(e) => updateField('filtroProfissionalId', e.target.value)}
                  disabled={!form.servicoId}
                >
                  <option value="">Qualquer profissional disponível</option>
                  {profissionais.map((item) => (
                    <option key={item.id} value={item.profissionalId}>
                      {item.profissionalNome}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Data</span>
                <input
                  type="date"
                  value={form.data}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => updateField('data', e.target.value)}
                  required
                />
              </label>

              <div className="auto-agendamento-selection-summary">
                <div className="auto-agendamento-mini-card">
                  <span>Estabelecimento</span>
                  <strong>{estabelecimentoSelecionado?.nome || 'Escolha uma unidade'}</strong>
                </div>
                <div className="auto-agendamento-mini-card">
                  <span>Serviço</span>
                  <strong>{servicoSelecionado?.nome || 'Escolha um serviço'}</strong>
                </div>
                <div className="auto-agendamento-mini-card">
                  <span>Profissional</span>
                  <strong>{profissionalSelecionado?.profissionalNome || 'Primeiro disponível'}</strong>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="auto-agendamento-card auto-agendamento-card-slots">
          <div className="auto-agendamento-card-heading">
            <div>
              <span className="auto-agendamento-card-step">Etapa 2</span>
              <h2>Horários disponíveis</h2>
            </div>
            <p>{selectedSlot ? `Selecionado: ${selectedSlot.horario} com ${selectedSlot.profissionalNome}` : 'Escolha o melhor horário para você.'}</p>
          </div>
          {!form.estabelecimentoId || !form.servicoId || !form.data ? (
            <div className="auto-agendamento-empty-state">
              <strong>Faltam algumas escolhas</strong>
              <p>Selecione estabelecimento, serviço e data para liberar os horários.</p>
            </div>
          ) : horariosVisiveis.length === 0 ? (
            <div className="auto-agendamento-empty-state">
              <strong>Nenhum horário encontrado</strong>
              <p>Para hoje, os horários anteriores ao horário atual não são exibidos. Troque a data ou escolha outro profissional para encontrar disponibilidade.</p>
            </div>
          ) : (
            <div className="auto-agendamento-slot-groups">
              {[
                { key: 'manha', label: 'Manhã', data: horariosAgrupados.manha },
                { key: 'tarde', label: 'Tarde', data: horariosAgrupados.tarde },
                { key: 'noite', label: 'Noite', data: horariosAgrupados.noite },
              ]
                .filter((group) => group.data.length > 0)
                .map((group) => (
                  <div key={group.key} className="auto-agendamento-slot-group">
                    <div className="auto-agendamento-slot-group-header">
                      <h3>{group.label}</h3>
                      <span>{group.data.length} opções</span>
                    </div>
                    <div className="auto-agendamento-slots">
                      {group.data.map((slot) => {
                        const active = form.horario === slot.horario && form.profissionalId === slot.profissionalId
                        return (
                          <button
                            key={`${slot.profissionalId}-${slot.horario}`}
                            type="button"
                            className={active ? 'active' : ''}
                            onClick={() => handleSelectHorario(slot)}
                          >
                            <strong>{slot.horario}</strong>
                            <span>{slot.profissionalNome}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
          {selectedSlot && (
            <div className="auto-agendamento-mobile-next">
              <div>
                <span>Selecionado</span>
                <strong>{selectedSlot.horario} com {selectedSlot.profissionalNome}</strong>
              </div>
              <button type="button" className="auto-agendamento-mobile-next-button" onClick={scrollToConfirmacao}>
                Continuar
              </button>
            </div>
          )}
        </section>

        <section className="auto-agendamento-card auto-agendamento-card-full" ref={confirmacaoRef}>
          <div className="auto-agendamento-card-heading">
            <div>
              <span className="auto-agendamento-card-step">Etapa 3</span>
              <h2>Confirmar agendamento</h2>
            </div>
            <p>Preencha seus dados e revise o resumo antes de finalizar.</p>
          </div>
          {clienteAutenticado && (
            <div className="auto-agendamento-auth-box">
              <strong>Conta vinculada:</strong> este agendamento será salvo no histórico de {usuario?.nome}.
            </div>
          )}

          <div className="auto-agendamento-booking-summary">
            <div className="auto-agendamento-booking-summary-item">
              <span>Unidade</span>
              <strong>{estabelecimentoSelecionado?.nome || 'Pendente'}</strong>
            </div>
            <div className="auto-agendamento-booking-summary-item">
              <span>Serviço</span>
              <strong>{servicoSelecionado?.nome || 'Pendente'}</strong>
            </div>
            <div className="auto-agendamento-booking-summary-item">
              <span>Profissional</span>
              <strong>{selectedSlot?.profissionalNome || profissionalSelecionado?.profissionalNome || 'Pendente'}</strong>
            </div>
            <div className="auto-agendamento-booking-summary-item highlight">
              <span>Horário escolhido</span>
              <strong>{selectedSlot ? `${form.data} às ${selectedSlot.horario}` : 'Selecione um horário'}</strong>
            </div>
          </div>

          <div className="auto-agendamento-form-grid">
            <label>
              <span>Nome</span>
              <input
                value={form.clienteNome}
                onChange={(e) => updateField('clienteNome', e.target.value)}
                required
                readOnly={clienteAutenticado}
              />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={form.clienteEmail}
                onChange={(e) => updateField('clienteEmail', e.target.value)}
                required
                readOnly={clienteAutenticado}
              />
            </label>
            <label>
              <span>Telefone</span>
              <input
                value={form.clienteTelefone}
                onChange={(e) => updateField('clienteTelefone', e.target.value)}
                required
              />
            </label>
            <label className="auto-agendamento-form-grid-full">
              <span>Observações</span>
              <textarea
                value={form.observacoes}
                onChange={(e) => updateField('observacoes', e.target.value)}
                rows={3}
              />
            </label>
          </div>

          <div className="auto-agendamento-footer">
            <div className="auto-agendamento-footer-copy">
              <strong>{selectedSlot ? 'Tudo certo para confirmar' : 'Falta escolher um horário'}</strong>
              <p>{selectedSlot ? 'Revise seus dados e finalize o agendamento.' : 'Os horários ficam no bloco da direita, separados por período do dia.'}</p>
            </div>
            <button
              type="submit"
              className="auto-agendamento-submit"
              disabled={
                submitting ||
                !form.estabelecimentoId ||
                !form.servicoId ||
                !form.data ||
                !form.horario ||
                !form.profissionalId
              }
            >
              {submitting ? 'Confirmando...' : 'Confirmar agendamento'}
            </button>
          </div>
        </section>
      </form>

      {selectedSlot && (
        <div className="auto-agendamento-mobile-bar">
          <div className="auto-agendamento-mobile-bar-copy">
            <span>Horário escolhido</span>
            <strong>{selectedSlot.horario} • {selectedSlot.profissionalNome}</strong>
          </div>
          <button type="button" className="auto-agendamento-mobile-bar-button" onClick={scrollToConfirmacao}>
            Finalizar
          </button>
        </div>
      )}
    </div>
  )
}

export default AutoAgendamento
