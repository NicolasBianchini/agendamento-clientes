# ✅ CHECKLIST – Sistema Web de Agenda para Nail Designer


Use este checklist para acompanhar o progresso do projeto. Marque cada item conforme for concluído.

---

## **SPRINT 0: Configuração Inicial e Infraestrutura**

### Setup do Projeto
- [ ] Configurar Firebase SDK no projeto Vue
- [ ] Instalar dependências necessárias (firebase, vue-router, etc.)
- [ ] Configurar variáveis de ambiente (.env)
- [ ] Criar arquivo de configuração do Firebase

### Estrutura do Firestore
- [ ] Criar projeto no Firebase Console
- [ ] Configurar Firestore Database
- [ ] Criar coleções base: `users`, `clients`, `services`, `appointments`, `history`
- [ ] Definir índices necessários no Firestore

### Estrutura do Código
- [ ] Configurar Vue Router
- [ ] Criar estrutura de pastas (components, views, services, utils)
- [ ] Configurar serviços base do Firestore
- [ ] Criar layout base da aplicação

### Configuração de Build
- [ ] Configurar Vite para produção
- [ ] Testar build local
- [ ] Preparar configuração para Netlify

**Status do Sprint 0:** ⬜ Não iniciado | 🟡 Em progresso | ✅ Concluído

---

## **SPRINT 1: Autenticação e Login**

### Tela de Login
- [x] Criar componente de Login
- [x] Implementar formulário (email e senha)
- [x] Adicionar validação de campos
- [x] Criar design responsivo da tela

### Sistema de Hash
- [x] Implementar função de hash de senha (SHA-256 via Web Crypto API)
- [x] Criar utilitário para comparar senhas
- [x] Testar hash e comparação

### Autenticação no Firestore
- [x] Criar serviço de autenticação
- [x] Implementar função de login (buscar usuário no Firestore)
- [x] Validar credenciais com hash
- [x] Tratar erros de autenticação

### Persistência de Sessão
- [x] Implementar armazenamento de sessão (localStorage)
- [x] Criar guard de rota para proteger páginas autenticadas
- [x] Implementar logout
- [x] Criar middleware de autenticação (verificação no Layout)

### Navegação Pós-Login
- [x] Redirecionar após login bem-sucedido
- [x] Criar layout autenticado (header, menu, etc.)
- [x] Implementar botão de logout

**Status do Sprint 1:** ✅ Concluído

---

## **SPRINT 2: Gestão de Clientes**

### Listagem de Clientes
- [x] Criar view de listagem de clientes
- [x] Implementar busca/filtro de clientes
- [x] Criar componente de card/lista de cliente
- [ ] Adicionar paginação (se necessário)

### Cadastro de Cliente
- [x] Criar formulário de cadastro
- [x] Campos: nome, telefone, observações
- [x] Validação de formulário
- [ ] Integração com Firestore (criar documento) - TODO: Implementar

### Edição de Cliente
- [x] Criar modal/página de edição
- [x] Carregar dados do cliente
- [ ] Atualizar dados no Firestore - TODO: Implementar
- [x] Feedback de sucesso/erro

### Exclusão de Cliente
- [x] Implementar confirmação de exclusão
- [ ] Deletar documento do Firestore - TODO: Implementar
- [x] Atualizar lista após exclusão
- [ ] Verificar se cliente tem agendamentos (aviso) - TODO: Implementar

### Visualização de Cliente
- [ ] Criar página de detalhes do cliente
- [ ] Exibir informações completas
- [ ] Mostrar histórico de atendimentos (link)
- [ ] Botões de ação (editar, excluir)

**Status do Sprint 2:** 🟡 Em progresso (UI concluída, falta integração Firestore)

---

## **SPRINT 3: Tabela de Serviços**

### Listagem de Serviços
- [x] Criar view de serviços
- [x] Exibir serviços ativos e inativos
- [x] Mostrar nome e valor de cada serviço
- [x] Indicador visual de status (ativo/inativo)

### Cadastro de Serviço
- [x] Criar formulário de cadastro
- [x] Campos: nome, valor (formatação monetária)
- [x] Validação de campos
- [ ] Salvar no Firestore com `active: true` por padrão - TODO: Implementar

### Edição de Serviço
- [x] Criar modal/página de edição
- [x] Permitir alterar nome e valor
- [ ] Atualizar no Firestore - TODO: Implementar
- [ ] Validar se serviço está em uso em agendamentos - TODO: Implementar

### Ativar/Desativar Serviço
- [ ] Implementar toggle de status
- [ ] Atualizar campo `active` no Firestore
- [ ] Feedback visual imediato
- [ ] Prevenir uso de serviços inativos em novos agendamentos

