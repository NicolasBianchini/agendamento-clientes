import './StatusBadge.css'

export type StatusType = 'agendado' | 'concluido' | 'cancelado' | 'ativo' | 'inativo'

interface StatusBadgeProps {
  status: StatusType
  label?: string
}

function StatusBadge({ status, label }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'agendado':
        return {
          label: label || 'Agendado',
          class: 'status-agendado',
        }
      case 'concluido':
        return {
          label: label || 'Concluído',
          class: 'status-concluido',
        }
      case 'cancelado':
        return {
          label: label || 'Cancelado',
          class: 'status-cancelado',
        }
      case 'ativo':
        return {
          label: label || 'Ativo',
          class: 'status-ativo',
        }
      case 'inativo':
        return {
          label: label || 'Inativo',
          class: 'status-inativo',
        }
      default:
        return {
          label: label || 'Desconhecido',
          class: 'status-agendado',
        }
    }
  }

  const config = getStatusConfig()

  return (
    <span className={`status-badge ${config.class}`}>
      {config.label}
    </span>
  )
}

export default StatusBadge

