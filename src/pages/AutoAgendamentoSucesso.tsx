import { Link, Navigate, useLocation } from 'react-router-dom'
import { buildCalendarAssociation } from '../services/agendamentoIntegracoes'
import { getUserSession, isCliente } from '../services/auth'
import './AutoAgendamentoSucesso.css'

type AutoAgendamentoSucessoState = {
  agendamentoId: string
  data: string
  horario: string
  estabelecimentoNome: string
  servicoNome: string
  profissionalNome: string
  clienteNome: string
  clienteEmail: string
  clienteTelefone: string
  reagendamento: boolean
  clienteAutenticado: boolean
  calendarEvent?: {
    googleCalendarUrl: string
    icsDataUri: string
  }
}

function formatarData(data: string) {
  if (!data) return ''
  const [ano, mes, dia] = data.split('-')
  if (!ano || !mes || !dia) return data
  return `${dia}/${mes}/${ano}`
}

function AutoAgendamentoSucesso() {
  const usuario = getUserSession()
  const location = useLocation()
  const state = location.state as AutoAgendamentoSucessoState | null
  const clienteAutenticado = isCliente(usuario)

  if (!state) {
    return <Navigate to={clienteAutenticado ? '/portal' : '/agendar'} replace />
  }

  const calendarEvent = state.calendarEvent || buildCalendarAssociation(
    {
      id: state.agendamentoId,
      data: state.data,
      horario: state.horario,
      clienteNome: state.clienteNome,
      clienteTelefone: state.clienteTelefone,
      clienteEmail: state.clienteEmail,
      servicoNome: state.servicoNome,
      profissionalNome: state.profissionalNome,
      estabelecimentoNome: state.estabelecimentoNome,
      status: 'agendado',
    },
    30
  )

  return (
    <main className="auto-agendamento-sucesso-page">
      <section className="auto-agendamento-sucesso-card">
        <span className="auto-agendamento-sucesso-eyebrow">
          {state.reagendamento ? 'Remarcação confirmada' : 'Agendamento confirmado'}
        </span>
        <h1>
          {state.reagendamento
            ? 'Seu novo horário já está reservado.'
            : 'Seu horário foi reservado com sucesso.'}
        </h1>
        <p className="auto-agendamento-sucesso-description">
          Obrigado pela preferência. Seu agendamento já foi registrado e os detalhes estão logo abaixo.
        </p>

        <div className="auto-agendamento-sucesso-highlight">
          <strong>{formatarData(state.data)} às {state.horario}</strong>
          <span>{state.estabelecimentoNome}</span>
        </div>

        <div className="auto-agendamento-sucesso-calendar">
          <p>Deseja adicionar ao seu calendário?</p>
          <div className="auto-agendamento-sucesso-calendar-actions">
            <a
              href={calendarEvent.googleCalendarUrl}
              target="_blank"
              rel="noreferrer"
              className="auto-agendamento-sucesso-primary"
            >
              Google Calendar
            </a>
            <a
              href={calendarEvent.icsDataUri}
              download={`agendamento-${state.agendamentoId}.ics`}
              className="auto-agendamento-sucesso-secondary"
            >
              Apple Calendar
            </a>
          </div>
        </div>

        <div className="auto-agendamento-sucesso-grid">
          <div>
            <span>Serviço</span>
            <strong>{state.servicoNome || 'Não informado'}</strong>
          </div>
          <div>
            <span>Profissional</span>
            <strong>{state.profissionalNome || 'Primeiro disponível'}</strong>
          </div>
          <div>
            <span>Cliente</span>
            <strong>{state.clienteNome || 'Não informado'}</strong>
          </div>
          <div>
            <span>Contato</span>
            <strong>{state.clienteTelefone || state.clienteEmail || 'Não informado'}</strong>
          </div>
        </div>

        <div className="auto-agendamento-sucesso-actions">
          {state.clienteAutenticado ? (
            <>
              <Link to="/portal/agendamentos" className="auto-agendamento-sucesso-primary">
                Ver meus agendamentos
              </Link>
              <Link to="/portal" className="auto-agendamento-sucesso-secondary">
                Voltar ao portal
              </Link>
            </>
          ) : (
            <>
              <Link to="/agendar" className="auto-agendamento-sucesso-primary">
                Fazer outro agendamento
              </Link>
              <Link to="/login" className="auto-agendamento-sucesso-secondary">
                Entrar na conta
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  )
}

export default AutoAgendamentoSucesso