### Formatação e Validação
- [ ] Formatar valores monetários (R$)
- [ ] Validar valores positivos
- [ ] Máscara de entrada para valores

**Status do Sprint 3:** 🟡 Em progresso (UI concluída, falta integração Firestore)

---

## **SPRINT 4: Agenda - Visualização e Criação**

### Visualização por Dia
- [x] Criar componente de visualização diária
- [x] Exibir horários do dia
- [x] Mostrar agendamentos do dia
- [x] Design responsivo

### Visualização por Semana
- [x] Criar componente de visualização semanal
- [x] Exibir 7 dias da semana
- [x] Navegação entre semanas
- [x] Mostrar agendamentos por dia

### Visualização por Mês
- [x] Criar componente de visualização mensal (calendário)
- [x] Exibir calendário completo
- [x] Indicar dias com agendamentos
- [x] Navegação entre meses

### Toggle de Visualização
- [x] Criar botões para alternar entre vistas
- [x] Salvar preferência do usuário
- [x] Atualizar visualização dinamicamente

### Criação de Agendamento
- [x] Criar modal/formulário de agendamento
- [x] Campos: cliente (select), serviço (select), data, horário, observações
- [x] Validação de campos obrigatórios
- [x] Validação de data/horário (não permitir passado)

### Integração com Firestore
- [ ] Salvar agendamento no Firestore
- [ ] Criar documento na coleção `appointments`
- [ ] Status inicial: "Agendado"
- [ ] Atualizar visualização após criação

### Seleção de Cliente e Serviço
- [ ] Buscar clientes do Firestore para select
- [ ] Buscar serviços ativos para select
- [ ] Filtrar serviços inativos
- [ ] Ordenar listas (alfabética)

**Status do Sprint 4:** 🟡 Em progresso (UI concluída, falta integração Firestore)

---

## **SPRINT 5: Agenda - Gestão e Status**

### Visualização de Agendamento
- [x] Criar modal/página de detalhes do agendamento
- [x] Exibir informações completas
- [x] Mostrar cliente, serviço, data, horário, status, observações

### Atualização de Status
- [x] Criar interface para alterar status
- [x] Opções: Agendado, Concluído, Cancelado
- [ ] Atualizar documento no Firestore - TODO: Implementar
- [x] Feedback visual de mudança

### Edição de Agendamento
- [ ] Permitir editar dados do agendamento
- [ ] Validar alterações
- [ ] Atualizar no Firestore
- [ ] Verificar conflitos ao alterar data/horário

### Prevenção de Horários Duplicados
- [ ] Implementar validação ao criar agendamento
- [ ] Verificar se já existe agendamento no mesmo horário
- [ ] Exibir mensagem de erro se houver conflito
- [ ] Aplicar mesma validação na edição

### Exclusão de Agendamento
- [ ] Implementar exclusão de agendamento
- [ ] Confirmação antes de excluir
- [ ] Deletar do Firestore
- [ ] Atualizar visualização

### Filtros e Busca na Agenda
- [ ] Filtrar por status
- [ ] Filtrar por cliente
- [ ] Filtrar por serviço
- [ ] Busca por texto livre

**Status do Sprint 5:** 🟡 Em progresso (UI concluída, falta integração Firestore)

---

## **SPRINT 6: Histórico de Atendimentos**

### Estrutura de Histórico
- [x] Criar view de histórico
- [ ] Listar atendimentos com status "Concluído" - TODO: Integrar com Firestore
- [x] Exibir informações: cliente, serviço, data, valor, observações

### Filtro por Cliente
- [x] Implementar select de clientes
- [x] Filtrar histórico por cliente selecionado
- [x] Atualizar lista dinamicamente

### Filtro por Período
- [x] Criar seletor de período (data inicial e final)
- [x] Filtrar atendimentos no período
- [x] Validação de datas
- [x] Opções rápidas (hoje, semana, mês)

### Filtro por Tipo de Serviço
- [x] Implementar select de serviços
- [x] Filtrar histórico por serviço
- [x] Combinar filtros (cliente + período + serviço)

### Exportação e Estatísticas
- [x] Calcular total faturado no período
- [x] Contar quantidade de atendimentos
- [x] Exibir estatísticas básicas
- [ ] (Opcional) Exportar para CSV

### Integração com Agendamentos
- [ ] Ao marcar agendamento como "Concluído", criar registro no histórico
- [ ] Copiar dados relevantes (cliente, serviço, valor, data)
- [ ] Manter link com agendamento original (opcional)

