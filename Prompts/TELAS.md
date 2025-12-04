# 🖥️ TELAS DO SISTEMA – Sistema Web de Agenda para Nail Designer

Documento detalhado com todas as telas e componentes de interface necessários para o sistema.

---

## **📱 ESTRUTURA GERAL**

### **Layout Base**
- **Layout Público:** Para telas não autenticadas (Login)
- **Layout Autenticado:** Para todas as telas após login (com header, menu lateral, footer)

---

## **1. TELA DE LOGIN**

### **Rota:** `/login` ou `/`

### **Descrição:**
Tela inicial do sistema para autenticação da manicure.

### **Elementos:**
- Logo/título do sistema
- Formulário de login:
  - Campo: **E-mail** (input type="email")
  - Campo: **Senha** (input type="password" com toggle de visibilidade)
  - Botão: **Entrar**
- Mensagens de erro (validação e autenticação)
- Loading state durante autenticação
- Link "Esqueci minha senha" (opcional para futuro)

### **Comportamento:**
- Validação de campos em tempo real
- Redirecionamento após login bem-sucedido
- Proteção: usuários autenticados são redirecionados automaticamente

### **Responsividade:**
- Mobile-first
- Centralizado na tela
- Formulário adaptável

---

## **2. LAYOUT AUTENTICADO**

### **Componente:** Layout wrapper para todas as páginas autenticadas

### **Elementos:**
- **Header:**
  - Logo/título
  - Nome do usuário logado
  - Botão de logout
  - Menu hambúrguer (mobile)

- **Menu Lateral (Desktop) / Menu Mobile:**
  - Dashboard/Home
  - Clientes
  - Serviços
  - Agenda
  - Histórico
  - (Ícones + textos)

- **Área de Conteúdo:**
  - Breadcrumbs (opcional)
  - Conteúdo da página atual

- **Footer (opcional):**
  - Informações do sistema
  - Versão

### **Comportamento:**
- Menu lateral colapsável (desktop)
- Menu mobile em drawer/overlay
- Navegação ativa destacada
- Logout limpa sessão e redireciona para login

---

## **3. DASHBOARD / HOME**

### **Rota:** `/dashboard` ou `/home`

### **Descrição:**
Tela inicial após login, com visão geral e estatísticas rápidas.

### **Elementos:**
- Cards de estatísticas:
  - Total de clientes
  - Agendamentos do dia
  - Agendamentos da semana
  - Total faturado do mês (opcional)
- Próximos agendamentos (lista dos próximos 5-10)
- Ações rápidas:
  - Botão: "Novo Cliente"
  - Botão: "Novo Agendamento"
  - Botão: "Ver Agenda"

### **Comportamento:**
- Carregamento de dados do Firestore
- Links para outras seções
- Atualização em tempo real (opcional)

---

## **4. LISTAGEM DE CLIENTES**

### **Rota:** `/clientes`

### **Descrição:**
Lista todos os clientes cadastrados com busca e filtros.

### **Elementos:**
- **Barra de Ações:**
  - Campo de busca/filtro
  - Botão: **+ Novo Cliente**

- **Lista de Clientes:**
  - Cards ou tabela com:
    - Nome do cliente
    - Telefone
    - Quantidade de agendamentos (opcional)
    - Botões de ação: Ver detalhes, Editar, Excluir

- **Paginação** (se necessário)

### **Comportamento:**
- Busca em tempo real
- Ordenação (alfabética, data de cadastro)
- Ações: visualizar, editar, excluir
- Confirmação antes de excluir
- Aviso se cliente tem agendamentos ativos

### **Estados:**
- Loading
- Lista vazia
- Erro ao carregar

---

## **5. CADASTRO DE CLIENTE**

### **Tipo:** Modal ou Página

### **Rota (se página):** `/clientes/novo`

### **Descrição:**
Formulário para cadastrar novo cliente.

### **Elementos:**
- Título: "Novo Cliente"
- Formulário:
  - Campo: **Nome** (obrigatório, texto)
  - Campo: **Telefone** (obrigatório, máscara)
  - Campo: **Observações** (opcional, textarea)
- Botões:
  - **Cancelar** (fecha modal/volta)
  - **Salvar** (desabilitado até validação)

### **Comportamento:**
- Validação em tempo real
- Máscara de telefone
- Feedback de sucesso/erro
- Fechar modal ou redirecionar após salvar

---

## **6. EDIÇÃO DE CLIENTE**

### **Tipo:** Modal ou Página

### **Rota (se página):** `/clientes/:id/editar`

### **Descrição:**
Formulário para editar dados de um cliente existente.

