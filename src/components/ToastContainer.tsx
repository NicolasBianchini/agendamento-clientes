import { useState, useCallback } from 'react'
import Toast, { type ToastType } from './Toast'
import './ToastContainer.css'

interface ToastItem {
  id: string
  message: string
  type: ToastType
  duration?: number
}

let toastIdCounter = 0

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
    const id = `toast-${++toastIdCounter}`
    const newToast: ToastItem = { id, message, type, duration }

    setToasts((prev) => [...prev, newToast])

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return { toasts, showToast, removeToast }
}

interface ToastContainerProps {
  toasts: ToastItem[]
  onClose: (id: string) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top' | 'bottom'
}

function ToastContainer({ toasts, onClose, position = 'top-right' }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className={`toast-container toast-container-${position}`}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={onClose}
        />
      ))}
    </div>
  )
}

export default ToastContainer

