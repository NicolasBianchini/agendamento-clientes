## Funcoes seguras

Esta pasta deixa preparada a camada de backend para notificacoes e integracoes externas.

Objetivo:
- receber um payload de agendamento
- aplicar template de WhatsApp no backend
- disparar integracoes externas sem expor token no frontend
- centralizar futuras integracoes com Google Calendar

Arquivo inicial:
- `appointment-notifications.ts`

Campos sugeridos de ambiente:
- `WHATSAPP_API_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
