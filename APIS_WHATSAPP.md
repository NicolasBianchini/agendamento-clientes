# APIs Gratuitas para WhatsApp

Este documento lista as principais opções de APIs gratuitas para envio de mensagens WhatsApp.

## 🚀 Serviços Online (Recomendado - Sem Instalação)

Se você quer uma solução que já está online e pronta para usar, sem precisar instalar nada:

### 1. **Wawp** ⭐ (Mais Recomendado)
- **URL:** https://wawp.net
- **Gratuito:** ✅ 250 mensagens/mês (sem cartão de crédito)
- **Fácil:** ✅ Muito fácil de configurar
- **API:** REST API simples
- **Status:** Ativo e confiável

**Como configurar:**
1. Acesse https://wawp.net e crie uma conta gratuita
2. Conecte seu WhatsApp escaneando o QR Code
3. Copie sua API Key
4. No sistema: URL = `https://api.wawp.net/v1`, Token = sua API Key

---

### 2. **Wozzapi**
- **URL:** https://wozzapi.com
- **Gratuito:** ✅ Plano gratuito disponível
- **Fácil:** ✅ REST API bem documentada
- **Status:** Ativo

**Como configurar:**
1. Acesse https://wozzapi.com e crie uma conta
2. Conecte seu WhatsApp
3. Use sua API Key no sistema

---

### 3. **WaPulse** (Beta)
- **URL:** https://wapulse.com
- **Gratuito:** ✅ Gratuito durante beta
- **Fácil:** ✅ API simples
- **Status:** Em beta, mas funcional

---

### 4. **ChatAPI**
- **URL:** https://chat-api.com
- **Gratuito:** ✅ 100 mensagens/dia
- **Fácil:** ✅ API REST completa
- **Status:** Serviço estabelecido

**Como configurar:**
1. Acesse https://chat-api.com e crie uma conta
2. Conecte seu WhatsApp
3. Use sua API Key no sistema

---

## 📋 Comparação de Serviços Online

| Serviço | Mensagens Grátis | Fácil? | Recomendado? |
|---------|------------------|--------|--------------|
| **Wawp** | 250/mês | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Wozzapi** | Variável | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **WaPulse** | Ilimitado (beta) | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **ChatAPI** | 100/dia | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 🔧 Como Configurar Wawp (Recomendado)

### Passo 1: Criar Conta
1. Acesse: https://wawp.net/whatsapp-api/
2. Clique em "Sign Up" ou "Criar Conta"
3. Crie sua conta (não precisa de cartão de crédito)

### Passo 2: Conectar WhatsApp
1. Após criar a conta, você verá um QR Code
2. Abra o WhatsApp no seu celular
3. Vá em Configurações → Aparelhos conectados → Conectar um aparelho
4. Escaneie o QR Code

### Passo 3: Obter API Key
1. No dashboard do Wawp, vá em "API" ou "Configurações"
2. Copie sua API Key

### Passo 4: Configurar no Sistema
1. Vá em **Configurações → Mensagens Automáticas**
2. Ative **"Enviar Mensagens Automaticamente"**
3. Preencha:
   - **URL da API:** `https://api.wawp.net/v1`
   - **Token:** Cole sua API Key do Wawp
   - **ID da Instância:** Deixe vazio (não é necessário para Wawp)

### Pronto! 🎉
Agora suas mensagens serão enviadas automaticamente quando você criar um agendamento!

---

## 🟢 Evolution API (Recomendada)

**Status:** ✅ Gratuita e Open Source  
**Tipo:** Self-hosted (você hospeda)  
**Documentação:** https://doc.evolution-api.com  
**GitHub:** https://github.com/EvolutionAPI/evolution-api

### Características:
- ✅ Totalmente gratuita
- ✅ Open source
- ✅ REST API completa
- ✅ Suporta múltiplas instâncias
- ✅ Suporta envio de mídia
- ✅ Webhook para receber mensagens
- ✅ Dashboard web incluso

### Como usar:

1. **Opção 1: Hospedar você mesmo (Docker)**
   ```bash
   docker run -d \
     --name evolution-api \
     -p 8080:8080 \
     -e AUTHENTICATION_API_KEY=SUA_CHAVE_AQUI \
     atendai/evolution-api:latest
   ```

2. **Opção 2: Usar serviço hospedado**
   - Alguns serviços oferecem hospedagem gratuita/barata
   - Pesquise por "Evolution API hosting" ou "Evolution API cloud"

