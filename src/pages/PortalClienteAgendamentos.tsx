import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { agendamentosService, configuracoesService, fromFirestoreDate } from '../services/firestore'
import { getUserSession } from '../services/auth'
import { canManageAppointmentByAntecedence } from '../services/agendamentoIntegracoes'
import './PortalCliente.css'

function PortalClienteAgendamentos() {
  const usuario = getUserSession()
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAgendamentos()
  }, [])

  const loadAgendamentos = async () => {
    if (!usuario?.id) {
      setLoading(false)
      return
    }

    try {
      const [data, configData] = await Promise.all([
        agendamentosService.getByClienteUserId(usuario.id),
        configuracoesService.getComPadroes(),
      ])
      setAgendamentos(data)
      setConfig(configData)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const agendamentosProcessados = useMemo(
    () =>
      agendamentos.map((agendamento) => {
        const data = agendamento.data?.toDate
          ? fromFirestoreDate(agendamento.data).toISOString().split('T')[0]
          : String(agendamento.data || '').split('T')[0]
        const dataFormatada = new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR')
        return {
          ...agendamento,
          dataNormalizada: data,
          dataFormatada,
        }
      }),
    [agendamentos]
  )

  const proximosAgendamentos = useMemo(
    () =>
      agendamentosProcessados.filter((agendamento) => {
        const dataHora = new Date(`${agendamento.dataNormalizada}T${agendamento.horario || '00:00'}`)
        return dataHora >= new Date() && agendamento.status === 'agendado'
      }).sort((a, b) => new Date(`${a.dataNormalizada}T${a.horario}`).getTime() - new Date(`${b.dataNormalizada}T${b.horario}`).getTime()),
    [agendamentosProcessados]
  )

  const historico = useMemo(
    () =>
      agendamentosProcessados.filter((agendamento) => {
        const dataHora = new Date(`${agendamento.dataNormalizada}T${agendamento.horario || '00:00'}`)
        return dataHora < new Date() || agendamento.status !== 'agendado'
      }).sort((a, b) => new Date(`${b.dataNormalizada}T${b.horario}`).getTime() - new Date(`${a.dataNormalizada}T${a.horario}`).getTime()),
    [agendamentosProcessados]
  )

  const handleCancelar = async (agendamentoId: string) => {
    try {
      await agendamentosService.update(agendamentoId, { status: 'cancelado' })
      await loadAgendamentos()
    } catch (error) {
      console.error(error)
    }
  }

  if (loading) {
    return (
      <div className="portal-cliente-page">
        <section className="portal-section">
          <h2>Meus Agendamentos</h2>
          <p>Carregando seus agendamentos...</p>
        </section>
      </div>
    )
  }

  return (
    <div className="portal-cliente-page">
      <section className="portal-section portal-section-cta">
        <div className="portal-section-header">
          <div>
            <h2>Novo atendimento</h2>
            <p>Precisa marcar outro horário? Comece um novo agendamento por aqui.</p>
          </div>
          <Link to="/agendar" className="portal-link-button">Novo agendamento</Link>
        </div>
      </section>

      <section className="portal-section">
        <div className="portal-section-header">
          <div>
            <h2>Próximos agendamentos</h2>
            <p>Veja o que está confirmado e gerencie cancelamento ou remarcação conforme a regra da unidade.</p>
          </div>
        </div>

        {proximosAgendamentos.length === 0 ? (
          <p>Nenhum agendamento futuro encontrado.</p>
        ) : (
          <div className="portal-stack">
            {proximosAgendamentos.map((agendamento) => {
              const podeCancelar =
                config?.permiteCancelamentoCliente &&
                canManageAppointmentByAntecedence(agendamento, Number(config?.antecedenciaCancelamentoHoras || 24))
              const podeRemarcar =
                config?.permiteRemarcacaoCliente &&
                canManageAppointmentByAntecedence(agendamento, Number(config?.antecedenciaRemarcacaoHoras || 24))
              const antecedenciaCancelamento = Number(config?.antecedenciaCancelamentoHoras || 24)
              const antecedenciaRemarcacao = Number(config?.antecedenciaRemarcacaoHoras || 24)
              const podeGerenciar = podeRemarcar || podeCancelar
              const antecedenciaMinima = Math.max(
                antecedenciaCancelamento,
                antecedenciaRemarcacao
              )

              return (
                <article key={agendamento.id} className="portal-card portal-card-wide">
                  <div className="portal-card-header">
                    <div>
                      <h3>{agendamento.servicoNome || 'Serviço'}</h3>
                      <p className="portal-card-subtitle">
                        {agendamento.dataFormatada} às {agendamento.horario}
                      </p>
                    </div>
                    <span className="portal-status">{agendamento.status}</span>
                  </div>
                  <div className="portal-card-meta">
                    <p><strong>Profissional:</strong> {agendamento.profissionalNome || 'A definir'}</p>
                    <p><strong>Unidade:</strong> {agendamento.estabelecimentoNome || 'Unidade não identificada'}</p>
                  </div>
                  <div className="portal-card-section">
                    <span className="portal-card-section-title">Gerenciar horário</span>
                    {podeGerenciar ? (
                      <div className="portal-card-actions portal-card-actions-primary">
                        {config?.permiteRemarcacaoCliente !== false && podeRemarcar && (
                          <Link to={`/agendar?reagendar=${agendamento.id}`} className="portal-link-button">
                            Remarcar
                          </Link>
                        )}
                        {config?.permiteCancelamentoCliente !== false && podeCancelar && (
                          <button type="button" className="portal-link-button portal-link-button-danger" onClick={() => handleCancelar(agendamento.id)}>
                            Desmarcar
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="portal-card-notice">
                        <strong>Alteração indisponível agora</strong>
                        <p>Esse horário só pode ser alterado com pelo menos {antecedenciaMinima} hora(s) de antecedência.</p>
                      </div>
                    )}
                  </div>
                  {(agendamento.calendarEvent?.googleCalendarUrl || agendamento.calendarEvent?.icsDataUri) && (
                    <div className="portal-card-calendar portal-card-section">
                      <span className="portal-card-section-title">Adicionar ao calendário</span>
                      <div className="portal-card-actions portal-card-actions-secondary">
                        {agendamento.calendarEvent?.googleCalendarUrl && (
                          <a href={agendamento.calendarEvent.googleCalendarUrl} target="_blank" rel="noreferrer" className="portal-link-button portal-link-button-light">
                            Google Calendar
                          </a>
                        )}
                        {agendamento.calendarEvent?.icsDataUri && (
                          <a href={agendamento.calendarEvent.icsDataUri} download={`agendamento-${agendamento.id}.ics`} className="portal-link-button portal-link-button-light">
                            Apple Calendar
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="portal-section">
        <h2>Histórico</h2>
        {historico.length === 0 ? (
          <p>Nenhum histórico encontrado.</p>
        ) : (
          <div className="portal-stack">
            {historico.map((agendamento) => (
              <article key={agendamento.id} className="portal-card portal-card-wide">
                <div className="portal-card-header">
                  <h3>{agendamento.servicoNome || 'Serviço'}</h3>
                  <span className="portal-status">{agendamento.status}</span>
                </div>
                <div className="portal-card-meta">
                  <p>Data: {agendamento.dataFormatada}</p>
                  <p>Horário: {agendamento.horario}</p>
                  <p>Profissional: {agendamento.profissionalNome || 'A definir'}</p>
                  <p>Estabelecimento: {agendamento.estabelecimentoNome || 'Unidade não identificada'}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default PortalClienteAgendamentos
