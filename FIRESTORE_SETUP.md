# Configuração do Firestore

## Problema: Missing or insufficient permissions

Este erro ocorre porque as regras de segurança do Firestore estão bloqueando as operações. Siga os passos abaixo para configurar.

## Opção 1: Configurar via Console do Firebase (Recomendado)

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Selecione seu projeto: `agendamentos-clientes-7d7bd`
3. No menu lateral, vá em **Firestore Database**
4. Clique na aba **Regras** (Rules)
5. Cole o conteúdo do arquivo `firestore.rules` que está na raiz do projeto
6. Clique em **Publicar** (Publish)

### Regras para Desenvolvimento (Permissivas)

As regras no arquivo `firestore.rules` permitem leitura e escrita para todas as coleções. Isso é adequado para desenvolvimento, mas **NÃO deve ser usado em produção**.

### Regras para Produção (Recomendado)

Para produção, você deve implementar autenticação e regras mais restritivas. Exemplo:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Função auxiliar para verificar se o usuário está autenticado
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Usuários - apenas leitura própria
    match /usuarios/{userId} {
      allow read: if isAuthenticated() && request.auth.uid == userId;
      allow write: if false; // Criar usuários apenas via script/admin
    }
    
    // Clientes - leitura e escrita para usuários autenticados
    match /clientes/{clienteId} {
      allow read, write: if isAuthenticated();
    }
    
    // Serviços - leitura e escrita para usuários autenticados
    match /servicos/{servicoId} {
      allow read, write: if isAuthenticated();
    }
    
    // Agendamentos - leitura e escrita para usuários autenticados
    match /agendamentos/{agendamentoId} {
      allow read, write: if isAuthenticated();
    }
  }
}
```

## Opção 2: Configurar via Firebase CLI

Se você tem o Firebase CLI instalado:

1. Instale o Firebase CLI (se ainda não tiver):
```bash
npm install -g firebase-tools
```

2. Faça login:
```bash
firebase login
```

3. Inicialize o projeto (se ainda não fez):
```bash
firebase init firestore
```

4. Selecione seu projeto quando solicitado

5. As regras do arquivo `firestore.rules` serão aplicadas automaticamente

6. Para fazer deploy das regras:
```bash
firebase deploy --only firestore:rules
```

## Verificar se está funcionando

Após configurar as regras, execute novamente:

```bash
npm run create-user
```

## Estrutura das Coleções

O Firestore deve ter as seguintes coleções:

- `usuarios` - Usuários do sistema
- `clientes` - Clientes cadastrados
- `servicos` - Serviços oferecidos
- `agendamentos` - Agendamentos realizados

## Notas Importantes

⚠️ **ATENÇÃO**: As regras de desenvolvimento (`allow read, write: if true`) são muito permissivas e devem ser alteradas antes de colocar em produção.

🔒 **SEGURANÇA**: Em produção, sempre implemente:
- Autenticação adequada
- Regras de segurança restritivas
- Validação de dados
- Rate limiting

