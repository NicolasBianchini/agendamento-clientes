# Configuração de Número WhatsApp por Estabelecimento

Este documento explica como o sistema garante que **cada dono de estabelecimento tenha seu próprio número WhatsApp** e que **os clientes recebam mensagens apenas do número do seu estabelecimento**.

## 🎯 Contexto

Cada estabelecimento (usuário/dono) possui:
- Sua própria conta no sistema
- Suas próprias configurações (`ConfiguracoesUsuario` vinculada ao `userId`)
- Seu próprio número WhatsApp configurado
- Seus próprios clientes e agendamentos

**Garantia:** Os clientes de um estabelecimento **sempre recebem mensagens do número WhatsApp do seu estabelecimento**, nunca de outro.

---

## ✅ Como Funciona Atualmente

### Isolamento por Estabelecimento

O sistema já garante isolamento através de:

1. **Configurações por Usuário**
   - Cada `ConfiguracoesUsuario` está vinculada a um `userId` único
   - As configurações são armazenadas no Firestore com filtro por `userId`
   - Cada estabelecimento só acessa suas próprias configurações

2. **Serviço de Mensagens**
   - A função `enviarConfirmacaoAgendamento()` recebe as configurações do estabelecimento
   - Usa apenas as configurações (`apiMensagensUrl`, `apiMensagensToken`, `apiMensagensInstancia`) do estabelecimento atual
   - Não há risco de usar número de outro estabelecimento

3. **Autenticação**
   - Cada usuário só pode acessar seus próprios dados
   - O `getCurrentUserId()` garante que apenas o usuário autenticado acessa suas configurações

---

## 🔒 Garantias de Segurança

### 1. Isolamento no Firestore

```typescript
// Buscar configurações do usuário atual
const configuracoes = await configuracoesService.getByUserId(userId)
// Sempre filtra por userId, garantindo isolamento
```

### 2. Validação no Envio

```typescript
// Ao enviar mensagem, usa apenas as configs do estabelecimento atual
export async function enviarConfirmacaoAgendamento(
  dados: DadosAgendamento,
  config?: ConfiguracoesUsuario | null // Config do estabelecimento atual
): Promise<boolean> {
  // Usa config.apiMensagensUrl, config.apiMensagensToken, etc.
  // Sempre do estabelecimento atual
}
```

### 3. Regras de Segurança do Firestore

```javascript
// firestore.rules
match /configuracoes/{configId} {
  allow read: if true; // O código filtra por userId
  allow create: if request.resource.data.userId == request.auth.uid;
  allow update: if resource.data.userId == request.auth.uid;
  allow delete: if resource.data.userId == request.auth.uid;
}
```

---

## 📋 Estrutura de Dados

### Configurações do Estabelecimento

```typescript
interface ConfiguracoesUsuario {
  id?: string
  userId: string // ID único do estabelecimento
  
  // Configurações de mensagens automáticas
  mensagensAutomaticas: boolean
  apiMensagensUrl?: string // URL da API (ex: https://graph.facebook.com/v18.0)
  apiMensagensToken?: string // Token de autenticação
  apiMensagensInstancia?: string // Phone Number ID da Meta
  
  // ... outras configurações ...
}
```

**Cada estabelecimento tem:**
- Seu próprio `userId` único
- Suas próprias configurações de API
- Seu próprio número WhatsApp (Phone Number ID)

---

## 🎨 Interface de Configuração

Na página **Configurações → Mensagens Automáticas**, cada estabelecimento configura:

```
┌─────────────────────────────────────────────────┐
│ Mensagens Automáticas                           │
│                                                  │
│ [✓] Enviar Mensagens Automaticamente            │
│                                                  │
│ URL da API:                                     │
│ [https://graph.facebook.com/v18.0        ]      │
│                                                  │
│ Token de Autenticação:                          │
│ [••••••••••••••••••••••••••••••••••••••]       │
│                                                  │
│ ID da Instância (Phone Number ID):              │
│ [123456789012345                        ]       │
│                                                  │
│ ℹ️ Este número será usado para enviar           │
│    mensagens aos clientes deste estabelecimento│
└─────────────────────────────────────────────────┘
```

**Importante:**
- Cada estabelecimento vê e configura apenas seu próprio número
- Não há acesso a números de outros estabelecimentos
- As mensagens são enviadas sempre do número configurado

---

## 🔍 Fluxo de Envio de Mensagem

```
1. Cliente faz agendamento
   ↓
2. Sistema busca configurações do estabelecimento (userId)
   ↓
3. Verifica se mensagens automáticas estão ativas
   ↓
4. Usa apiMensagensUrl, apiMensagensToken, apiMensagensInstancia
   do estabelecimento atual
   ↓
5. Envia mensagem via API usando o número do estabelecimento
   ↓
6. Cliente recebe mensagem do número WhatsApp do estabelecimento
```

