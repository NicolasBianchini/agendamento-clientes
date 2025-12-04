# Scripts de Utilidade

## create-user.ts

Script para criar um usuário diretamente no banco de dados Firestore.

### Como usar:

1. Certifique-se de que o arquivo `.env` está configurado com as credenciais do Firebase (ou use os valores padrão)

2. Execute o script:
```bash
npm run create-user
```

3. O script irá solicitar:
   - Nome completo
   - Email
   - Senha (mínimo 6 caracteres)
   - Confirmação de senha

4. O usuário será criado na coleção `usuarios` do Firestore com:
   - `nome`: Nome completo do usuário
   - `email`: Email (convertido para minúsculas)
   - `senhaHash`: Hash SHA-256 da senha
   - `ativo`: true
   - `dataCriacao`: Data/hora de criação
   - `ultimoAcesso`: null

### Estrutura do documento no Firestore:

```json
{
  "nome": "Nome Completo",
  "email": "usuario@email.com",
  "senhaHash": "hash_sha256_da_senha",
  "ativo": true,
  "dataCriacao": "2024-01-20T10:30:00.000Z",
  "ultimoAcesso": null
}
```

### Validações:

- Nome é obrigatório
- Email deve ter formato válido
- Email não pode estar duplicado
- Senha deve ter no mínimo 6 caracteres
- Senha e confirmação devem coincidir

### Nota de Segurança:

A senha é armazenada como hash SHA-256. Para maior segurança em produção, considere usar bcrypt ou similar.

