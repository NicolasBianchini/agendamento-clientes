# 🔥 Tutorial Completo: Configuração do Firebase

Este tutorial guia você através de todos os passos necessários para configurar o Firebase no projeto AgendaPro, incluindo variáveis de ambiente, Firestore Database, regras de segurança e índices.

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Criar Projeto no Firebase](#criar-projeto-no-firebase)
3. [Configurar Variáveis de Ambiente (.env)](#configurar-variáveis-de-ambiente-env)
4. [Configurar Firestore Database](#configurar-firestore-database)
5. [Configurar Regras de Segurança](#configurar-regras-de-segurança)
6. [Configurar Índices](#configurar-índices)
7. [Verificar Configuração](#verificar-configuração)
8. [Troubleshooting](#troubleshooting)

---

## ✅ Pré-requisitos

Antes de começar, você precisa ter:

- ✅ Conta no Google (para acessar Firebase Console)
- ✅ Node.js instalado (versão 16 ou superior)
- ✅ NPM ou Yarn instalado
- ✅ Acesso ao projeto no GitHub/Repositório

---

## 🚀 Criar Projeto no Firebase

### Passo 1: Acessar Firebase Console

1. Acesse: https://console.firebase.google.com/
2. Faça login com sua conta Google
3. Clique em **"Adicionar projeto"** ou **"Create a project"**

### Passo 2: Configurar Projeto

1. **Nome do projeto:** Digite um nome (ex: `agendamentos-clientes`)
2. **Google Analytics:** Opcional (pode desabilitar para começar)
3. Clique em **"Criar projeto"** (Create project)
4. Aguarde a criação (pode levar alguns segundos)

### Passo 3: Obter Credenciais

Após criar o projeto:

1. No painel do Firebase, clique no ícone de **⚙️ Configurações** (Settings)
2. Selecione **"Configurações do projeto"** (Project settings)
3. Role até a seção **"Seus aplicativos"** (Your apps)
4. Clique no ícone **`</>`** (Web) para adicionar um app web
5. **Nome do app:** Digite um nome (ex: `AgendaPro Web`)
6. **Registrar app:** Clique em **"Registrar app"**
7. **Copie as credenciais** que aparecem na tela (você precisará delas)

Você verá algo assim:

```javascript
const firebaseConfig = {
  apiKey: "sua-api-key-aqui",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

**⚠️ IMPORTANTE:** Anote essas informações, você precisará delas no próximo passo!

---

## 🔐 Configurar Variáveis de Ambiente (.env)

### Passo 1: Criar Arquivo .env

Na raiz do projeto, crie um arquivo chamado `.env`:

```bash
# Na raiz do projeto
touch .env
```

### Passo 2: Adicionar Variáveis

Abra o arquivo `.env` e adicione as seguintes variáveis com os valores que você copiou do Firebase:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=sua-api-key-aqui
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456
```

**⚠️ IMPORTANTE:**
- Substitua os valores pelos valores reais do seu projeto
- O prefixo `VITE_` é necessário para que o Vite exponha essas variáveis
- **NUNCA** commite o arquivo `.env` no Git (ele já está no `.gitignore`)

### Passo 3: Verificar Arquivo de Configuração

O arquivo `src/config/firebase.ts` já está configurado para usar essas variáveis:

```typescript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "valor-padrão",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "valor-padrão",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "valor-padrão",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "valor-padrão",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "valor-padrão",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "valor-padrão"
};
```

Se as variáveis não estiverem definidas, ele usará valores padrão (apenas para desenvolvimento).

---

## 🗄️ Configurar Firestore Database

### Passo 1: Criar Banco de Dados

1. No Firebase Console, vá em **"Firestore Database"** no menu lateral
2. Clique em **"Criar banco de dados"** (Create database)
3. Escolha o modo:
   - **Modo de produção:** Regras mais restritivas (recomendado para produção)
   - **Modo de teste:** Regras permissivas por 30 dias (recomendado para desenvolvimento)
4. Escolha a **localização** do banco de dados (ex: `southamerica-east1` para Brasil)
5. Clique em **"Ativar"** (Enable)

### Passo 2: Estrutura das Coleções

O sistema usa as seguintes coleções no Firestore:

| Coleção | Descrição | Filtro |
|---------|-----------|--------|
| `usuarios` | Usuários do sistema | - |
| `clientes` | Clientes cadastrados | Por `userId` |
| `servicos` | Serviços oferecidos | Por `userId` |
| `agendamentos` | Agendamentos realizados | Por `userId` |
| `configuracoes` | Configurações do usuário | Por `userId` |

**Nota:** As coleções são criadas automaticamente quando você cria o primeiro documento. Não é necessário criá-las manualmente.

### Passo 3: Criar Primeiro Usuário (Opcional)

Para testar, você pode criar um usuário manualmente:

1. No Firestore, clique em **"Iniciar coleção"** (Start collection)
2. **ID da coleção:** `usuarios`
3. **ID do documento:** Deixe em branco (será gerado automaticamente)
4. Adicione os campos:
   - `email` (string): `admin@exemplo.com`
   - `senha` (string): Hash da senha (use SHA-256)
   - `nome` (string): `Administrador`
   - `role` (string): `master`
   - `ativo` (boolean): `true`
5. Clique em **"Salvar"**

---

## 🔒 Configurar Regras de Segurança

### Passo 1: Acessar Regras

1. No Firebase Console, vá em **"Firestore Database"**
2. Clique na aba **"Regras"** (Rules)

### Passo 2: Configurar Regras

O projeto já possui um arquivo `firestore.rules` na raiz com as regras configuradas. Você pode:

**Opção A: Copiar do Arquivo (Recomendado)**

1. Abra o arquivo `firestore.rules` na raiz do projeto
2. Copie todo o conteúdo
3. Cole no editor de regras do Firebase Console
4. Clique em **"Publicar"** (Publish)

**Opção B: Usar Firebase CLI**

```bash
# Instalar Firebase CLI (se ainda não tiver)
npm install -g firebase-tools

# Fazer login
firebase login

# Inicializar projeto (se ainda não fez)
firebase init firestore

# Fazer deploy das regras
firebase deploy --only firestore:rules
```

### Regras Atuais do Sistema

As regras atuais são específicas para o sistema de autenticação customizada:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Regras para a coleção de usuários
    match /usuarios/{userId} {
      // Permitir leitura e escrita para todos (apenas para desenvolvimento)
      // ATENÇÃO: Em produção, você deve implementar autenticação adequada
      allow read, write: if true;
    }
    
    // Regras para a coleção de clientes
    // NOTA: Como o sistema usa autenticação customizada, a separação por usuário
    // é garantida pelo código (firestore.ts). As regras aqui garantem que:
    // 1. O userId deve estar presente ao criar
    // 2. O userId não pode ser alterado após a criação
    match /clientes/{clienteId} {
      allow read: if true; // O código filtra por userId
      allow create: if request.resource.data.keys().hasAll(['userId']) 
                    && request.resource.data.userId is string;
      allow update: if !request.resource.data.diff(resource.data).affectedKeys().hasAny(['userId']);
      allow delete: if true; // O código verifica userId antes de deletar
    }
    
    // Regras para a coleção de serviços
    match /servicos/{servicoId} {
      allow read: if true; // O código filtra por userId
      allow create: if request.resource.data.keys().hasAll(['userId']) 
                    && request.resource.data.userId is string;
      allow update: if !request.resource.data.diff(resource.data).affectedKeys().hasAny(['userId']);
      allow delete: if true; // O código verifica userId antes de deletar
    }
    
    // Regras para a coleção de agendamentos
    match /agendamentos/{agendamentoId} {
      allow read: if true; // O código filtra por userId
      allow create: if request.resource.data.keys().hasAll(['userId']) 
                    && request.resource.data.userId is string;
      allow update: if !request.resource.data.diff(resource.data).affectedKeys().hasAny(['userId']);
      allow delete: if true; // O código verifica userId antes de deletar
    }

    // Regras para a coleção de configurações
    // Cada usuário pode ter apenas uma configuração (criada/atualizada automaticamente)
    match /configuracoes/{configId} {
      allow read: if true; // O código filtra por userId
      allow create: if request.resource.data.keys().hasAll(['userId']) 
                    && request.resource.data.userId is string;
      allow update: if !request.resource.data.diff(resource.data).affectedKeys().hasAny(['userId']);
      allow delete: if true; // O código verifica userId antes de deletar
    }
  }
}
```

### ⚠️ Regras para Produção

As regras atuais são permissivas para desenvolvimento. Para produção, considere:

1. **Implementar autenticação Firebase Auth** e usar `request.auth.uid`
2. **Restringir acesso** baseado no `userId` do documento
3. **Adicionar validações** mais rigorosas
4. **Implementar rate limiting** para prevenir abusos

**Exemplo de regras mais seguras (requer Firebase Auth):**

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Usuários - apenas leitura própria
    match /usuarios/{userId} {
      allow read: if isOwner(userId);
      allow write: if false; // Criar usuários apenas via script/admin
    }
    
    // Clientes - apenas o dono pode acessar
    match /clientes/{clienteId} {
      allow read, write: if isAuthenticated() 
                         && resource.data.userId == request.auth.uid;
    }
    
    // Serviços - apenas o dono pode acessar
    match /servicos/{servicoId} {
      allow read, write: if isAuthenticated() 
                         && resource.data.userId == request.auth.uid;
    }
    
    // Agendamentos - apenas o dono pode acessar
    match /agendamentos/{agendamentoId} {
      allow read, write: if isAuthenticated() 
                         && resource.data.userId == request.auth.uid;
    }
    
    // Configurações - apenas o dono pode acessar
    match /configuracoes/{configId} {
      allow read, write: if isAuthenticated() 
                         && resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## 📊 Configurar Índices

### Passo 1: Acessar Índices

1. No Firebase Console, vá em **"Firestore Database"**
2. Clique na aba **"Índices"** (Indexes)

### Passo 2: Configurar Índices

O projeto já possui um arquivo `firestore.indexes.json` na raiz com os índices necessários. Você pode:

**Opção A: Usar Firebase CLI (Recomendado)**

```bash
# Fazer deploy dos índices
firebase deploy --only firestore:indexes
```

**Opção B: Criar Manualmente**

Se preferir criar manualmente, o Firebase mostrará links quando você executar queries que precisam de índices. Basta clicar nos links e criar os índices.

### Índices Necessários

O arquivo `firestore.indexes.json` contém os seguintes índices:

1. **clientes** - Por `userId` e `nome`
2. **servicos** - Por `userId`, `ativo` e `nome`
3. **agendamentos** - Por `userId` e `data` (ascendente e descendente)
4. **agendamentos** - Por `userId`, `clienteId`, `data` e `horario`

Esses índices são necessários para as queries do sistema funcionarem corretamente.

---

## ✅ Verificar Configuração

### Passo 1: Testar Conexão

1. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

2. Acesse a aplicação no navegador
3. Tente fazer login (se já tiver um usuário criado)
4. Verifique o console do navegador para erros

### Passo 2: Verificar Firestore

1. No Firebase Console, vá em **"Firestore Database"**
2. Verifique se as coleções estão sendo criadas quando você usa o sistema
3. Verifique se os dados estão sendo salvos corretamente

### Passo 3: Verificar Regras

1. Tente criar, ler, atualizar e deletar dados
2. Se receber erro de permissão, verifique as regras do Firestore
3. Verifique os logs no Firebase Console em **"Regras"** → **"Monitoramento"**

---

## 🔧 Troubleshooting

### Erro: "Missing or insufficient permissions"

**Causa:** As regras do Firestore estão bloqueando a operação.

**Solução:**
1. Verifique se as regras foram publicadas corretamente
2. Verifique se o arquivo `firestore.rules` está correto
3. Aguarde alguns minutos após publicar (pode levar tempo para propagar)

### Erro: "The query requires an index"

**Causa:** A query precisa de um índice que não existe.

**Solução:**
1. Clique no link de erro que aparece no console
2. Ou faça deploy dos índices: `firebase deploy --only firestore:indexes`
3. Aguarde a criação do índice (pode levar alguns minutos)

### Erro: "Firebase: Error (auth/network-request-failed)"

**Causa:** Problema de conexão ou credenciais incorretas.

**Solução:**
1. Verifique sua conexão com a internet
2. Verifique se as variáveis de ambiente estão corretas no `.env`
3. Verifique se o arquivo `.env` está na raiz do projeto
4. Reinicie o servidor de desenvolvimento após alterar `.env`

### Erro: "Firebase App named '[DEFAULT]' already exists"

**Causa:** Firebase já foi inicializado.

**Solução:**
1. Este erro geralmente não é crítico
2. Verifique se o Firebase está funcionando mesmo com o erro
3. Se necessário, limpe o cache: `npm run build -- --force`

### Variáveis de Ambiente Não Funcionam

**Causa:** Variáveis não estão sendo carregadas.

**Solução:**
1. Verifique se o arquivo está nomeado exatamente `.env` (não `.env.local` ou `.env.development`)
2. Verifique se as variáveis começam com `VITE_`
3. Reinicie o servidor de desenvolvimento após alterar `.env`
4. Limpe o cache: `rm -rf node_modules/.vite`

---

## 📚 Recursos Adicionais

### Documentação Oficial

- **Firebase Console:** https://console.firebase.google.com/
- **Documentação Firestore:** https://firebase.google.com/docs/firestore
- **Regras de Segurança:** https://firebase.google.com/docs/firestore/security/get-started
- **Índices:** https://firebase.google.com/docs/firestore/query-data/indexing

### Comandos Úteis

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Fazer login
firebase login

# Inicializar projeto
firebase init

# Deploy apenas das regras
firebase deploy --only firestore:rules

# Deploy apenas dos índices
firebase deploy --only firestore:indexes

# Deploy de tudo
firebase deploy
```

---

## ✅ Checklist de Configuração

Use este checklist para garantir que tudo está configurado:

- [ ] Projeto criado no Firebase Console
- [ ] Credenciais do Firebase copiadas
- [ ] Arquivo `.env` criado na raiz do projeto
- [ ] Todas as variáveis de ambiente preenchidas no `.env`
- [ ] Firestore Database criado e ativado
- [ ] Regras de segurança configuradas e publicadas
- [ ] Índices configurados e criados
- [ ] Servidor de desenvolvimento iniciado sem erros
- [ ] Conexão com Firebase testada e funcionando
- [ ] Primeiro usuário criado (opcional)

---

## 🎉 Pronto!

Após seguir todos os passos, seu Firebase está configurado e pronto para uso!

**Próximos passos:**
1. Criar seu primeiro usuário no sistema
2. Começar a usar a aplicação
3. Configurar mensagens automáticas (opcional)

---

**Última atualização:** Dezembro 2024  
**Versão do Firebase:** v9+ (modular SDK)
