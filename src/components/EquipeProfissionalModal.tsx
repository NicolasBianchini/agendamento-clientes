import { useEffect, useState } from 'react'
import { atualizarUsuario } from '../services/usuarios'
import { bloqueiosProfissionalService, disponibilidadeProfissionalService, profissionalServicosService, servicosService } from '../services/firestore'
import { getUserSession, isProprietario, type Usuario } from '../services/auth'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import { formatarDataParaInput } from '../utils/formatacao'
import MaskedInput from './MaskedInput'
import './EquipeProfissionalModal.css'

const DIAS_SEMANA = [
  { id: 0, label: 'Domingo' },
  { id: 1, label: 'Segunda' },
  { id: 2, label: 'Terça' },
  { id: 3, label: 'Quarta' },
  { id: 4, label: 'Quinta' },
  { id: 5, label: 'Sexta' },
  { id: 6, label: 'Sábado' },
]

type DisponibilidadeForm = {
  diaSemana: number
  ativo: boolean
  inicio: string
  fim: string
}

const createDisponibilidadePadrao = (): DisponibilidadeForm[] =>
  DIAS_SEMANA.map((dia) => ({
    diaSemana: dia.id,
    ativo: dia.id >= 1 && dia.id <= 5,
    inicio: '08:00',
    fim: '18:00',
  }))

interface EquipeProfissionalModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  usuario: Usuario
}

