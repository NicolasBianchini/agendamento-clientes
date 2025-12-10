import { useState, useEffect } from 'react'
import { configuracoesService } from '../services/firestore'
import type { ConfiguracoesUsuario } from '../types/configuracoes'
import { getUserSession } from '../services/auth'
import './Configuracoes.css'

function Configuracoes() {
  const [config, setConfig] = useState<ConfiguracoesUsuario | null>(null)
  const [originalConfig, setOriginalConfig] = useState<ConfiguracoesUsuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadConfiguracoes()
  }, [])

  const loadConfiguracoes = async () => {
    try {
      setLoading(true)
      const configuracoes = await configuracoesService.getComPadroes()
      setConfig(configuracoes)
      setOriginalConfig(JSON.parse(JSON.stringify(configuracoes))) // Deep copy
      setHasChanges(false)
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      setErrorMessage('Erro ao carregar configurações. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof ConfiguracoesUsuario, value: any) => {
    if (!config) return
    const newConfig = {
      ...config,
      [field]: value,
    }
    setConfig(newConfig)
    setErrorMessage(null)

    // Verificar se há alterações
    if (originalConfig) {
      const hasChanges = JSON.stringify(newConfig) !== JSON.stringify(originalConfig)
      setHasChanges(hasChanges)
    }
  }

  const handleSave = async () => {
    if (!config) return

    try {
      setSaving(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      // Validações
      if (parseInt(config.horarioInicial.split(':')[0]) >= parseInt(config.horarioFinal.split(':')[0])) {
        setErrorMessage('O horário inicial deve ser anterior ao horário final')
        return
      }

      await configuracoesService.save(config)
      setSuccessMessage('Configurações salvas com sucesso!')
      setOriginalConfig(JSON.parse(JSON.stringify(config))) // Atualizar original
      setHasChanges(false)

      // Disparar evento para atualizar configurações em todos os componentes
      window.dispatchEvent(new Event('configuracoes-updated'))

      // Limpar mensagem após 3 segundos
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      setErrorMessage('Erro ao salvar configurações. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (window.confirm('Deseja restaurar as configurações padrão?')) {
      loadConfiguracoes()
    }
  }

  if (loading) {
    return (
      <div className="configuracoes-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Carregando configurações...</p>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="configuracoes-page">
        <div className="error-container">
          <p>Erro ao carregar configurações</p>
          <button className="btn-primary" onClick={loadConfiguracoes}>
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  const usuario = getUserSession()

  return (
    <div className="configuracoes-page">
      <div className="configuracoes-header">
        <div className="header-content">
          <div>
            <h1>Configurações</h1>
            <p className="subtitle">Personalize seu sistema de acordo com suas preferências</p>
          </div>
          {!loading && (
            <button
              className={`btn-primary btn-save-fixed ${hasChanges ? 'has-changes' : ''}`}
              onClick={handleSave}
              disabled={saving}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              {saving ? 'Salvando...' : hasChanges ? 'Salvar Alterações' : 'Salvar Configurações'}
            </button>
          )}
        </div>
      </div>

      {successMessage && (
        <div className="alert alert-success">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          {errorMessage}
        </div>
      )}

      <div className="configuracoes-content">
        {/* Seção: Horários */}
        <section className="config-section">
          <h2 className="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Horários de Funcionamento
          </h2>
          <div className="config-grid">
            <div className="config-field">
              <label htmlFor="horarioInicial">Horário Inicial</label>
              <input
                type="time"
                id="horarioInicial"
                value={config.horarioInicial}
                onChange={(e) => handleChange('horarioInicial', e.target.value)}
              />
              <span className="field-help">Primeiro horário disponível para agendamento</span>
            </div>

            <div className="config-field">
              <label htmlFor="horarioFinal">Horário Final</label>
              <input
                type="time"
                id="horarioFinal"
                value={config.horarioFinal}
                onChange={(e) => handleChange('horarioFinal', e.target.value)}
              />
              <span className="field-help">Último horário disponível para agendamento</span>
            </div>

            <div className="config-field">
              <label htmlFor="intervaloMinutos">Intervalo entre Horários</label>
              <select
                id="intervaloMinutos"
                value={config.intervaloMinutos}
                onChange={(e) => handleChange('intervaloMinutos', parseInt(e.target.value))}
              >
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={60}>1 hora</option>
                <option value={90}>1 hora e 30 minutos</option>
                <option value={120}>2 horas</option>
              </select>
              <span className="field-help">Intervalo entre os horários disponíveis</span>
            </div>
          </div>
        </section>

        {/* Seção: Visualização */}
        <section className="config-section">
          <h2 className="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            Visualização
          </h2>
          <div className="config-grid">
            <div className="config-field">
              <label htmlFor="tema">Tema</label>
              <select
                id="tema"
                value={config.tema}
                onChange={(e) => handleChange('tema', e.target.value)}
              >
                <option value="claro">Claro</option>
                <option value="escuro">Escuro</option>
                <option value="auto">Automático (sistema)</option>
              </select>
              <span className="field-help">Aparência visual do sistema</span>
            </div>

            <div className="config-field">
              <label htmlFor="template">Template Visual</label>
              <select
                id="template"
                value={config.template || 'padrao'}
                onChange={(e) => handleChange('template', e.target.value)}
              >
                <option value="padrao">Padrão (Roxo)</option>
                <option value="barbearia">Barbearia (Preto/Marrom)</option>
                <option value="manicure">Manicure (Rosa/Roxo)</option>
                <option value="salon">Salon (Dourado)</option>
                <option value="spa">Spa (Azul/Verde)</option>
              </select>
              <span className="field-help">Estilo visual personalizado para seu tipo de negócio</span>
            </div>

            <div className="config-field">
              <label htmlFor="visualizacaoAgendaPadrao">Visualização Padrão da Agenda</label>
              <select
                id="visualizacaoAgendaPadrao"
                value={config.visualizacaoAgendaPadrao}
                onChange={(e) => handleChange('visualizacaoAgendaPadrao', e.target.value)}
              >
                <option value="dia">Dia</option>
                <option value="semana">Semana</option>
                <option value="mes">Mês</option>
              </select>
              <span className="field-help">Visualização que será exibida ao acessar a agenda</span>
            </div>
          </div>
        </section>

        {/* Seção: Notificações */}
        <section className="config-section">
          <h2 className="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            Notificações
          </h2>
          <div className="config-grid">
            <div className="config-field checkbox-field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.notificacoesEmail}
                  onChange={(e) => handleChange('notificacoesEmail', e.target.checked)}
                />
                <span>Notificações por E-mail</span>
              </label>
              <span className="field-help">Receber notificações por e-mail sobre agendamentos</span>
            </div>

            <div className="config-field checkbox-field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.notificacoesPush}
                  onChange={(e) => handleChange('notificacoesPush', e.target.checked)}
                />
                <span>Notificações Push</span>
              </label>
              <span className="field-help">Receber notificações no navegador</span>
            </div>

            <div className="config-field checkbox-field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.lembrarAgendamentos}
                  onChange={(e) => handleChange('lembrarAgendamentos', e.target.checked)}
                />
                <span>Lembrar Agendamentos</span>
              </label>
              <span className="field-help">Receber lembretes antes dos agendamentos</span>
            </div>
          </div>
        </section>

        {/* Seção: Mensagens Automáticas */}
        <section className="config-section">
          <h2 className="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Mensagens Automáticas
          </h2>
          <div className="config-grid">
            <div className="config-field checkbox-field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.mensagensAutomaticas || false}
                  onChange={(e) => handleChange('mensagensAutomaticas', e.target.checked)}
                />
                <span>Enviar Mensagens Automaticamente</span>
              </label>
              <span className="field-help">Enviar mensagens de confirmação automaticamente ao criar agendamentos</span>
            </div>

            {config.mensagensAutomaticas && (
              <>
                <div className="config-field">
                  <label htmlFor="apiMensagensUrl">URL da API</label>
                  <input
                    type="text"
                    id="apiMensagensUrl"
                    value={config.apiMensagensUrl || ''}
                    onChange={(e) => handleChange('apiMensagensUrl', e.target.value)}
                    placeholder="https://api.wawp.net/v1"
                  />
                  <span className="field-help">
                    URL da API. Exemplos:
                    <br />• Wawp: https://api.wawp.net/v1 (ou deixe vazio, será detectado automaticamente)
                    <br />• Evolution API: https://seu-servidor:8080
                    <br />• ChatAPI: https://api.chat-api.com/instance12345
                  </span>
                </div>

                <div className="config-field">
                  <label htmlFor="apiMensagensToken">Token de Autenticação</label>
                  <input
                    type="password"
                    id="apiMensagensToken"
                    value={config.apiMensagensToken || ''}
                    onChange={(e) => handleChange('apiMensagensToken', e.target.value)}
                    placeholder="Seu token de autenticação"
                  />
                  <span className="field-help">Token de autenticação da API (Bearer token)</span>
                </div>

                <div className="config-field">
                  <label htmlFor="apiMensagensInstancia">ID da Instância (opcional)</label>
                  <input
                    type="text"
                    id="apiMensagensInstancia"
                    value={config.apiMensagensInstancia || ''}
                    onChange={(e) => handleChange('apiMensagensInstancia', e.target.value)}
                    placeholder="Nome da instância (apenas para Evolution API)"
                  />
                  <span className="field-help">
                    ID ou nome da instância.
                    <br />• Wawp: Cole seu Instance ID aqui (encontre no dashboard do Wawp)
                    <br />• Evolution API: Nome da instância criada
                    <br />• Outros serviços: Geralmente deixe vazio
                  </span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Seção: Localização e Formato */}
        <section className="config-section">
          <h2 className="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="10" r="3"></circle>
              <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"></path>
            </svg>
            Localização e Formato
          </h2>
          <div className="config-grid">
            <div className="config-field">
              <label htmlFor="moeda">Moeda</label>
              <select
                id="moeda"
                value={config.moeda}
                onChange={(e) => handleChange('moeda', e.target.value)}
              >
                <option value="BRL">BRL - Real Brasileiro (R$)</option>
                <option value="USD">USD - Dólar Americano ($)</option>
                <option value="EUR">EUR - Euro (€)</option>
                <option value="GBP">GBP - Libra Esterlina (£)</option>
              </select>
              <span className="field-help">Moeda para exibição de valores</span>
            </div>

            <div className="config-field">
              <label htmlFor="formatoData">Formato de Data</label>
              <select
                id="formatoData"
                value={config.formatoData}
                onChange={(e) => handleChange('formatoData', e.target.value)}
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                <option value="DD-MM-YYYY">DD-MM-YYYY (31-12-2024)</option>
              </select>
              <span className="field-help">Formato de exibição de datas</span>
            </div>

            <div className="config-field">
              <label htmlFor="formatoHora">Formato de Hora</label>
              <select
                id="formatoHora"
                value={config.formatoHora}
                onChange={(e) => handleChange('formatoHora', e.target.value)}
              >
                <option value="24h">24 horas (14:30)</option>
                <option value="12h">12 horas (2:30 PM)</option>
              </select>
              <span className="field-help">Formato de exibição de horários</span>
            </div>
          </div>
        </section>

        {/* Informações do Usuário */}
        <section className="config-section">
          <h2 className="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Informações da Conta
          </h2>
          <div className="config-grid">
            <div className="config-field">
              <label>Nome</label>
              <input type="text" value={usuario?.nome || ''} disabled />
              <span className="field-help">Nome do usuário logado</span>
            </div>

            <div className="config-field">
              <label>E-mail</label>
              <input type="email" value={usuario?.email || ''} disabled />
              <span className="field-help">E-mail da conta</span>
            </div>
          </div>
        </section>
      </div>

      {/* Botões de Ação */}
      <div className="configuracoes-actions">
        <button
          className="btn-secondary"
          onClick={handleReset}
          disabled={saving}
        >
          Restaurar Padrões
        </button>
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  )
}

export default Configuracoes
