type AppointmentNotificationPayload = {
  agendamentoId: string
  tipo: 'confirmacao' | 'lembrete' | 'cancelamento'
  clienteNome: string
  clienteTelefone: string
  clienteEmail?: string | null
  servicoNome: string
  profissionalNome?: string | null
  estabelecimentoNome?: string | null
  data: string
  horario: string
  mensagem: string
}

export async function handleAppointmentNotification(
  payload: AppointmentNotificationPayload
): Promise<{ ok: boolean; message: string }> {
  if (!payload.agendamentoId || !payload.clienteTelefone || !payload.mensagem) {
    return {
      ok: false,
      message: 'Payload incompleto para notificacao.',
    }
  }

  // Stub intencional: o frontend envia apenas payload pronto.
  // Aqui entraria a integracao real com WhatsApp Business API ou outro provedor.
  return {
    ok: true,
    message: `Notificacao ${payload.tipo} preparada para ${payload.clienteTelefone}.`,
  }
}