### **Elementos:**
- Título: "Editar Cliente"
- Formulário pré-preenchido:
  - Campo: **Nome** (obrigatório)
  - Campo: **Telefone** (obrigatório, máscara)
  - Campo: **Observações** (opcional)
- Botões:
  - **Cancelar**
  - **Salvar Alterações**

### **Comportamento:**
- Carregar dados do Firestore
- Validação
- Atualizar no Firestore
- Feedback de sucesso/erro

---

## **7. DETALHES DO CLIENTE**

### **Rota:** `/clientes/:id`

### **Descrição:**
Página com informações completas do cliente e histórico.

### **Elementos:**
- **Informações do Cliente:**
  - Nome
  - Telefone
  - Observações
  - Data de cadastro

- **Ações:**
  - Botão: **Editar**
  - Botão: **Excluir**
  - Botão: **Novo Agendamento** (com cliente pré-selecionado)

- **Histórico de Atendimentos:**
  - Lista de agendamentos concluídos
  - Link para histórico completo

### **Comportamento:**
- Carregar dados do cliente
- Carregar histórico relacionado
- Navegação para outras ações

---

## **8. LISTAGEM DE SERVIÇOS**

### **Rota:** `/servicos`

### **Descrição:**
Lista todos os serviços cadastrados com valores e status.

### **Elementos:**
- **Barra de Ações:**
  - Botão: **+ Novo Serviço**
  - Filtro: Todos / Ativos / Inativos

- **Lista de Serviços:**
  - Cards ou tabela com:
    - Nome do serviço
    - Valor (formatado: R$ X,XX)
    - Status (Ativo/Inativo) com indicador visual
    - Toggle para ativar/desativar
    - Botões: Editar, Excluir

### **Comportamento:**
- Filtrar por status
- Toggle de ativação/desativação
- Ordenação (nome, valor, status)
- Validação antes de excluir serviço em uso

### **Estados:**
- Loading
- Lista vazia
- Erro

---

## **9. CADASTRO DE SERVIÇO**

### **Tipo:** Modal ou Página

### **Rota (se página):** `/servicos/novo`

### **Descrição:**
Formulário para cadastrar novo serviço.

### **Elementos:**
- Título: "Novo Serviço"
- Formulário:
  - Campo: **Nome** (obrigatório, texto)
  - Campo: **Valor** (obrigatório, máscara monetária R$)
- Botões:
  - **Cancelar**
  - **Salvar** (serviço criado como ativo por padrão)

### **Comportamento:**
- Validação de valor positivo
- Formatação monetária
- Feedback de sucesso/erro

---

## **10. EDIÇÃO DE SERVIÇO**

### **Tipo:** Modal ou Página

### **Rota (se página):** `/servicos/:id/editar`

### **Descrição:**
Formulário para editar serviço existente.

### **Elementos:**
- Título: "Editar Serviço"
- Formulário pré-preenchido:
  - Campo: **Nome** (obrigatório)
  - Campo: **Valor** (obrigatório, máscara monetária)
- Botões:
  - **Cancelar**
  - **Salvar Alterações**

### **Comportamento:**
- Carregar dados
- Validação
- Atualizar no Firestore
- Aviso se serviço está em uso

---

## **11. AGENDA - VISUALIZAÇÃO POR DIA**

### **Rota:** `/agenda/dia` ou `/agenda?view=day`

### **Descrição:**
Visualização da agenda focada em um único dia.

### **Elementos:**
- **Cabeçalho:**
  - Data atual (formato: DD/MM/YYYY)
  - Botões: **← Dia Anterior** | **Hoje** | **Próximo Dia →**
  - Botão: **+ Novo Agendamento**

- **Grade de Horários:**
  - Lista de horários (ex: 08:00, 08:30, 09:00... até 20:00)
  - Para cada horário:
    - Se houver agendamento: card com informações
    - Se vazio: área clicável para criar agendamento

- **Card de Agendamento (quando houver):**
  - Nome do cliente
  - Serviço
  - Horário
  - Status (badge colorido)
  - Clique abre detalhes

### **Comportamento:**
- Navegação entre dias
- Clique em horário vazio abre modal de criação
- Clique em agendamento abre detalhes
- Destaque visual para horários passados/atuais

---

## **12. AGENDA - VISUALIZAÇÃO POR SEMANA**

### **Rota:** `/agenda/semana` ou `/agenda?view=week`

### **Descrição:**
Visualização da agenda em formato semanal (7 dias).

### **Elementos:**
- **Cabeçalho:**

  - Período da semana (ex: "01/01 - 07/01/2024")
  - Botões: **← Semana Anterior** | **Esta Semana** | **Próxima Semana →**
  - Botão: **+ Novo Agendamento**