### Configuração no sistema:

- **URL da API:** `http://seu-servidor:8080` (ou URL do serviço hospedado)
- **Token:** Sua chave de autenticação (AUTHENTICATION_API_KEY)
- **ID da Instância:** Nome da instância criada (ex: `minha-instancia`)

### Criar instância:

1. Acesse o dashboard: `http://seu-servidor:8080`
2. Crie uma nova instância
3. Escaneie o QR Code com seu WhatsApp
4. Use o nome da instância no campo "ID da Instância"

---

## 🟡 Baileys (Biblioteca)

**Status:** ✅ Gratuita e Open Source  
**Tipo:** Biblioteca JavaScript/TypeScript  
**Documentação:** https://baileys.wiki  
**GitHub:** https://github.com/WhiskeySockets/Baileys

### Características:
- ✅ Totalmente gratuita
- ✅ Open source
- ✅ Conecta via WhatsApp Web
- ⚠️ Requer implementação própria
- ⚠️ Não é uma API REST pronta

### Projetos baseados em Baileys:

1. **Baileys API** (fazer-ai)
   - GitHub: https://github.com/fazer-ai/baileys-api
   - API REST pronta para usar

2. **Super-Light Web WhatsApp API Server**
   - GitHub: https://github.com/Alucard0x1/Super-Light-Web-WhatsApp-API-Server
   - Dashboard web incluso

---

## 🔴 WhatsApp Business API (Oficial)

**Status:** ⚠️ Parcialmente gratuita  
**Tipo:** API oficial do WhatsApp  
**Documentação:** https://developers.facebook.com/docs/whatsapp

### Características:
- ✅ API oficial e estável
- ✅ Suportada pelo WhatsApp
- ⚠️ Requer aprovação do WhatsApp
- ⚠️ Janela gratuita de 24h apenas para respostas
- ⚠️ Mensagens fora da janela são cobradas

### Janela Gratuita:
- **24 horas:** Após cliente iniciar conversa, você pode responder gratuitamente
- **72 horas:** Se cliente clicar em anúncio Click-to-WhatsApp

---

## 📋 Comparação Rápida

| API | Gratuita? | Fácil de usar? | Estável? | Recomendada? |
|-----|-----------|-----------------|----------|--------------|
| Evolution API | ✅ Sim | ✅ Sim | ✅ Sim | ⭐⭐⭐⭐⭐ |
| Baileys | ✅ Sim | ⚠️ Média | ⚠️ Média | ⭐⭐⭐ |
| WhatsApp Business API | ⚠️ Parcial | ✅ Sim | ✅ Sim | ⭐⭐⭐⭐ |

---

## 🚀 Recomendação

**Para começar rapidamente:** Use **Evolution API**

1. É totalmente gratuita
2. Tem documentação completa
3. É fácil de configurar
4. Tem dashboard web
5. Suporta múltiplas instâncias

### Passos para configurar Evolution API:

1. **Instalar (Docker):**
   ```bash
   docker run -d \
     --name evolution-api \
     -p 8080:8080 \
     -e AUTHENTICATION_API_KEY=minha-chave-secreta \
     atendai/evolution-api:latest
   ```

2. **Acessar dashboard:**
   - Abra: `http://localhost:8080`
   - Ou use o IP do seu servidor

3. **Criar instância:**
   - Clique em "Criar Instância"
   - Escaneie o QR Code com seu WhatsApp
   - Anote o nome da instância

4. **Configurar no sistema:**
   - Vá em Configurações → Mensagens Automáticas
   - Ative "Enviar Mensagens Automaticamente"
   - URL: `http://seu-servidor:8080`
   - Token: `minha-chave-secreta`
   - Instância: `nome-da-instancia`

---

## ⚠️ Avisos Importantes

1. **Termos de Serviço:** APIs não oficiais podem violar os termos do WhatsApp. Use por sua conta e risco.

2. **Banimento:** Contas podem ser banidas se detectarem uso de bots não autorizados.

3. **Backup:** Sempre tenha backup das suas conversas e dados.

4. **Produção:** Para uso em produção, considere usar a API oficial do WhatsApp Business.

---

## 📚 Links Úteis

- Evolution API Docs: https://doc.evolution-api.com
- Baileys Wiki: https://baileys.wiki
- WhatsApp Business API: https://developers.facebook.com/docs/whatsapp
- Evolution API GitHub: https://github.com/EvolutionAPI/evolution-api