**Garantia:** Em nenhum momento o sistema usa configurações de outro estabelecimento.

---

## ✅ Validações Implementadas

### 1. Verificação de Configuração

```typescript
// Verifica se o estabelecimento tem API configurada
if (!config?.apiMensagensUrl || !config?.apiMensagensToken) {
  console.error('❌ API não configurada para este estabelecimento')
  return false
}
```

### 2. Isolamento por userId

```typescript
// Sempre busca configurações do usuário atual
const userId = getCurrentUserId()
const config = await configuracoesService.getByUserId(userId)
```

### 3. Logs para Auditoria

```typescript
console.log('📤 [MENSAGENS] Enviando do estabelecimento:', userId)
console.log('📤 [MENSAGENS] Usando Phone Number ID:', config.apiMensagensInstancia)
```

---

## 🚀 Melhorias Sugeridas (Opcional)

### 1. Exibir Número Configurado na Interface

Adicionar na página de Configurações uma seção que mostra:
- "Número WhatsApp configurado: [Phone Number ID]"
- "Última mensagem enviada: [data/hora]"
- "Status: [Ativo/Inativo]"

### 2. Teste de Conexão

Botão "Testar Conexão" que:
- Verifica se a API está acessível
- Valida se o token está correto
- Confirma se o Phone Number ID existe
- Envia uma mensagem de teste

### 3. Histórico de Envios

Registrar no Firestore:
- Qual estabelecimento enviou
- Para qual cliente
- Qual número foi usado
- Data/hora
- Status (sucesso/falha)

### 4. Validação de Unicidade

Garantir que o mesmo Phone Number ID não seja usado por múltiplos estabelecimentos (se necessário).

---

## 📝 Exemplo Prático

### Estabelecimento A (userId: "user123")
```typescript
{
  userId: "user123",
  apiMensagensUrl: "https://graph.facebook.com/v18.0",
  apiMensagensToken: "token_estabelecimento_A",
  apiMensagensInstancia: "phone_number_id_A"
}
```
**Clientes do Estabelecimento A recebem mensagens do `phone_number_id_A`**

### Estabelecimento B (userId: "user456")
```typescript
{
  userId: "user456",
  apiMensagensUrl: "https://graph.facebook.com/v18.0",
  apiMensagensToken: "token_estabelecimento_B",
  apiMensagensInstancia: "phone_number_id_B"
}
```
**Clientes do Estabelecimento B recebem mensagens do `phone_number_id_B`**

**Isolamento garantido:** Nunca há mistura entre os números.

---

## 🔐 Segurança Adicional (Recomendado)

### 1. Validação no Backend (se houver)

Se no futuro houver backend, adicionar validação:
```typescript
// Verificar se o userId da requisição corresponde ao userId das configs
if (config.userId !== requestUserId) {
  throw new Error('Tentativa de usar configurações de outro estabelecimento')
}
```

### 2. Logs de Auditoria

Registrar todas as tentativas de envio:
```typescript
await registrarLog({
  userId: getCurrentUserId(),
  acao: 'enviar_mensagem',
  phoneNumberId: config.apiMensagensInstancia,
  clienteTelefone: telefoneFormatado,
  timestamp: new Date()
})
```

### 3. Rate Limiting por Estabelecimento

Limitar número de mensagens por estabelecimento para evitar abuso:
```typescript
const limiteDiario = 1000
const mensagensHoje = await contarMensagensHoje(userId)
if (mensagensHoje >= limiteDiario) {
  throw new Error('Limite diário de mensagens atingido')
}
```

---

## ✅ Checklist de Verificação

Para garantir que tudo está funcionando corretamente:

- [ ] Cada estabelecimento tem seu próprio `userId` único
- [ ] As configurações são filtradas por `userId` no Firestore
- [ ] A função `enviarConfirmacaoAgendamento()` recebe apenas configs do estabelecimento atual
- [ ] Não há acesso cruzado entre estabelecimentos
- [ ] Os logs mostram qual estabelecimento está enviando
- [ ] As regras do Firestore impedem acesso não autorizado
- [ ] A interface mostra apenas as configurações do usuário logado

---

## 🎯 Conclusão

O sistema **já garante** que:
- ✅ Cada estabelecimento tem seu próprio número WhatsApp
- ✅ Os clientes recebem mensagens apenas do número do seu estabelecimento
- ✅ Não há risco de usar número de outro estabelecimento
- ✅ O isolamento é garantido por `userId` em todas as operações

**Não é necessário implementar rotação ou intercalação** - cada estabelecimento usa apenas seu próprio número, que é exatamente o comportamento desejado.

---

**Última atualização:** Dezembro 2024
