import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { bloqueiosProfissionalService, disponibilidadeProfissionalService, profissionalServicosService, servicosService } from '../services/firestore'
import { getUserSession, isAdmin, isProfissional, isProprietario } from '../services/auth'
import { listarProfissionaisDisponiveis } from '../services/usuarios'
import './Profissionais.css'

const DIAS_SEMANA = [
  { id: 0, label: 'Domingo' },
  { id: 1, label: 'Segunda' },
  { id: 2, label: 'Terça' },
  { id: 3, label: 'Quarta' },
  { id: 4, label: 'Quinta' },
  { id: 5, label: 'Sexta' },
  { id: 6, label: 'Sábado' },
]

const createDisponibilidadePadrao = (): DisponibilidadeForm[] =>
  DIAS_SEMANA.map((dia) => ({
    diaSemana: dia.id,
    ativo: dia.id >= 1 && dia.id <= 5,
    inicio: '08:00',
    fim: '18:00',
  }))

type DisponibilidadeForm = {
  diaSemana: number
  ativo: boolean
  inicio: string
  fim: string
}

function Profissionais() {
  const usuario = getUserSession()
  const usuarioProfissional = isProfissional(usuario)
  const usuarioProprietario = isProprietario(usuario)
  const usuarioOperacional = usuarioProfissional || usuarioProprietario
  const podeGerenciarProfissionais = isAdmin(usuario)
  const podeAcessarPagina = podeGerenciarProfissionais || usuarioOperacional
  const [profissionais, setProfissionais] = useState<any[]>([])
  const [servicos, setServicos] = useState<any[]>([])
  const [selectedProfissionalId, setSelectedProfissionalId] = useState('')
  const [selectedServicoIds, setSelectedServicoIds] = useState<string[]>([])
  const [disponibilidade, setDisponibilidade] = useState<DisponibilidadeForm[]>(createDisponibilidadePadrao)
  const [bloqueios, setBloqueios] = useState<any[]>([])
  const [novoBloqueio, setNovoBloqueio] = useState({
    titulo: '',
    dataInicio: '',
    dataFim: '',
    horarioInicio: '',
    horarioFim: '',
  })
  const [message, setMessage] = useState<string | null>(null)

  const profissionalAtual = useMemo(
    () => profissionais.find((item) => item.id === selectedProfissionalId) || null,
    [profissionais, selectedProfissionalId]
  )

  useEffect(() => {
    if (!podeAcessarPagina) {
      return
    }

    loadBase()
  }, [])

  useEffect(() => {
    if (!podeAcessarPagina) {
      return
    }

    if (selectedProfissionalId) {
      loadProfissionalContext(selectedProfissionalId)
    }
  }, [selectedProfissionalId])

  const loadBase = async () => {
    try {
      const [profissionaisData, servicosData] = await Promise.all([
        usuarioOperacional
          ? Promise.resolve(usuario ? [usuario] : [])
          : listarProfissionaisDisponiveis(usuario?.estabelecimentoId || undefined),
        servicosService.getActive(),
      ])
      setProfissionais(profissionaisData)
      setServicos(servicosData)
      if (profissionaisData.length > 0) {
        setSelectedProfissionalId(profissionaisData[0].id)
      } else {
        setSelectedProfissionalId('')
        setSelectedServicoIds([])
        setBloqueios([])
        setDisponibilidade(createDisponibilidadePadrao())
      }
    } catch (error) {
      console.error(error)
      setMessage('Erro ao carregar profissionais.')
    }
  }

  const loadProfissionalContext = async (profissionalId: string) => {
    try {
      const [servicosProfissional, disponibilidadeData, bloqueiosData] = await Promise.all([
        profissionalServicosService.getByProfissional(profissionalId),
        disponibilidadeProfissionalService.getByProfissional(profissionalId),
        bloqueiosProfissionalService.getByProfissional(profissionalId),
      ])

      setSelectedServicoIds(servicosProfissional.map((item: any) => item.servicoId))
      setBloqueios(bloqueiosData)

      if (disponibilidadeData.length > 0) {
        setDisponibilidade(
          DIAS_SEMANA.map((dia) => {
            const item = disponibilidadeData.find((disp: any) => disp.diaSemana === dia.id)
            return {
              diaSemana: dia.id,
              ativo: item?.ativo !== false,
              inicio: item?.inicio || '08:00',
              fim: item?.fim || '18:00',
            }
          })
        )
      } else {
        setDisponibilidade(createDisponibilidadePadrao())
      }
    } catch (error) {
      console.error(error)
      setMessage('Erro ao carregar contexto do profissional.')
    }
  }

  const toggleServico = (servicoId: string) => {
    setSelectedServicoIds((prev) =>
      prev.includes(servicoId) ? prev.filter((id) => id !== servicoId) : [...prev, servicoId]
    )
  }

  const updateDisponibilidade = (diaSemana: number, field: keyof DisponibilidadeForm, value: string | boolean) => {
    setDisponibilidade((prev) =>
      prev.map((item) => item.diaSemana === diaSemana ? { ...item, [field]: value } : item)
    )
  }

  const handleSaveVinculos = async () => {
    if (!profissionalAtual) return
    try {
      const servicosSelecionados = servicos.filter((item: any) => selectedServicoIds.includes(item.id))
      await profissionalServicosService.upsertMany(
        { ...profissionalAtual, estabelecimentoId: profissionalAtual.estabelecimentoId || usuario?.estabelecimentoId || null },
        servicosSelecionados
      )
      await disponibilidadeProfissionalService.replaceForProfissional(
        { ...profissionalAtual, estabelecimentoId: profissionalAtual.estabelecimentoId || usuario?.estabelecimentoId || null },
        disponibilidade
      )
      setMessage(usuarioOperacional ? 'Disponibilidade salva com sucesso.' : 'Serviços e disponibilidade salvos com sucesso.')
      await loadProfissionalContext(profissionalAtual.id)
    } catch (error) {
      console.error(error)
      setMessage('Erro ao salvar dados do profissional.')
    }
  }

  const handleAddBloqueio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profissionalAtual) return

    const dataFim = novoBloqueio.dataFim || novoBloqueio.dataInicio
    if (dataFim < novoBloqueio.dataInicio) {
      setMessage('A data final do bloqueio não pode ser menor que a data inicial.')
      return
    }

    try {
      await bloqueiosProfissionalService.create({
        estabelecimentoId: profissionalAtual.estabelecimentoId || usuario?.estabelecimentoId || null,
        profissionalId: profissionalAtual.id,
        profissionalNome: profissionalAtual.nome,
        titulo: novoBloqueio.titulo.trim() || 'Bloqueio manual',
        dataInicio: novoBloqueio.dataInicio,
        dataFim,
        horarioInicio: novoBloqueio.horarioInicio || null,
        horarioFim: novoBloqueio.horarioFim || null,
      })
      setNovoBloqueio({
        titulo: '',
        dataInicio: '',
        dataFim: '',
        horarioInicio: '',
        horarioFim: '',
      })
      setMessage('Bloqueio cadastrado com sucesso.')
      await loadProfissionalContext(profissionalAtual.id)
    } catch (error) {
      console.error(error)
      setMessage('Erro ao cadastrar bloqueio.')
    }
  }

  const handleDeleteBloqueio = async (id: string) => {
    try {
      await bloqueiosProfissionalService.delete(id)
      if (selectedProfissionalId) {
        await loadProfissionalContext(selectedProfissionalId)
      }
    } catch (error) {
      console.error(error)
      setMessage('Erro ao excluir bloqueio.')
    }
  }

  if (!podeAcessarPagina) {
    return (
      <div className="profissionais-page">
        <div className="profissionais-card">
          <h1>Acesso restrito</h1>
          <p>Somente usuários internos podem configurar disponibilidade profissional.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="profissionais-page">
      <div className="profissionais-header">
        <div className="profissionais-hero">
          <span className="profissionais-eyebrow">
            {usuarioProfissional ? 'Minha agenda operacional' : 'Gestão da equipe'}
          </span>
          <h1>{usuarioOperacional ? 'Minha disponibilidade' : 'Profissionais'}</h1>
          <p>
            {usuarioOperacional
              ? 'Defina seus horários de atendimento, registre folgas e ajuste o intervalo da agenda nas configurações.'
              : 'Configure serviços atendidos, disponibilidade e bloqueios da equipe.'}
          </p>
        </div>
        <div className="profissionais-header-side">
          {usuarioOperacional && (
            <Link to="/configuracoes" className="profissionais-secondary-link">
              Abrir configurações
            </Link>
          )}
          {message && <div className="profissionais-message">{message}</div>}
        </div>
      </div>

      <div className={`profissionais-grid ${usuarioOperacional ? 'profissionais-grid-single' : ''}`}>
        {!usuarioOperacional && (
        <div className="profissionais-card">
          <div className="profissionais-section-heading">
            <span className="profissionais-section-kicker">Vínculo do atendimento</span>
            <h2>Serviços atendidos</h2>
            <p>Escolha o profissional e marque exatamente quais serviços ele pode receber no agendamento.</p>
          </div>

          <label className="profissionais-label">
            <span>Profissional</span>
            <select value={selectedProfissionalId} onChange={(e) => setSelectedProfissionalId(e.target.value)}>
              {profissionais.map((profissional) => (
                <option key={profissional.id} value={profissional.id}>
                  {profissional.nome}
                </option>
              ))}
            </select>
          </label>

          <div className="profissionais-checkbox-list">
            {servicos.map((servico: any) => (
              <label key={servico.id} className="profissionais-checkbox-item">
                <input
                  type="checkbox"
                  checked={selectedServicoIds.includes(servico.id)}
                  onChange={() => toggleServico(servico.id)}
                />
                <span>{servico.nome}</span>
              </label>
            ))}
          </div>

          <button type="button" className="profissionais-primary" onClick={handleSaveVinculos}>
            Salvar serviços e disponibilidade
          </button>
        </div>
        )}

        <div className="profissionais-card">
          <div className="profissionais-section-heading">
            <span className="profissionais-section-kicker">Agenda recorrente</span>
            <h2>Disponibilidade semanal</h2>
            <p>
              {usuarioProfissional
                || usuarioProprietario
                ? 'Defina os dias e horários em que você atende. Isso controla o que fica livre na sua agenda.'
                : 'Defina os dias ativos e o intervalo padrão de atendimento de cada profissional.'}
            </p>
          </div>

          {usuarioOperacional && (
            <div className="profissionais-inline-note">
              O intervalo entre os slots pode ser ajustado em <Link to="/configuracoes">Configurações</Link>.
            </div>
          )}

          {!usuarioOperacional && (
            <label className="profissionais-label">
              <span>Profissional</span>
              <select value={selectedProfissionalId} onChange={(e) => setSelectedProfissionalId(e.target.value)}>
                {profissionais.map((profissional) => (
                  <option key={profissional.id} value={profissional.id}>
                    {profissional.nome}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="profissionais-disponibilidade">
            {disponibilidade.map((item) => {
              const dia = DIAS_SEMANA.find((diaItem) => diaItem.id === item.diaSemana)
              return (
                <div key={item.diaSemana} className="profissionais-dia">
                  <label className="profissionais-checkbox-item">
                    <input
                      type="checkbox"
                      checked={item.ativo}
                      onChange={(e) => updateDisponibilidade(item.diaSemana, 'ativo', e.target.checked)}
                    />
                    <span>{dia?.label}</span>
                  </label>
                  <input
                    type="time"
                    value={item.inicio}
                    onChange={(e) => updateDisponibilidade(item.diaSemana, 'inicio', e.target.value)}
                    disabled={!item.ativo}
                  />
                  <input
                    type="time"
                    value={item.fim}
                    onChange={(e) => updateDisponibilidade(item.diaSemana, 'fim', e.target.value)}
                    disabled={!item.ativo}
                  />
                </div>
              )
            })}
          </div>

          {usuarioOperacional && (
            <button type="button" className="profissionais-primary" onClick={handleSaveVinculos}>
              Salvar disponibilidade
            </button>
          )}
        </div>
      </div>

      <div className="profissionais-grid profissionais-grid-bottom">
        <form className="profissionais-card" onSubmit={handleAddBloqueio}>
          <div className="profissionais-section-heading">
            <span className="profissionais-section-kicker">Exceções da agenda</span>
            <h2>Bloqueios e folgas</h2>
            <p>Cadastre férias, pausas, reuniões ou qualquer período que não deva aparecer como disponível.</p>
          </div>

          <label className="profissionais-label">
            <span>Título</span>
            <input
              value={novoBloqueio.titulo}
              onChange={(e) => setNovoBloqueio((prev) => ({ ...prev, titulo: e.target.value }))}
              placeholder="Férias, almoço, reunião..."
            />
          </label>
          <div className="profissionais-inline">
            <label className="profissionais-label">
              <span>Data início</span>
              <input
                type="date"
                value={novoBloqueio.dataInicio}
                onChange={(e) => setNovoBloqueio((prev) => ({ ...prev, dataInicio: e.target.value }))}
                required
              />
            </label>
            <label className="profissionais-label">
              <span>Data fim</span>
              <input
                type="date"
                value={novoBloqueio.dataFim}
                onChange={(e) => setNovoBloqueio((prev) => ({ ...prev, dataFim: e.target.value }))}
              />
            </label>
          </div>
          <div className="profissionais-inline">
            <label className="profissionais-label">
              <span>Hora início</span>
              <input
                type="time"
                value={novoBloqueio.horarioInicio}
                onChange={(e) => setNovoBloqueio((prev) => ({ ...prev, horarioInicio: e.target.value }))}
              />
            </label>
            <label className="profissionais-label">
              <span>Hora fim</span>
              <input
                type="time"
                value={novoBloqueio.horarioFim}
                onChange={(e) => setNovoBloqueio((prev) => ({ ...prev, horarioFim: e.target.value }))}
              />
            </label>
          </div>
          <button type="submit" className="profissionais-primary">
            Adicionar bloqueio
          </button>
        </form>

        <div className="profissionais-card">
          <div className="profissionais-section-heading">
            <span className="profissionais-section-kicker">Histórico operacional</span>
            <h2>Bloqueios cadastrados</h2>
            <p>Acompanhe os bloqueios já lançados para evitar conflitos de agenda.</p>
          </div>

          <div className="profissionais-bloqueios">
            {bloqueios.length === 0 ? (
              <div className="profissionais-empty-state">
                <strong>Nenhum bloqueio cadastrado</strong>
                <p>Assim que você adicionar uma folga ou indisponibilidade, ela aparecerá aqui.</p>
              </div>
            ) : (
              bloqueios.map((bloqueio: any) => (
                <article key={bloqueio.id} className="profissionais-bloqueio-item">
                  <div>
                    <strong>{bloqueio.titulo || 'Bloqueio'}</strong>
                    <p>
                      {bloqueio.dataInicio} {bloqueio.horarioInicio ? `• ${bloqueio.horarioInicio}` : ''}
                      {bloqueio.dataFim ? ` até ${bloqueio.dataFim}` : ''}
                      {bloqueio.horarioFim ? ` • ${bloqueio.horarioFim}` : ''}
                    </p>
                  </div>
                  <button type="button" className="profissionais-danger" onClick={() => handleDeleteBloqueio(bloqueio.id)}>
                    Excluir
                  </button>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profissionais
