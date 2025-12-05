# 📱 Guia Completo: Como Configurar Wawp

Este guia vai te ajudar a configurar o Wawp passo a passo para enviar mensagens automáticas do WhatsApp.

---

## 📋 Passo 1: Criar Conta no Wawp

1. **Acesse o site do Wawp:**
   - Vá para: https://wawp.net
   - Ou acesse diretamente: https://wawp.net/whatsapp-api/

2. **Criar sua conta:**
   - Clique em **"Sign Up"** ou **"Criar Conta"** ou **"Get Started"**
   - Preencha seus dados:
     - Nome
     - E-mail
     - Senha
   - ✅ **Não precisa de cartão de crédito!**

3. **Confirmar e-mail (se necessário):**
   - Verifique sua caixa de entrada
   - Clique no link de confirmação

---

## 📱 Passo 2: Conectar seu WhatsApp

1. **Após criar a conta, você verá um QR Code:**
   - O QR Code aparece na tela do dashboard do Wawp
   - Se não aparecer, procure por "Connect WhatsApp" ou "Conectar WhatsApp"

2. **Abrir WhatsApp no celular:**
   - Abra o aplicativo WhatsApp no seu celular
   - Vá em **Configurações** (ícone de engrenagem)
   - Toque em **"Aparelhos conectados"** ou **"Dispositivos vinculados"**
   - Toque em **"Conectar um aparelho"**

3. **Escanear o QR Code:**
   - Aponte a câmera do celular para o QR Code na tela do Wawp
   - Aguarde a conexão (pode levar alguns segundos)
   - ✅ Quando conectar, você verá uma mensagem de sucesso

---

## 🔑 Passo 3: Obter sua API Key

1. **Acessar a área de API:**
   - No dashboard do Wawp, procure por:
     - **"API"** ou **"API Settings"**
     - **"Configurações"** ou **"Settings"**
     - **"Developer"** ou **"Desenvolvedor"**
   - Geralmente fica no menu lateral ou no topo

2. **Encontrar suas credenciais:**
   - Procure por **"API"** ou **"Developer"** no menu
   - Você precisa de duas informações:
     - **Access Token** (Token de acesso)
     - **Instance ID** (ID da instância)
   - ⚠️ **IMPORTANTE:** Copie ambas e guarde em local seguro!

3. **Copiar as credenciais:**
   - **Access Token:** Selecione e copie (Ctrl+C ou Cmd+C)
   - **Instance ID:** Selecione e copie também
   - Cole ambas em um bloco de notas temporário para não perder

---

## ⚙️ Passo 4: Configurar no Sistema

1. **Acessar Configurações:**
   - No seu sistema de agendamento, vá em **Configurações**
   - Role até a seção **"Mensagens Automáticas"**

2. **Ativar mensagens automáticas:**
   - Marque a checkbox **"Enviar Mensagens Automaticamente"**
   - Os campos de configuração vão aparecer abaixo

3. **Preencher os campos:**

   **a) URL da API:**
   ```
   https://api.wawp.net/v1
   ```
   - Cole exatamente essa URL no campo "URL da API"
   - Ou deixe vazio (o sistema detecta automaticamente)

   **b) Token de Autenticação:**
   - Cole o **Access Token** que você copiou do Wawp
   - ⚠️ Certifique-se de copiar o token completo!
   - Encontre em: Dashboard → API → Access Token

   **c) ID da Instância:**
   - Cole o **Instance ID** do Wawp
   - Encontre em: Dashboard → API → Instance ID
   - ⚠️ É necessário para o Wawp funcionar!

4. **Salvar configurações:**
   - Clique em **"Salvar Configurações"** ou **"Salvar Alterações"**
   - Aguarde a confirmação de salvamento

---

## ✅ Passo 5: Testar a Configuração

1. **Criar um agendamento de teste:**
   - Vá em **Agenda** ou **Novo Agendamento**
   - Crie um agendamento com um cliente que tenha WhatsApp cadastrado
   - Preencha todos os dados e salve

2. **Verificar se a mensagem foi enviada:**
   - A mensagem deve ser enviada automaticamente
   - Verifique o WhatsApp do cliente
   - Se não enviar, verifique o console do navegador (F12) para ver erros

3. **Verificar logs:**
   - No Wawp, você pode ver o histórico de mensagens enviadas
   - Isso ajuda a debugar se algo não funcionar

---

## 🔧 Solução de Problemas

### ❌ Mensagem não está sendo enviada

**Verifique:**

1. **API Key está correta?**
   - Copie novamente do Wawp
   - Certifique-se de não ter espaços antes ou depois

2. **URL está correta?**
   - Deve ser exatamente: `https://api.wawp.net/v1`
   - Sem barra no final
   - Sem espaços

3. **WhatsApp está conectado?**
   - Volte ao Wawp e verifique se o WhatsApp ainda está conectado
   - Se não estiver, escaneie o QR Code novamente

4. **Telefone do cliente está correto?**
   - O telefone deve estar no formato: DDD + número
   - Exemplo: 11987654321 (sem parênteses, traços ou espaços)

5. **Console do navegador:**
   - Pressione F12 no navegador
   - Vá na aba "Console"
   - Procure por erros em vermelho
   - Copie os erros e verifique

### ❌ Erro 401 (Não autorizado)

- **Causa:** API Key incorreta ou expirada
- **Solução:** 
  - Gere uma nova API Key no Wawp
  - Cole novamente no sistema

### ❌ Erro 404 (Não encontrado)

- **Causa:** URL da API incorreta
- **Solução:**
  - Verifique se a URL é: `https://api.wawp.net/v1`
  - Sem barra no final

### ❌ WhatsApp desconectado

- **Causa:** WhatsApp foi desconectado do Wawp
- **Solução:**
  - Acesse o Wawp novamente
  - Escaneie o QR Code novamente
  - Aguarde a reconexão

---

## 📊 Limites do Plano Gratuito

- ✅ **250 mensagens por mês**
- ✅ **Sem cartão de crédito**
- ✅ **API completa**
- ✅ **Suporte básico**

Se precisar de mais mensagens, o Wawp oferece planos pagos.

---

## 🎯 Resumo Rápido

1. ✅ Criar conta em https://wawp.net
2. ✅ Conectar WhatsApp (escanear QR Code)
3. ✅ Copiar API Key
4. ✅ Configurar no sistema:
   - URL: `https://api.wawp.net/v1`
   - Token: sua API Key
   - Instância: deixar vazio
5. ✅ Testar criando um agendamento

---

## 📞 Precisa de Ajuda?

- **Documentação do Wawp:** https://wawp.net/docs
- **Suporte do Wawp:** Entre em contato pelo site
- **Verifique o console do navegador** (F12) para ver erros detalhados

---

## ✨ Dicas Importantes

1. **Guarde sua API Key em local seguro**
   - Não compartilhe com ninguém
   - Se suspeitar que foi comprometida, gere uma nova

2. **WhatsApp precisa estar conectado**
   - Se o WhatsApp desconectar, você precisa escanear o QR Code novamente
   - Mantenha o celular com WhatsApp ativo

3. **Teste sempre antes de usar em produção**
   - Crie um agendamento de teste
   - Verifique se a mensagem chegou corretamente

4. **Monitore o uso**
   - O plano gratuito tem limite de 250 mensagens/mês
   - Acompanhe no dashboard do Wawp

---

**Pronto! Agora você está configurado para enviar mensagens automáticas! 🎉**
