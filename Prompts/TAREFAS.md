# 📋 TAREFAS DETALHADAS – Sistema Web de Agenda para Nail Designer

---

## **SPRINT 0: Configuração Inicial e Infraestrutura**

### **0.1 Setup do Projeto**
- [ ] Configurar Firebase SDK no projeto Vue
- [ ] Instalar dependências necessárias (firebase, vue-router, etc.)
- [ ] Configurar variáveis de ambiente (.env)
- [ ] Criar arquivo de configuração do Firebase

### **0.2 Estrutura do Firestore**
- [ ] Criar projeto no Firebase Console
- [ ] Configurar Firestore Database
- [ ] Criar coleções base: `users`, `clients`, `services`, `appointments`, `history`
- [ ] Definir índices necessários no Firestore

### **0.3 Estrutura do Código**
- [ ] Configurar Vue Router
- [ ] Criar estrutura de pastas (components, views, services, utils)
- [ ] Configurar serviços base do Firestore
- [ ] Criar layout base da aplicação

### **0.4 Configuração de Build**
- [ ] Configurar Vite para produção
- [ ] Testar build local
- [ ] Preparar configuração para Netlify

---

## **SPRINT 1: Autenticação e Login**

### **1.1 Tela de Login**
- [x] Criar componente de Login
- [x] Implementar formulário (email e senha)
- [x] Adicionar validação de campos
- [x] Criar design responsivo da tela

### **1.2 Sistema de Hash**
- [ ] Implementar função de hash de senha (bcrypt ou crypto)
- [ ] Criar utilitário para comparar senhas
- [ ] Testar hash e comparação

### **1.3 Autenticação no Firestore**
- [ ] Criar serviço de autenticação
- [ ] Implementar função de login (buscar usuário no Firestore)
- [ ] Validar credenciais com hash
- [ ] Tratar erros de autenticação

### **1.4 Persistência de Sessão**
- [ ] Implementar armazenamento de sessão (localStorage/sessionStorage)
- [ ] Criar guard de rota para proteger páginas autenticadas
- [ ] Implementar logout
- [ ] Criar middleware de autenticação

### **1.5 Navegação Pós-Login**
- [x] Redirecionar após login bem-sucedido
- [x] Criar layout autenticado (header, menu, etc.)
- [x] Implementar botão de logout

---

## **SPRINT 2: Gestão de Clientes**

### **2.1 Listagem de Clientes**
- [x] Criar view de listagem de clientes
- [x] Implementar busca/filtro de clientes
- [x] Criar componente de card/lista de cliente
- [ ] Adicionar paginação (se necessário)

### **2.2 Cadastro de Cliente**
- [x] Criar formulário de cadastro
- [x] Campos: nome, telefone, observações
- [x] Validação de formulário
- [ ] Integração com Firestore (criar documento) - TODO: Implementar

### **2.3 Edição de Cliente**
- [x] Criar modal/página de edição
- [x] Carregar dados do cliente
- [ ] Atualizar dados no Firestore - TODO: Implementar
- [x] Feedback de sucesso/erro

### **2.4 Exclusão de Cliente**
- [ ] Implementar confirmação de exclusão
- [ ] Deletar documento do Firestore
- [ ] Atualizar lista após exclusão
- [ ] Verificar se cliente tem agendamentos (aviso)

### **2.5 Visualização de Cliente**
- [ ] Criar página de detalhes do cliente
- [ ] Exibir informações completas
- [ ] Mostrar histórico de atendimentos (link)
- [ ] Botões de ação (editar, excluir)

---

## **SPRINT 3: Tabela de Serviços**

### **3.1 Listagem de Serviços**
- [x] Criar view de serviços
- [x] Exibir serviços ativos e inativos
- [x] Mostrar nome e valor de cada serviço
- [x] Indicador visual de status (ativo/inativo)

### **3.2 Cadastro de Serviço**
- [x] Criar formulário de cadastro
- [x] Campos: nome, valor (formatação monetária)
- [x] Validação de campos
- [ ] Salvar no Firestore com `active: true` por padrão - TODO: Implementar