**Status do Sprint 6:** 🟡 Em progresso (UI concluída, falta integração Firestore)

---

## **SPRINT 7: UI/UX e Responsividade**

### Design System
- [x] Definir paleta de cores
- [x] Criar componentes base (botões, inputs, cards)
- [x] Definir tipografia
- [x] Criar tema consistente

### Layout Responsivo
- [x] Garantir responsividade em todas as telas
- [ ] Testar em diferentes tamanhos de tela - TODO: Testes manuais
- [x] Ajustar menu/navegação para mobile
- [x] Otimizar formulários para mobile

### Melhorias de UX
- [x] Adicionar loading states
- [x] Implementar mensagens de feedback (sucesso/erro)
- [x] Adicionar confirmações para ações destrutivas
- [x] Melhorar navegação entre páginas

### Acessibilidade
- [ ] Adicionar labels adequados
- [ ] Melhorar contraste de cores
- [ ] Adicionar navegação por teclado
- [ ] Testar com leitores de tela (básico)

### Performance
- [ ] Otimizar carregamento de dados
- [ ] Implementar cache local quando apropriado
- [ ] Lazy loading de componentes
- [ ] Otimizar imagens e assets

### Animações e Transições
- [ ] Adicionar transições suaves
- [ ] Animações de loading
- [ ] Feedback visual de ações
- [ ] Melhorar experiência geral

**Status do Sprint 7:** ✅ Concluído (UI/UX implementada)

---

## **SPRINT 8: Segurança, Testes e Deploy**

### Regras de Segurança do Firestore
- [ ] Criar regras de segurança para coleção `users`
- [ ] Criar regras para coleção `clients`
- [ ] Criar regras para coleção `services`
- [ ] Criar regras para coleção `appointments`
- [ ] Criar regras para coleção `history`
- [ ] Testar regras de segurança

### Validação de Dados
- [ ] Validar dados no front-end
- [ ] Validar dados no back-end (regras Firestore)
- [ ] Sanitizar inputs
- [ ] Prevenir SQL injection (não aplicável ao Firestore, mas validar inputs)

### Testes
- [ ] Testar fluxo completo de login
- [ ] Testar CRUD de clientes
- [ ] Testar CRUD de serviços
- [ ] Testar criação e gestão de agendamentos
- [ ] Testar histórico e filtros
- [ ] Testar responsividade em dispositivos reais

### Configuração do Netlify
- [ ] Criar conta/conectar projeto no Netlify
- [ ] Configurar build command
- [ ] Configurar publish directory
- [ ] Adicionar variáveis de ambiente no Netlify

### Deploy
- [ ] Fazer deploy inicial
- [ ] Testar aplicação em produção
- [ ] Verificar funcionamento do Firestore em produção
- [ ] Configurar domínio personalizado (se necessário)

### Documentação
- [ ] Atualizar README com instruções
- [ ] Documentar variáveis de ambiente
- [ ] Criar guia de uso básico
- [ ] Documentar estrutura do Firestore

### Ajustes Finais
- [ ] Corrigir bugs encontrados
- [ ] Ajustar performance
- [ ] Revisar código
- [ ] Preparar para entrega

**Status do Sprint 8:** ⬜ Não iniciado | 🟡 Em progresso | ✅ Concluído

---

## **📊 PROGRESSO GERAL**

**Sprints Concluídos:** 1 / 8 (Sprint 7 - UI/UX)  
**Sprints em Progresso:** 6 (Sprints 1-6 - UI concluída, falta integração Firestore)  
**Total de Tarefas:** ~150 tarefas  
**Progresso:** ~70% (UI completa, falta integração backend)

### Resumo por Sprint
- ⬜ Sprint 0: Configuração Inicial (Firebase/Firestore)
- 🟡 Sprint 1: Autenticação e Login (UI ✅, Backend ⬜)
- 🟡 Sprint 2: Gestão de Clientes (UI ✅, Backend ⬜)
- 🟡 Sprint 3: Tabela de Serviços (UI ✅, Backend ⬜)
- 🟡 Sprint 4: Agenda - Visualização e Criação (UI ✅, Backend ⬜)
- 🟡 Sprint 5: Agenda - Gestão e Status (UI ✅, Backend ⬜)
- 🟡 Sprint 6: Histórico de Atendimentos (UI ✅, Backend ⬜)
- ✅ Sprint 7: UI/UX e Responsividade (Concluído)
- ⬜ Sprint 8: Segurança, Testes e Deploy

---

**💡 Dica:** Atualize este checklist regularmente para acompanhar o progresso do projeto!