- **Grade Semanal:**
  - 7 colunas (dias da semana)
  - Cada coluna com:
    - Nome do dia e data
    - Lista de agendamentos do dia
  - Horários podem ser agrupados ou em timeline

- **Cards de Agendamento:**
  - Mesmo formato da visualização diária
  - Posicionados no dia/horário correto

### **Comportamento:**
- Navegação entre semanas
- Scroll vertical para ver todos os horários
- Interações similares à visualização diária

---

## **13. AGENDA - VISUALIZAÇÃO POR MÊS**

### **Rota:** `/agenda/mes` ou `/agenda?view=month`

### **Descrição:**
Visualização em formato de calendário mensal.

### **Elementos:**
- **Cabeçalho:**
  - Mês e ano atual (ex: "Janeiro 2024")
  - Botões: **← Mês Anterior** | **Este Mês** | **Próximo Mês →**
  - Botão: **+ Novo Agendamento**

- **Calendário:**
  - Grid 7x6 (ou 7x5) com dias do mês
  - Cada célula:
    - Número do dia
    - Indicador de quantidade de agendamentos (badge)
    - Destaque para dia atual
  - Dias de outros meses em cinza

- **Legenda:**
  - Cores para diferentes status

### **Comportamento:**
- Clique em dia abre visualização diária ou lista de agendamentos
- Navegação entre meses
- Indicadores visuais para dias com agendamentos

---

## **14. TOGGLE DE VISUALIZAÇÃO DA AGENDA**

### **Componente:** Barra de controle na página de agenda

### **Elementos:**
- Botões de visualização:
  - **Dia** (ícone + texto)
  - **Semana** (ícone + texto)
  - **Mês** (ícone + texto)
- Botão ativo destacado
- Preferência salva no localStorage

### **Comportamento:**
- Alterna entre visualizações
- Mantém data/período quando possível
- Atualização instantânea

---

## **15. MODAL/FORMULÁRIO DE AGENDAMENTO**

### **Tipo:** Modal (pode ser aberto de qualquer visualização)

### **Descrição:**
Formulário para criar ou editar agendamento.

### **Elementos:**
- Título: "Novo Agendamento" ou "Editar Agendamento"
- Formulário:
  - Campo: **Cliente** (select/autocomplete, obrigatório)
  - Campo: **Serviço** (select, obrigatório, apenas ativos)
  - Campo: **Data** (date picker, obrigatório)
  - Campo: **Horário** (time picker, obrigatório)
  - Campo: **Observações** (textarea, opcional)
  - Campo: **Status** (select, se edição: Agendado/Concluído/Cancelado)
- Botões:
  - **Cancelar**
  - **Salvar** ou **Salvar Alterações**

### **Comportamento:**
- Validação de campos
- Validação de data/horário (não permitir passado)
- Verificação de conflito de horário
- Mensagem de erro se houver conflito
- Cliente pode ser pré-selecionado (quando vem de detalhes do cliente)
- Data/horário podem ser pré-preenchidos (quando vem da agenda)

---

## **16. DETALHES DO AGENDAMENTO**

### **Tipo:** Modal ou Página

### **Rota (se página):** `/agenda/:id`

### **Descrição:**
Visualização completa de um agendamento com opções de ação.

### **Elementos:**
- **Informações:**
  - Cliente (com link para detalhes)
  - Serviço
  - Data e horário
  - Status (badge)
  - Observações

- **Ações:**
  - Botão: **Editar**
  - Botão: **Alterar Status** (dropdown ou botões)
  - Botão: **Excluir**
  - Botão: **Ver Cliente** (link)

### **Comportamento:**
- Carregar dados do agendamento
- Alterar status diretamente
- Navegação para outras ações
- Confirmação para exclusão

---

## **17. HISTÓRICO DE ATENDIMENTOS**

### **Rota:** `/historico`

### **Descrição:**
Lista de atendimentos concluídos com filtros avançados.

### **Elementos:**
- **Barra de Filtros:**
  - Select: **Cliente** (opcional, busca)
  - Select: **Serviço** (opcional)
  - Campo: **Data Inicial** (date picker)
  - Campo: **Data Final** (date picker)
  - Botões rápidos: **Hoje**, **Esta Semana**, **Este Mês**
  - Botão: **Limpar Filtros**

- **Estatísticas (opcional):**
  - Total faturado no período
  - Quantidade de atendimentos
  - Média por atendimento

- **Lista de Atendimentos:**
  - Cards ou tabela com:
    - Data e horário
    - Nome do cliente
    - Serviço
    - Valor
    - Observações (truncadas)
  - Ordenação: mais recente primeiro

- **Paginação** (se necessário)

### **Comportamento:**
- Aplicar filtros em tempo real
- Combinar múltiplos filtros
- Calcular estatísticas dinamicamente
- Exportar para CSV (opcional)

