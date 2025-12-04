import './LoadingSpinner.css'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  message?: string
  overlay?: boolean
}

function LoadingSpinner({ size = 'medium', message, overlay = false }: LoadingSpinnerProps) {
  const sizeClass = `spinner-${size}`
  
  if (overlay) {
    return (
      <div className="spinner-overlay">
        <div className={`spinner ${sizeClass}`}></div>
        {message && <p className="spinner-message">{message}</p>}
      </div>
    )
  }

  return (
    <div className="spinner-container">
      <div className={`spinner ${sizeClass}`}></div>
      {message && <p className="spinner-message">{message}</p>}
    </div>
  )
}

export default LoadingSpinner