function EquipeProfissionalModal({ isOpen, onClose, onSuccess, usuario }: EquipeProfissionalModalProps) {
  const usuarioAtual = getUserSession()
  const usuarioProprietario = isProprietario(usuarioAtual)
  const modalRef = useKeyboardNavigation(isOpen, onClose)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [senha, setSenha] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [dataExpiracao, setDataExpiracao] = useState('')
  const [semExpiracao, setSemExpiracao] = useState(false)
  const [alterarSenha, setAlterarSenha] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [servicos, setServicos] = useState<any[]>([])
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})

  useEffect(() => {
    if (isOpen) {
      hydrateForm()
      loadContext()
    }
  }, [isOpen, usuario.id])

  const hydrateForm = () => {
    setNome(usuario.nome)
    setEmail(usuario.email)
    setCpf(usuario.cpf || '')
    setWhatsapp(usuario.whatsapp || '')
    setAtivo(usuario.ativo)
    setSenha('')
    setAlterarSenha(false)
    setShowPassword(false)
    setMessage(null)
    setErrors({})

    if (usuario.dataExpiracao) {
      setDataExpiracao(formatarDataParaInput(usuario.dataExpiracao))
      setSemExpiracao(false)
    } else {
      setDataExpiracao('')
      setSemExpiracao(true)
    }
  }

  const loadContext = async () => {
    try {
      const [servicosData, servicosProfissional, disponibilidadeData, bloqueiosData] = await Promise.all([
        servicosService.getActive(),
        profissionalServicosService.getByProfissional(usuario.id),
        disponibilidadeProfissionalService.getByProfissional(usuario.id),
        bloqueiosProfissionalService.getByProfissional(usuario.id),
      ])

      setServicos(servicosData)
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
      setMessage('Erro ao carregar dados do profissional.')
    }
  }

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  const toggleServico = (servicoId: string) => {
    setSelectedServicoIds((prev) =>
      prev.includes(servicoId) ? prev.filter((id) => id !== servicoId) : [...prev, servicoId]
    )
  }

  const updateDisponibilidade = (diaSemana: number, field: keyof DisponibilidadeForm, value: string | boolean) => {
    setDisponibilidade((prev) =>
      prev.map((item) => (item.diaSemana === diaSemana ? { ...item, [field]: value } : item))
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    const nextErrors: Record<string, string | undefined> = {}
    if (!nome.trim()) nextErrors.nome = 'Nome é obrigatório'
    if (!email.trim()) nextErrors.email = 'Email é obrigatório'
    else if (!validateEmail(email.trim())) nextErrors.email = 'Email inválido'
    if (!cpf.trim()) nextErrors.cpf = 'CPF é obrigatório'
    if (whatsapp.trim() && whatsapp.replace(/\D/g, '').length < 10) nextErrors.whatsapp = 'WhatsApp inválido'
    if (alterarSenha && senha.length < 6) nextErrors.senha = 'Senha deve ter no mínimo 6 caracteres'

    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) {
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    try {
      await atualizarUsuario(usuario.id, {
        nome: nome.trim(),
        email: email.trim(),
        cpf: cpf.replace(/\D/g, ''),
        whatsapp: whatsapp.replace(/\D/g, ''),
        role: 'profissional',
        ativo,
        estabelecimentoId: usuarioProprietario ? usuarioAtual?.estabelecimentoId || null : usuario.estabelecimentoId || null,
        dataExpiracao: semExpiracao ? null : (dataExpiracao || null),
        ...(alterarSenha && senha ? { senha } : {}),
      })

      const servicosSelecionados = servicos.filter((item: any) => selectedServicoIds.includes(item.id))
      await profissionalServicosService.upsertMany(
        { id: usuario.id, nome: nome.trim(), estabelecimentoId: usuario.estabelecimentoId || usuarioAtual?.estabelecimentoId || null },
        servicosSelecionados
      )
      await disponibilidadeProfissionalService.replaceForProfissional(
        { id: usuario.id, nome: nome.trim(), estabelecimentoId: usuario.estabelecimentoId || usuarioAtual?.estabelecimentoId || null },
        disponibilidade
      )

      setMessage('Informações do profissional salvas com sucesso.')
      onSuccess?.()
      await loadContext()
    } catch (error: any) {
      console.error(error)
      setMessage(error.message || 'Erro ao salvar profissional.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddBloqueio = async () => {
    const dataFim = novoBloqueio.dataFim || novoBloqueio.dataInicio
    if (!novoBloqueio.dataInicio) {
      setMessage('Informe pelo menos a data inicial do bloqueio.')
      return
    }
    if (dataFim < novoBloqueio.dataInicio) {
      setMessage('A data final do bloqueio não pode ser menor que a data inicial.')
      return
    }

    try {
      await bloqueiosProfissionalService.create({
        estabelecimentoId: usuario.estabelecimentoId || usuarioAtual?.estabelecimentoId || null,
        profissionalId: usuario.id,
        profissionalNome: nome.trim() || usuario.nome,
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
      await loadContext()
    } catch (error) {
      console.error(error)
      setMessage('Erro ao cadastrar bloqueio.')
    }
  }

  const handleDeleteBloqueio = async (id: string) => {
    try {
      await bloqueiosProfissionalService.delete(id)
      setMessage('Bloqueio removido com sucesso.')
      await loadContext()
    } catch (error) {
      console.error(error)
      setMessage('Erro ao excluir bloqueio.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content equipe-profissional-modal" onClick={(e) => e.stopPropagation()} ref={modalRef}>
        <div className="modal-header">
          <div>
            <p className="equipe-profissional-kicker">Equipe</p>
            <h2>{usuario.nome}</h2>
          </div>
          <button className="modal-close" onClick={onClose} disabled={isSubmitting} aria-label="Fechar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSave}>
          {message && <div className={`error-message general-error equipe-profissional-message`}>{message}</div>}

          <div className="equipe-profissional-grid">
            <section className="equipe-profissional-section">
              <h3>Dados do profissional</h3>
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input className={`form-input ${errors.nome ? 'input-error' : ''}`} value={nome} onChange={(e) => setNome(e.target.value)} disabled={isSubmitting} />
                {errors.nome && <span className="error-message">{errors.nome}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className={`form-input ${errors.email ? 'input-error' : ''}`} value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting} />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">CPF</label>
                <MaskedInput type="cpf" value={cpf} onChange={setCpf} className={`form-input ${errors.cpf ? 'input-error' : ''}`} disabled={isSubmitting} />
                {errors.cpf && <span className="error-message">{errors.cpf}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">WhatsApp do profissional</label>
                <MaskedInput type="phone" value={whatsapp} onChange={setWhatsapp} className={`form-input ${errors.whatsapp ? 'input-error' : ''}`} disabled={isSubmitting} />
                {errors.whatsapp && <span className="error-message">{errors.whatsapp}</span>}
                <span className="form-hint">Contato direto do profissional.</span>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} disabled={isSubmitting} />
                  <span>Profissional ativo</span>
                </label>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={semExpiracao}
                    onChange={(e) => {
                      setSemExpiracao(e.target.checked)
                      if (e.target.checked) setDataExpiracao('')
                    }}
                    disabled={isSubmitting}
                  />
                  <span>Sem expiração</span>
                </label>
              </div>
              {!semExpiracao && (
                <div className="form-group">
                  <label className="form-label">Data de expiração</label>
                  <input type="date" className="form-input" value={dataExpiracao} onChange={(e) => setDataExpiracao(e.target.value)} disabled={isSubmitting} />
                </div>
              )}
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={alterarSenha} onChange={(e) => { setAlterarSenha(e.target.checked); if (!e.target.checked) setSenha('') }} disabled={isSubmitting} />
                  <span>Alterar senha</span>
                </label>
              </div>
              {alterarSenha && (
                <div className="form-group">
                  <label className="form-label">Nova senha</label>
                  <div className="password-input-wrapper">
                    <input type={showPassword ? 'text' : 'password'} className={`form-input ${errors.senha ? 'input-error' : ''}`} value={senha} onChange={(e) => setSenha(e.target.value)} disabled={isSubmitting} />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword((prev) => !prev)} disabled={isSubmitting}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                  </div>
                  {errors.senha && <span className="error-message">{errors.senha}</span>}
                </div>
              )}
            </section>

            <section className="equipe-profissional-section">
              <h3>Serviços atendidos</h3>
              <div className="equipe-profissional-list">
                {servicos.map((servico: any) => (
                  <label key={servico.id} className="equipe-profissional-check">
                    <input type="checkbox" checked={selectedServicoIds.includes(servico.id)} onChange={() => toggleServico(servico.id)} />
                    <span>{servico.nome}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <section className="equipe-profissional-section">
            <h3>Disponibilidade semanal</h3>
            <div className="equipe-profissional-availability">
              {disponibilidade.map((item) => {
                const dia = DIAS_SEMANA.find((diaItem) => diaItem.id === item.diaSemana)
                return (
                  <div key={item.diaSemana} className="equipe-profissional-day">
                    <label className="equipe-profissional-check">
                      <input type="checkbox" checked={item.ativo} onChange={(e) => updateDisponibilidade(item.diaSemana, 'ativo', e.target.checked)} />
                      <span>{dia?.label}</span>
                    </label>
                    <input type="time" className="form-input" value={item.inicio} onChange={(e) => updateDisponibilidade(item.diaSemana, 'inicio', e.target.value)} disabled={!item.ativo} />
                    <input type="time" className="form-input" value={item.fim} onChange={(e) => updateDisponibilidade(item.diaSemana, 'fim', e.target.value)} disabled={!item.ativo} />
                  </div>
                )
              })}
            </div>
          </section>

          <div className="equipe-profissional-grid">
            <section className="equipe-profissional-section">
              <h3>Bloqueios e folgas</h3>
              <div className="form-group">
                <label className="form-label">Título</label>
                <input className="form-input" value={novoBloqueio.titulo} onChange={(e) => setNovoBloqueio((prev) => ({ ...prev, titulo: e.target.value }))} placeholder="Férias, almoço, reunião..." />
              </div>
              <div className="equipe-profissional-inline">
                <input type="date" className="form-input" value={novoBloqueio.dataInicio} onChange={(e) => setNovoBloqueio((prev) => ({ ...prev, dataInicio: e.target.value }))} />
                <input type="date" className="form-input" value={novoBloqueio.dataFim} onChange={(e) => setNovoBloqueio((prev) => ({ ...prev, dataFim: e.target.value }))} />
              </div>
              <div className="equipe-profissional-inline">
                <input type="time" className="form-input" value={novoBloqueio.horarioInicio} onChange={(e) => setNovoBloqueio((prev) => ({ ...prev, horarioInicio: e.target.value }))} />
                <input type="time" className="form-input" value={novoBloqueio.horarioFim} onChange={(e) => setNovoBloqueio((prev) => ({ ...prev, horarioFim: e.target.value }))} />
              </div>
              <button type="button" className="btn-secondary equipe-profissional-inline-button" onClick={handleAddBloqueio}>
                Adicionar bloqueio
              </button>
            </section>

            <section className="equipe-profissional-section">
              <h3>Bloqueios cadastrados</h3>
              <div className="equipe-profissional-blocks">
                {bloqueios.length === 0 ? (
                  <p className="form-hint">Nenhum bloqueio cadastrado para este profissional.</p>
                ) : (
                  bloqueios.map((bloqueio: any) => (
                    <article key={bloqueio.id} className="equipe-profissional-block-item">
                      <div>
                        <strong>{bloqueio.titulo || 'Bloqueio'}</strong>
                        <p>{bloqueio.dataInicio}{bloqueio.horarioInicio ? ` • ${bloqueio.horarioInicio}` : ''}{bloqueio.dataFim ? ` até ${bloqueio.dataFim}` : ''}{bloqueio.horarioFim ? ` • ${bloqueio.horarioFim}` : ''}</p>
                      </div>
                      <button type="button" className="btn-secondary" onClick={() => handleDeleteBloqueio(bloqueio.id)}>
                        Excluir
                      </button>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>Fechar</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar profissional'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EquipeProfissionalModal