### **Estados:**
- Loading
- Lista vazia (com mensagem)
- Erro

---

## **18. COMPONENTES COMPARTILHADOS** ✅

### **18.1 Modal de Confirmação** ✅
- ✅ Título e mensagem
- ✅ Botões: Cancelar, Confirmar
- ✅ Usado para exclusões e ações críticas

### **18.2 Loading/Spinner** ✅
- ✅ Indicador de carregamento
- ✅ Overlay ou inline
- ✅ Mensagem opcional

### **18.3 Toast/Notificação** ✅
- ✅ Mensagens de sucesso/erro
- ✅ Auto-dismiss
- ✅ Posicionamento (top-right, bottom, etc.)

### **18.4 Empty State** ✅
- ✅ Mensagem quando lista está vazia
- ✅ Ícone ilustrativo
- ✅ Call-to-action (ex: "Criar primeiro cliente")

### **18.5 Badge de Status** ✅
- ✅ Cores diferentes para:
  - ✅ Agendado (azul)
  - ✅ Concluído (verde)
  - ✅ Cancelado (vermelho)
  - ✅ Ativo/Inativo (verde/cinza)

### **18.6 Input com Máscara** ✅
- ✅ Telefone
- ✅ Valor monetário
- ✅ Data/horário

### **18.7 Select/Autocomplete** ✅
- ✅ Busca de clientes
- ✅ Seleção de serviços
- ✅ Com busca integrada

---

## **📊 RESUMO DE TELAS**

| # | Tela | Tipo | Rota | Prioridade | Status |
|---|------|------|------|------------|--------|
| 1 | Login | Página | `/login` | 🔴 Alta | ✅ Concluído |
| 2 | Layout Autenticado | Componente | - | 🔴 Alta | ✅ Concluído |
| 3 | Dashboard | Página | `/dashboard` | 🟡 Média | ✅ Concluído |
| 4 | Listagem de Clientes | Página | `/clientes` | 🔴 Alta | ✅ Concluído |
| 5 | Cadastro de Cliente | Modal/Página | `/clientes/novo` | 🔴 Alta | ✅ Concluído (Modal) |
| 6 | Edição de Cliente | Modal/Página | `/clientes/:id/editar` | 🔴 Alta | ✅ Concluído (Modal) |
| 7 | Detalhes do Cliente | Página | `/clientes/:id` | 🟡 Média | ⬜ Pendente |
| 8 | Listagem de Serviços | Página | `/servicos` | 🔴 Alta | ✅ Concluído |
| 9 | Cadastro de Serviço | Modal/Página | `/servicos/novo` | 🔴 Alta | ✅ Concluído (Modal) |
| 10 | Edição de Serviço | Modal/Página | `/servicos/:id/editar` | 🔴 Alta | ✅ Concluído (Modal) |
| 11 | Agenda - Dia | Página | `/agenda/dia` | 🔴 Alta | ✅ Concluído |
| 12 | Agenda - Semana | Página | `/agenda/semana` | 🔴 Alta | ✅ Concluído |
| 13 | Agenda - Mês | Página | `/agenda/mes` | 🔴 Alta | ✅ Concluído |
| 14 | Toggle Visualização | Componente | - | 🔴 Alta | ✅ Concluído |
| 15 | Formulário Agendamento | Modal | - | 🔴 Alta | ✅ Concluído |
| 16 | Detalhes Agendamento | Modal/Página | `/agenda/:id` | 🟡 Média | ✅ Concluído (Modal) |
| 17 | Histórico | Página | `/historico` | 🟡 Média | ✅ Concluído |

---

## **🎨 CONSIDERAÇÕES DE DESIGN**

### **Cores Sugeridas:**
- Primária: Rosa/Magenta (tema nail designer)
- Secundária: Branco/Cinza claro
- Sucesso: Verde
- Erro: Vermelho
- Aviso: Laranja
- Info: Azul

### **Tipografia:**
- Títulos: Sans-serif moderna
- Corpo: Legível e clara
- Tamanhos responsivos

### **Ícones:**
- Biblioteca de ícones (ex: Font Awesome, Heroicons)
- Consistência visual
- Tamanhos padronizados

### **Espaçamento:**
- Grid system
- Padding/margin consistentes
- Mobile-first spacing

---

## **📱 RESPONSIVIDADE**

Todas as telas devem ser:
- ✅ Mobile-first
- ✅ Tablet-friendly
- ✅ Desktop-optimized
- ✅ Touch-friendly (botões grandes, áreas clicáveis)

---

**💡 Nota:** Este documento serve como guia para desenvolvimento. Ajustes podem ser feitos durante a implementação conforme necessário.

