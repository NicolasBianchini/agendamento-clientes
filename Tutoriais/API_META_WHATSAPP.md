# API do WhatsApp Business - Meta (Oficial)

Este guia contém instruções completas para configurar e usar a **API oficial do WhatsApp Business da Meta** no sistema AgendaPro.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Criar Conta e Aplicativo](#criar-conta-e-aplicativo)
4. [Configurar WhatsApp Business API](#configurar-whatsapp-business-api)
5. [Configurar no Sistema](#configurar-no-sistema)
6. [Janela de Conversa Gratuita](#janela-de-conversa-gratuita)
7. [Limites e Custos](#limites-e-custos)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

A **WhatsApp Business API** é a solução oficial da Meta para empresas enviarem mensagens via WhatsApp. É a opção mais estável e confiável, mas requer aprovação e tem algumas limitações.

### Características:

- ✅ **API oficial** e suportada pelo WhatsApp
- ✅ **Estável** e confiável
- ✅ **Segura** e em conformidade com termos de serviço
- ⚠️ Requer **aprovação** do WhatsApp
- ⚠️ **Janela gratuita** de 24h para respostas
- ⚠️ Mensagens fora da janela são **cobradas**

---

## 📝 Pré-requisitos

Antes de começar, você precisa ter:

1. **Conta no Facebook Business** (gratuita)
2. **Número de telefone** para WhatsApp Business
3. **Acesso ao número** para receber código de verificação
4. **Tempo** para processo de aprovação (pode levar alguns dias)

---

## 🚀 Criar Conta e Aplicativo

### Passo 1: Criar Conta no Facebook Business

1. Acesse: https://business.facebook.com
2. Clique em **"Criar Conta"**
3. Preencha seus dados:
   - Nome da empresa
   - Seu nome
   - Email
   - Senha
4. Confirme seu email

### Passo 2: Criar Aplicativo no Meta for Developers

1. Acesse: https://developers.facebook.com
2. Faça login com sua conta do Facebook Business
3. Clique em **"Meus Apps"** → **"Criar App"**
4. Selecione **"Business"** como tipo de app
5. Preencha:
   - **Nome do App:** AgendaPro (ou nome da sua escolha)
   - **Email de contato:** Seu email
   - **Finalidade do negócio:** Selecione a opção mais adequada
6. Clique em **"Criar App"**

### Passo 3: Adicionar Produto WhatsApp

1. No painel do seu app, procure por **"WhatsApp"**
2. Clique em **"Configurar"** no card do WhatsApp
3. Siga as instruções na tela

---

## ⚙️ Configurar WhatsApp Business API

### Passo 1: Obter Token de Acesso

1. No painel do Meta for Developers, vá em **"WhatsApp"** → **"API Setup"**
2. Você verá uma seção **"Temporary access token"**
3. **Copie este token** (você precisará dele)
4. ⚠️ **Importante:** Este token é temporário (válido por 24 horas)
5. Para token permanente, você precisará criar um **App ID** e **App Secret**

### Passo 2: Obter Token Permanente (Recomendado)

1. No painel, vá em **"Configurações"** → **"Básico"**
2. Anote seu **App ID** e **App Secret**
3. Gere um **Token de Acesso do Sistema**:
   - Acesse: https://developers.facebook.com/tools/explorer/
   - Selecione seu app
   - Gere um token com permissões: `whatsapp_business_messaging`, `whatsapp_business_management`
4. Use este token no sistema

### Passo 3: Obter Phone Number ID

1. No painel do WhatsApp, vá em **"API Setup"**
2. Você verá seu **Phone Number ID**
3. **Copie este ID** (você precisará dele)

### Passo 4: Obter Business Account ID (Opcional)

1. Se você tiver um WhatsApp Business Account, anote o **Business Account ID**
2. Caso contrário, você pode usar o Phone Number ID diretamente

---

## 🔧 Configurar no Sistema

### Passo 1: Acessar Configurações

1. No sistema AgendaPro, vá em **"Configurações"**
2. Role até a seção **"Mensagens Automáticas"**
3. Ative a opção **"Enviar Mensagens Automaticamente"**

### Passo 2: Preencher Dados da API

Preencha os campos com as informações obtidas:

#### **URL da API:**
```
https://graph.facebook.com/v18.0
```

#### **Token de Autenticação:**
Cole o token que você obteve:
- Token temporário (válido por 24h)
- Ou token permanente (recomendado)

#### **ID da Instância:**
Cole o **Phone Number ID** que você copiou do painel da Meta.

**Exemplo:**
```
URL: https://graph.facebook.com/v18.0
Token: EAABwzLixnjYBO7ZC...
ID da Instância: 123456789012345
```

### Passo 3: Formato do Número de Telefone

⚠️ **Importante:** A API da Meta requer números no formato internacional **sem** o sinal de `+` e **sem** espaços.

**Formato correto:**
- ✅ `5511999999999` (Brasil: 55 + DDD + número)
- ❌ `+55 11 99999-9999`
- ❌ `(11) 99999-9999`

O sistema já faz essa formatação automaticamente.

---

## 💬 Janela de Conversa Gratuita

A API do WhatsApp tem uma **janela de conversa gratuita**:

### Regras:

1. **24 horas:** Após o cliente iniciar uma conversa, você pode responder **gratuitamente** por 24 horas
2. **72 horas:** Se o cliente clicou em um anúncio Click-to-WhatsApp, a janela é de 72 horas
3. **Fora da janela:** Mensagens enviadas fora da janela são **cobradas**

### Como Funciona:

- ✅ Cliente envia mensagem → Você tem 24h para responder **grátis**
- ✅ Você envia mensagem dentro de 24h → **Grátis**
- ⚠️ Você envia mensagem após 24h → **Cobrado**

### Template Messages (Fora da Janela)

Para enviar mensagens fora da janela, você precisa usar **Template Messages**:

1. Crie templates no painel da Meta
2. Aguarde aprovação (pode levar algumas horas)
3. Use o nome do template no envio

**Exemplo de template:**
```
Nome: confirmacao_agendamento
Categoria: UTILITY
Conteúdo: Seu agendamento foi confirmado para {{1}} às {{2}}
```

---

## 💰 Limites e Custos

### Limites Gratuitos:

- **1.000 conversas gratuitas/mês** (conversas iniciadas pelo cliente)
- Mensagens dentro da janela de 24h são **gratuitas**

### Custos (Fora da Janela):

Os custos variam por país. Para o Brasil (2024):

- **Conversas iniciadas pela empresa:** ~R$ 0,05 - R$ 0,15 por conversa
- **Template Messages:** ~R$ 0,02 - R$ 0,10 por mensagem

### Verificar Custos Atuais:

1. Acesse: https://developers.facebook.com/docs/whatsapp/pricing
2. Selecione seu país
3. Veja os preços atualizados

---

## 🔍 Troubleshooting

### Problema: "Invalid OAuth access token"

**Solução:**
- Verifique se o token está correto
- Tokens temporários expiram em 24h
- Gere um novo token permanente

### Problema: "Phone number not found"

**Solução:**
- Verifique se o Phone Number ID está correto
- Certifique-se de que o número está verificado no painel da Meta

### Problema: "Message failed to send"

**Possíveis causas:**
1. Número de telefone em formato incorreto
2. Número não está no formato internacional
3. Cliente bloqueou o número
4. Janela de conversa expirada (use template message)

**Solução:**
- Verifique o formato do número (deve ser: `5511999999999`)
- Verifique se a conversa está dentro da janela de 24h
- Para mensagens fora da janela, use template messages aprovadas

### Problema: "Rate limit exceeded"

**Solução:**
- A API tem limites de requisições por segundo
- Aguarde alguns segundos e tente novamente
- Implemente retry com backoff exponencial

### Problema: "Template not approved"

**Solução:**
- Templates precisam ser aprovados pela Meta
- Aguarde aprovação (pode levar algumas horas)
- Verifique se o template está no status "APPROVED"

---

## 📚 Recursos Adicionais

### Documentação Oficial:

- **Documentação da API:** https://developers.facebook.com/docs/whatsapp/cloud-api
- **Guia de Início Rápido:** https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
- **Referência da API:** https://developers.facebook.com/docs/whatsapp/cloud-api/reference
- **Preços:** https://developers.facebook.com/docs/whatsapp/pricing

### Endpoints Principais:

- **Enviar Mensagem:** `POST /v18.0/{phone-number-id}/messages`
- **Verificar Status:** `GET /v18.0/{message-id}`
- **Listar Templates:** `GET /v18.0/{whatsapp-business-account-id}/message_templates`

### Exemplo de Requisição:

```bash
curl -X POST "https://graph.facebook.com/v18.0/{phone-number-id}/messages" \
  -H "Authorization: Bearer {access-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "5511999999999",
    "type": "text",
    "text": {
      "body": "Sua mensagem aqui"
    }
  }'
```

---

## ✅ Checklist de Configuração

Use este checklist para garantir que tudo está configurado corretamente:

- [ ] Conta no Facebook Business criada
- [ ] App criado no Meta for Developers
- [ ] Produto WhatsApp adicionado ao app
- [ ] Token de acesso obtido (permanente recomendado)
- [ ] Phone Number ID copiado
- [ ] Número de telefone verificado
- [ ] URL da API configurada: `https://graph.facebook.com/v18.0`
- [ ] Token configurado no sistema
- [ ] Phone Number ID configurado no sistema
- [ ] Teste de envio realizado com sucesso

---

## 🎉 Pronto!

Após seguir todos os passos, suas mensagens serão enviadas automaticamente usando a API oficial do WhatsApp Business da Meta!

**Lembre-se:**
- Mensagens dentro de 24h são gratuitas
- Mensagens fora de 24h requerem templates aprovados
- Monitore seus custos no painel da Meta
- Mantenha seus tokens seguros e atualizados

---

## 📞 Suporte

Se encontrar problemas:

1. Consulte a documentação oficial da Meta
2. Verifique os logs do sistema para erros específicos
3. Entre em contato com o suporte da Meta: https://developers.facebook.com/support

---

**Última atualização:** Dezembro 2024  
**Versão da API:** v18.0