### **3.3 Edição de Serviço**
- [x] Criar modal/página de edição
- [x] Permitir alterar nome e valor
- [ ] Atualizar no Firestore - TODO: Implementar
- [ ] Validar se serviço está em uso em agendamentos - TODO: Implementar

### **3.4 Ativar/Desativar Serviço**
- [ ] Implementar toggle de status
- [ ] Atualizar campo `active` no Firestore
- [ ] Feedback visual imediato
- [ ] Prevenir uso de serviços inativos em novos agendamentos

### **3.5 Formatação e Validação**
- [ ] Formatar valores monetários (R$)
- [ ] Validar valores positivos
- [ ] Máscara de entrada para valores

---

## **SPRINT 4: Agenda - Visualização e Criação**

### **4.1 Visualização por Dia**
- [x] Criar componente de visualização diária
- [x] Exibir horários do dia
- [x] Mostrar agendamentos do dia
- [x] Design responsivo

### **4.2 Visualização por Semana**
- [x] Criar componente de visualização semanal
- [x] Exibir 7 dias da semana
- [x] Navegação entre semanas
- [x] Mostrar agendamentos por dia

### **4.3 Visualização por Mês**
- [x] Criar componente de visualização mensal (calendário)
- [x] Exibir calendário completo
- [x] Indicar dias com agendamentos
- [x] Navegação entre meses

### **4.4 Toggle de Visualização**
- [x] Criar botões para alternar entre vistas
- [x] Salvar preferência do usuário
- [x] Atualizar visualização dinamicamente

### **4.5 Criação de Agendamento**
- [x] Criar modal/formulário de agendamento
- [x] Campos: cliente (select), serviço (select), data, horário, observações
- [x] Validação de campos obrigatórios
- [x] Validação de data/horário (não permitir passado)

### **4.6 Integração com Firestore**
- [ ] Salvar agendamento no Firestore
- [ ] Criar documento na coleção `appointments`
- [ ] Status inicial: "Agendado"
- [ ] Atualizar visualização após criação

### **4.7 Seleção de Cliente e Serviço**
- [ ] Buscar clientes do Firestore para select
- [ ] Buscar serviços ativos para select
- [ ] Filtrar serviços inativos
- [ ] Ordenar listas (alfabética)

---

## **SPRINT 5: Agenda - Gestão e Status**

### **5.1 Visualização de Agendamento**
- [x] Criar modal/página de detalhes do agendamento
- [x] Exibir informações completas
- [x] Mostrar cliente, serviço, data, horário, status, observações

### **5.2 Atualização de Status**
- [x] Criar interface para alterar status
- [x] Opções: Agendado, Concluído, Cancelado
- [ ] Atualizar documento no Firestore - TODO: Implementar
- [x] Feedback visual de mudança

### **5.3 Edição de Agendamento**
- [ ] Permitir editar dados do agendamento
- [ ] Validar alterações
- [ ] Atualizar no Firestore
- [ ] Verificar conflitos ao alterar data/horário

### **5.4 Prevenção de Horários Duplicados**
- [ ] Implementar validação ao criar agendamento
- [ ] Verificar se já existe agendamento no mesmo horário
- [ ] Exibir mensagem de erro se houver conflito
- [ ] Aplicar mesma validação na edição

### **5.5 Exclusão de Agendamento**
- [ ] Implementar exclusão de agendamento
- [ ] Confirmação antes de excluir
- [ ] Deletar do Firestore
- [ ] Atualizar visualização

### **5.6 Filtros e Busca na Agenda**
- [ ] Filtrar por status
- [ ] Filtrar por cliente
- [ ] Filtrar por serviço
- [ ] Busca por texto livre

---

## **SPRINT 6: Histórico de Atendimentos**

### **6.1 Estrutura de Histórico**
- [x] Criar view de histórico
- [ ] Listar atendimentos com status "Concluído" - TODO: Integrar com Firestore
- [x] Exibir informações: cliente, serviço, data, valor, observações

### **6.2 Filtro por Cliente**
- [x] Implementar select de clientes
- [x] Filtrar histórico por cliente selecionado
- [x] Atualizar lista dinamicamente

### **6.3 Filtro por Período**
- [x] Criar seletor de período (data inicial e final)
- [x] Filtrar atendimentos no período
- [x] Validação de datas
- [x] Opções rápidas (hoje, semana, mês)

