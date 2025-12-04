import './EmptyState.css'

interface EmptyStateProps {
  icon?: JSX.Element
  title: string
  message?: string
  actionLabel?: string
  onAction?: () => void
}

function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  const defaultIcon = (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
  )

  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {icon || defaultIcon}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {message && <p className="empty-state-message">{message}</p>}
      {actionLabel && onAction && (
        <button className="empty-state-action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default EmptyState

