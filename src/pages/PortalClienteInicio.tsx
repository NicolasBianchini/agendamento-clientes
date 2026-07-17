import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { agendamentosService, fromFirestoreDate } from '../services/firestore'
import { getUserSession } from '../services/auth'
import './PortalCliente.css'

function PortalClienteInicio() {
  const usuario = getUserSession()
  const [agendamentos, setAgendamentos] = useState<any[]>([])

  useEffect(() => {
    loadResumo()
  }, [])

  const loadResumo = async () => {
    if (!usuario?.id) return
    try {
      const data = await agendamentosService.getByClienteUserId(usuario.id)
      setAgendamentos(data)
    } catch (error) {
      console.error(error)
    }
  }

  const proximoAgendamento = useMemo(() => {
    return agendamentos
      .map((agendamento) => {
        const data = agendamento.data?.toDate
          ? fromFirestoreDate(agendamento.data).toISOString().split('T')[0]
          : String(agendamento.data || '').split('T')[0]
        return {
          ...agendamento,
          dataNormalizada: data,
        }
      })
      .filter((agendamento) => new Date(`${agendamento.dataNormalizada}T${agendamento.horario}`) >= new Date() && agendamento.status === 'agendado')
      .sort((a, b) => new Date(`${a.dataNormalizada}T${a.horario}`).getTime() - new Date(`${b.dataNormalizada}T${b.horario}`).getTime())[0]
  }, [agendamentos])

  const historicoCount = agendamentos.filter((agendamento) => agendamento.status !== 'agendado').length

  return (
    <div className="portal-cliente-page">
      <section className="portal-hero">
        <div className="portal-hero-copy">
          <p className="portal-hero-kicker">Seu próximo passo</p>
          <h2>Agende primeiro, acompanhe depois.</h2>
          <p>
            Escolha estabelecimento, serviço e profissional em poucos toques. Depois você acompanha
            próximos horários, histórico, cancelamentos e remarcações sem sair do portal.
          </p>
          <div className="portal-hero-actions">
            <Link to="/agendar" className="portal-link-button portal-link-button-primary">
              Agendar agora
            </Link>
            <Link to="/portal/agendamentos" className="portal-link-button portal-link-button-light">
              Ver meus agendamentos
            </Link>
          </div>
        </div>
        <div className="portal-hero-highlight">
          <span className="portal-highlight-label">Atalho rápido</span>
          <strong>{proximoAgendamento ? 'Você já tem um horário confirmado' : 'Nenhum horário reservado ainda'}</strong>
          <p>
            {proximoAgendamento
              ? `${proximoAgendamento.servicoNome || 'Serviço'} em ${new Date(`${proximoAgendamento.dataNormalizada}T00:00:00`).toLocaleDateString('pt-BR')} às ${proximoAgendamento.horario}`
              : 'Comece por “Agendar agora” para reservar seu próximo atendimento.'}
          </p>
        </div>
      </section>

      <section className="portal-grid">
        <article className="portal-card portal-card-featured">
          <span className="portal-card-kicker">Prioridade</span>
          <h3>Novo horário</h3>
          <p>Escolha estabelecimento, serviço, profissional e adicione o evento direto ao seu calendário.</p>
          <Link to="/agendar" className="portal-link-button portal-link-button-primary">Agendar agora</Link>
        </article>

        <article className="portal-card">
          <h3>Próximo agendamento</h3>
          {proximoAgendamento ? (
            <>
              <p>{proximoAgendamento.servicoNome || 'Serviço'} em {new Date(`${proximoAgendamento.dataNormalizada}T00:00:00`).toLocaleDateString('pt-BR')} às {proximoAgendamento.horario}</p>
              <p>{proximoAgendamento.profissionalNome || 'Profissional a definir'}</p>
            </>
          ) : (
            <p>Você ainda não possui um próximo horário confirmado.</p>
          )}
          <Link to="/portal/agendamentos" className="portal-link-button">Ver agenda</Link>
        </article>
        <article className="portal-card">
          <h3>Histórico</h3>
          <p>Você já possui {historicoCount} agendamento(s) finalizado(s), cancelado(s) ou remarcado(s).</p>
          <Link to="/portal/agendamentos" className="portal-link-button portal-link-button-light">Abrir histórico</Link>
        </article>
      </section>
    </div>
  )
}

export default PortalClienteInicio