### **6.4 Filtro por Tipo de Serviço**
- [x] Implementar select de serviços
- [x] Filtrar histórico por serviço
- [x] Combinar filtros (cliente + período + serviço)

### **6.5 Exportação e Estatísticas**
- [x] Calcular total faturado no período
- [x] Contar quantidade de atendimentos
- [x] Exibir estatísticas básicas
- [ ] (Opcional) Exportar para CSV

### **6.6 Integração com Agendamentos**
- [ ] Ao marcar agendamento como "Concluído", criar registro no histórico
- [ ] Copiar dados relevantes (cliente, serviço, valor, data)
- [ ] Manter link com agendamento original (opcional)

---

## **SPRINT 7: UI/UX e Responsividade**

### **7.1 Design System**
- [x] Definir paleta de cores
- [x] Criar componentes base (botões, inputs, cards)
- [x] Definir tipografia
- [x] Criar tema consistente

### **7.2 Layout Responsivo**
- [x] Garantir responsividade em todas as telas
- [ ] Testar em diferentes tamanhos de tela - TODO: Testes manuais
- [x] Ajustar menu/navegação para mobile
- [x] Otimizar formulários para mobile

### **7.3 Melhorias de UX**
- [x] Adicionar loading states
- [x] Implementar mensagens de feedback (sucesso/erro)
- [x] Adicionar confirmações para ações destrutivas
- [x] Melhorar navegação entre páginas

### **7.4 Acessibilidade**
- [ ] Adicionar labels adequados
- [ ] Melhorar contraste de cores
- [ ] Adicionar navegação por teclado
- [ ] Testar com leitores de tela (básico)

### **7.5 Performance**
- [ ] Otimizar carregamento de dados
- [ ] Implementar cache local quando apropriado
- [ ] Lazy loading de componentes
- [ ] Otimizar imagens e assets

### **7.6 Animações e Transições**
- [ ] Adicionar transições suaves
- [ ] Animações de loading
- [ ] Feedback visual de ações
- [ ] Melhorar experiência geral

---

## **SPRINT 8: Segurança, Testes e Deploy**

### **8.1 Regras de Segurança do Firestore**
- [ ] Criar regras de segurança para coleção `users`
- [ ] Criar regras para coleção `clients`
- [ ] Criar regras para coleção `services`
- [ ] Criar regras para coleção `appointments`
- [ ] Criar regras para coleção `history`
- [ ] Testar regras de segurança

### **8.2 Validação de Dados**
- [ ] Validar dados no front-end
- [ ] Validar dados no back-end (regras Firestore)
- [ ] Sanitizar inputs
- [ ] Prevenir SQL injection (não aplicável ao Firestore, mas validar inputs)

### **8.3 Testes**
- [ ] Testar fluxo completo de login
- [ ] Testar CRUD de clientes
- [ ] Testar CRUD de serviços
- [ ] Testar criação e gestão de agendamentos
- [ ] Testar histórico e filtros
- [ ] Testar responsividade em dispositivos reais

### **8.4 Configuração do Netlify**
- [ ] Criar conta/conectar projeto no Netlify
- [ ] Configurar build command
- [ ] Configurar publish directory
- [ ] Adicionar variáveis de ambiente no Netlify

### **8.5 Deploy**
- [ ] Fazer deploy inicial
- [ ] Testar aplicação em produção
- [ ] Verificar funcionamento do Firestore em produção
- [ ] Configurar domínio personalizado (se necessário)

### **8.6 Documentação**
- [ ] Atualizar README com instruções
- [ ] Documentar variáveis de ambiente
- [ ] Criar guia de uso básico
- [ ] Documentar estrutura do Firestore

### **8.7 Ajustes Finais**
- [ ] Corrigir bugs encontrados
- [ ] Ajustar performance
- [ ] Revisar código
- [ ] Preparar para entrega

---

## **Observações Gerais**

* Priorize as tarefas marcadas como essenciais para o funcionamento básico.
* Algumas tarefas podem ser feitas em paralelo.
* Revise e ajuste conforme necessário durante o desenvolvimento.
* Mantenha o código organizado e documentado.

