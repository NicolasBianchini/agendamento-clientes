import { useEffect, useState } from 'react'
import { estabelecimentosService } from '../services/firestore'
import { isAdminMaster, type Usuario, getUserSession } from '../services/auth'
import type { Estabelecimento } from '../types/estabelecimento'
import './Estabelecimentos.css'

const emptyForm: Estabelecimento = {
  nome: '',
  slug: '',
  endereco: '',
  telefone: '',
  email: '',
  descricao: '',
  ativo: true,
  horarioAbertura: '08:00',
  horarioFechamento: '18:00',
  intervaloMinutos: 30,
}

function Estabelecimentos() {
  const [items, setItems] = useState<Estabelecimento[]>([])
  const [form, setForm] = useState<Estabelecimento>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const usuario = getUserSession() as Usuario | null

  useEffect(() => {
    if (!isAdminMaster(usuario)) {
      setLoading(false)
      return
    }

    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await estabelecimentosService.getAll()
      setItems(data as Estabelecimento[])
    } catch (error) {
      console.error('Erro ao carregar estabelecimentos:', error)
      setMessage('Erro ao carregar estabelecimentos.')
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: keyof Estabelecimento, value: string | boolean | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setIsModalOpen(false)
  }

  const handleCreate = () => {
    setForm(emptyForm)
    setEditingId(null)
    setIsModalOpen(true)
  }

  const handleEdit = (item: Estabelecimento) => {
    setEditingId(item.id || null)
    setForm({
      ...emptyForm,
      ...item,
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const payload = {
        ...form,
        slug: form.slug.trim().toLowerCase(),
      }

      if (editingId) {
        await estabelecimentosService.update(editingId, payload)
        setMessage('Estabelecimento atualizado com sucesso.')
      } else {
        await estabelecimentosService.create(payload)
        setMessage('Estabelecimento criado com sucesso.')
      }

      resetForm()
      await loadData()
    } catch (error) {
      console.error('Erro ao salvar estabelecimento:', error)
      setMessage('Erro ao salvar estabelecimento.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id?: string) => {
    if (!id) return
    if (!window.confirm('Deseja excluir este estabelecimento?')) return

    try {
      await estabelecimentosService.delete(id)
      setMessage('Estabelecimento removido com sucesso.')
      await loadData()
      if (editingId === id) {
        resetForm()
      }
    } catch (error) {
      console.error('Erro ao excluir estabelecimento:', error)
      setMessage('Erro ao excluir estabelecimento.')
    }
  }

  if (!isAdminMaster(usuario)) {
    return (
      <div className="estabelecimentos-page">
        <div className="estabelecimento-card">
          <h2>Acesso restrito</h2>
          <p>Somente administradores master podem gerenciar estabelecimentos.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="estabelecimentos-page">
      <div className="estabelecimentos-header">
        <div>
          <h1>Estabelecimentos</h1>
          <p>Base estrutural para multiunidade, portal do cliente e distribuição por profissional.</p>
        </div>
        <div className="estabelecimentos-header-badges">
          <div className="estabelecimentos-badge">
            <strong>{items.length}</strong>
            <span>unidades</span>
          </div>
          <div className="estabelecimentos-badge">
            <strong>{items.filter((item) => item.ativo !== false).length}</strong>
            <span>ativas</span>
          </div>
        </div>
      </div>

      {message && <div className="estabelecimento-alert">{message}</div>}

      <div className="estabelecimentos-grid">
        <div className="estabelecimento-card estabelecimento-list-card">
          <div className="estabelecimento-list-header">
            <div>
              <p className="estabelecimento-kicker">Lista</p>
              <h2>Unidades cadastradas</h2>
            </div>
            <div className="estabelecimento-list-header-actions">
              <p>Visualize rapidamente status, horários e informações principais de cada estabelecimento.</p>
              <button type="button" className="btn-primary" onClick={handleCreate}>
                Novo estabelecimento
              </button>
            </div>
          </div>
          {loading ? (
            <p>Carregando...</p>
          ) : items.length === 0 ? (
            <div className="estabelecimento-empty-state">
              <strong>Nenhum estabelecimento cadastrado.</strong>
              <p>Use o formulário ao lado para criar a primeira unidade do sistema.</p>
            </div>
          ) : (
            <div className="estabelecimento-list">
              {items.map((item) => (
                <article key={item.id} className="estabelecimento-item">
                  <div className="estabelecimento-item-main">
                    <div className="estabelecimento-item-top">
                      <div>
                        <h3>{item.nome}</h3>
                        <p>{item.endereco}</p>
                      </div>
                      <span className={`estabelecimento-status ${item.ativo !== false ? 'ativo' : 'inativo'}`}>
                        {item.ativo !== false ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    <div className="estabelecimento-item-grid">
                      <div>
                        <span className="estabelecimento-meta-label">Slug</span>
                        <strong>{item.slug || '-'}</strong>
                      </div>
                      <div>
                        <span className="estabelecimento-meta-label">Telefone</span>
                        <strong>{item.telefone || '-'}</strong>
                      </div>
                      <div>
                        <span className="estabelecimento-meta-label">E-mail</span>
                        <strong>{item.email || '-'}</strong>
                      </div>
                      <div>
                        <span className="estabelecimento-meta-label">Horário</span>
                        <strong>{item.horarioAbertura} às {item.horarioFechamento}</strong>
                      </div>
                      <div>
                        <span className="estabelecimento-meta-label">Intervalo</span>
                        <strong>{item.intervaloMinutos} min</strong>
                      </div>
                      <div>
                        <span className="estabelecimento-meta-label">ID</span>
                        <strong>{item.id || '-'}</strong>
                      </div>
                    </div>

                    {item.descricao && (
                      <div className="estabelecimento-item-description">
                        <span className="estabelecimento-meta-label">Descrição</span>
                        <p>{item.descricao}</p>
                      </div>
                    )}
                  </div>
                  <div className="estabelecimento-item-actions">
                    <button type="button" className="btn-secondary" onClick={() => handleEdit(item)}>
                      Editar
                    </button>
                    <button type="button" className="btn-danger" onClick={() => handleDelete(item.id)}>
                      Excluir
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="estabelecimento-modal-overlay" role="presentation" onClick={resetForm}>
          <div
            className="estabelecimento-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="estabelecimento-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <form className="estabelecimento-card estabelecimento-form" onSubmit={handleSubmit}>
              <div className="estabelecimento-form-header estabelecimento-modal-header">
                <div>
                  <p className="estabelecimento-kicker">Cadastro</p>
                  <h2 id="estabelecimento-modal-title">
                    {editingId ? 'Editar estabelecimento' : 'Novo estabelecimento'}
                  </h2>
                </div>
                <div className="estabelecimento-modal-header-actions">
                  <p>
                    {editingId
                      ? 'Atualize os dados da unidade selecionada.'
                      : 'Crie uma nova unidade com horário, contato e identidade própria.'}
                  </p>
                  <button type="button" className="estabelecimento-modal-close" onClick={resetForm} aria-label="Fechar modal">
                    ×
                  </button>
                </div>
              </div>

              <label>
                <span>Nome</span>
                <input value={form.nome} onChange={(e) => updateField('nome', e.target.value)} required />
              </label>

              <label>
                <span>Slug</span>
                <input value={form.slug} onChange={(e) => updateField('slug', e.target.value)} required />
              </label>

              <label>
                <span>Endereço</span>
                <input value={form.endereco} onChange={(e) => updateField('endereco', e.target.value)} required />
              </label>

              <label>
                <span>Telefone</span>
                <input value={form.telefone} onChange={(e) => updateField('telefone', e.target.value)} required />
              </label>

              <label>
                <span>E-mail</span>
                <input value={form.email || ''} onChange={(e) => updateField('email', e.target.value)} />
              </label>

              <label>
                <span>Descrição</span>
                <textarea value={form.descricao || ''} onChange={(e) => updateField('descricao', e.target.value)} rows={3} />
              </label>

              <div className="estabelecimento-inline-fields">
                <label>
                  <span>Abertura</span>
                  <input type="time" value={form.horarioAbertura} onChange={(e) => updateField('horarioAbertura', e.target.value)} required />
                </label>
                <label>
                  <span>Fechamento</span>
                  <input type="time" value={form.horarioFechamento} onChange={(e) => updateField('horarioFechamento', e.target.value)} required />
                </label>
                <label>
                  <span>Intervalo</span>
                  <select value={form.intervaloMinutos} onChange={(e) => updateField('intervaloMinutos', Number(e.target.value))}>
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={60}>60 min</option>
                  </select>
                </label>
              </div>

              <label className="estabelecimento-checkbox">
                <input type="checkbox" checked={form.ativo} onChange={(e) => updateField('ativo', e.target.checked)} />
                <span>Estabelecimento ativo</span>
              </label>

              <div className="estabelecimento-actions">
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  Fechar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Estabelecimentos
