# Agendamento de Clientes

Aplicação de agendamento com múltiplos estabelecimentos, múltiplos profissionais, portal do cliente, visão interna por papel e suporte a integrações de calendário e notificações.

## Visão Geral

O projeto foi estruturado para atender quatro perfis principais:

- `admin_master`: administra a plataforma e pode criar estabelecimentos e usuários estratégicos.
- `proprietario`: acompanha a operação do próprio estabelecimento com visão ampliada da unidade.
- `profissional`: enxerga somente a própria agenda e os próprios atendimentos.
- `cliente`: faz login, agenda, consulta histórico, cancela e remarca conforme as regras definidas.

Também existe a role `admin`, usada para operação interna.

## Funcionalidades Implementadas

- Cadastro de estabelecimentos com vínculo de usuários e contexto por unidade.
- Cadastro de profissionais com vínculo a serviços atendidos.
- Disponibilidade e bloqueios por profissional.
- Fluxo de autoagendamento público/logado.
- Seleção de estabelecimento, serviço e profissional.
- Opção de remarcação a partir do portal do cliente.
- Histórico de agendamentos vinculado a `clienteUserId`.
- Deduplicação de clientes por `clienteUserId`, e-mail ou telefone.
- Visualizações separadas para agenda diária, semanal, mensal e portal do cliente.
- Links para WhatsApp com templates configuráveis.
- Associação de agendamento a evento de calendário:
  - link para Google Calendar
  - arquivo `.ics` compatível com Apple Calendar

## Estrutura de Dados

Coleções principais no Firestore:

- `usuarios`
  - roles, autenticação simplificada, vínculo com `estabelecimentoId`
- `estabelecimentos`
  - dados da unidade e configuração operacional
- `clientes`
  - nome, telefone, e-mail, `clienteUserId`, `identificador`, `estabelecimentoId`
- `servicos`
  - serviço ofertado por estabelecimento
- `profissionalServicos`
  - relação N:N entre profissional e serviço
- `disponibilidadeProfissional`
  - grade recorrente por dia da semana
- `bloqueiosProfissional`
  - folgas, pausas e indisponibilidades específicas
- `agendamentos`
  - `estabelecimentoId`, `profissionalId`, `clienteUserId`, `servicoId`, status e metadados de calendário

## Campos Relevantes de Agendamento

Os agendamentos mais recentes já usam o formato preparado para agenda, portal e integrações:

- `estabelecimentoId`
- `estabelecimentoNome`
- `profissionalId`
- `profissionalNome`
- `clienteId`
- `clienteUserId`
- `clienteNome`
- `clienteTelefone`
- `clienteEmail`
- `servicoId`
- `servicoNome`
- `servicoValor`
- `status`
- `calendarEvent`
  - `title`
  - `startIso`
  - `endIso`
  - `googleCalendarUrl`
  - `icsDataUri`
  - `status`
- `remarcadoDeId`
- `remarcadoParaId`

## Comportamento de Calendário

Quando um agendamento é criado ou atualizado pelo fluxo atual:

- o sistema monta um objeto `calendarEvent`
- o portal do cliente exibe o link para Google Calendar
- o portal do cliente exibe um `.ics` para Apple Calendar
- mudanças de status atualizam o `status` armazenado no `calendarEvent`
- remarcações criam um novo agendamento e cancelam o anterior, preservando o vínculo entre os dois registros

Observação: nesta etapa a integração está pronta no frontend e no modelo de dados. O disparo externo real em APIs de terceiros continua dependendo do backend seguro/função dedicada e das credenciais do ambiente.

## WhatsApp e Backend Seguro

Os templates e a montagem das mensagens já estão preparados no frontend, com suporte para:

- confirmação
- lembrete
- cancelamento/remarcação

Existe um esqueleto de backend em [functions/appointment-notifications.ts](/Users/nicolas/Desktop/NICOLAS/Projetos/agendamento-clientes/functions/appointment-notifications.ts) para mover o envio real para uma função segura e evitar exposição de token no cliente.

## Variáveis de Ambiente

Exemplo de organização:

```env
VITE_FIREBASE_API_KEY=""
VITE_FIREBASE_AUTH_DOMAIN=""
VITE_FIREBASE_PROJECT_ID=""
VITE_FIREBASE_STORAGE_BUCKET=""
VITE_FIREBASE_MESSAGING_SENDER_ID=""
VITE_FIREBASE_APP_ID=""

VITE_NOTIFICATION_FUNCTION_URL=""
VITE_GOOGLE_CALENDAR_CLIENT_EMAIL=""
```

As credenciais do Firebase web ficam no frontend porque fazem parte da configuração pública do app. O que deve permanecer fora do cliente são segredos de envio e integrações sensíveis.

## Scripts Úteis

```bash
npm run dev
npm run build
npm run reset-admin-password -- <email> <nova-senha>
npm run migrate-clientes-estabelecimento -- --dry-run
npm run migrate-clientes-estabelecimento -- --estabelecimento=<id>
npm run migrate-agendamentos-formato -- --dry-run
npm run migrate-agendamentos-formato -- --estabelecimento=<id>
```

## Migração de Dados Legados

Antes de rodar em produção:

1. Execute primeiro o `dry-run` dos dois scripts.
2. Valide os logs de clientes e agendamentos sem `estabelecimentoId` inferido.
3. Rode a migração real.
4. Reabra as telas de agenda diária, semanal, mensal, histórico e portal do cliente.

Arquivos relacionados:

- [scripts/migrate-clientes-estabelecimento.ts](/Users/nicolas/Desktop/NICOLAS/Projetos/agendamento-clientes/scripts/migrate-clientes-estabelecimento.ts)
- [scripts/migrate-agendamentos-novo-formato.ts](/Users/nicolas/Desktop/NICOLAS/Projetos/agendamento-clientes/scripts/migrate-agendamentos-novo-formato.ts)

## Telas Impactadas

- [src/pages/AgendaDia.tsx](/Users/nicolas/Desktop/NICOLAS/Projetos/agendamento-clientes/src/pages/AgendaDia.tsx)
- [src/pages/AgendaSemana.tsx](/Users/nicolas/Desktop/NICOLAS/Projetos/agendamento-clientes/src/pages/AgendaSemana.tsx)
- [src/pages/AgendaMes.tsx](/Users/nicolas/Desktop/NICOLAS/Projetos/agendamento-clientes/src/pages/AgendaMes.tsx)
- [src/pages/AutoAgendamento.tsx](/Users/nicolas/Desktop/NICOLAS/Projetos/agendamento-clientes/src/pages/AutoAgendamento.tsx)
- [src/pages/PortalClienteAgendamentos.tsx](/Users/nicolas/Desktop/NICOLAS/Projetos/agendamento-clientes/src/pages/PortalClienteAgendamentos.tsx)
- [src/pages/PortalClienteInicio.tsx](/Users/nicolas/Desktop/NICOLAS/Projetos/agendamento-clientes/src/pages/PortalClienteInicio.tsx)
- [src/components/AgendamentoModal.tsx](/Users/nicolas/Desktop/NICOLAS/Projetos/agendamento-clientes/src/components/AgendamentoModal.tsx)
- [src/components/AgendamentoDetalhesModal.tsx](/Users/nicolas/Desktop/NICOLAS/Projetos/agendamento-clientes/src/components/AgendamentoDetalhesModal.tsx)

## Limitações do Ambiente Atual

Neste workspace não foi possível executar build ou checagem TypeScript porque `node` e `npm` não estão instalados no ambiente atual. As alterações foram aplicadas e validadas por inspeção estática dos arquivos.
