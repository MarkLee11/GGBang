import React from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { type ToastNotification } from '../hooks/useNotifications'

interface ToastNotificationsProps {
  toasts: ToastNotification[]
  onRemove: (id: string) => void
}

export const ToastNotifications: React.FC<ToastNotificationsProps> = ({
  toasts,
  onRemove
}) => {
  if (toasts.length === 0) return null

  const getToastIcon = (type: ToastNotification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-400" />
      case 'error':
        return <XCircle size={20} className="text-red-400" />
      case 'warning':
        return <AlertCircle size={20} className="text-yellow-400" />
      case 'info':
      default:
        return <Info size={20} className="text-blue-400" />
    }
  }

  const getToastStyles = (type: ToastNotification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-900/90 border-green-500/30 text-green-100'
      case 'error':
        return 'bg-red-900/90 border-red-500/30 text-red-100'
      case 'warning':
        return 'bg-yellow-900/90 border-yellow-500/30 text-yellow-100'
      case 'info':
      default:
        return 'bg-blue-900/90 border-blue-500/30 text-blue-100'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          icon={getToastIcon(toast.type)}
          styles={getToastStyles(toast.type)}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: ToastNotification
  icon: React.ReactNode
  styles: string
  onRemove: (id: string) => void
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, icon, styles, onRemove }) => {
  const [isVisible, setIsVisible] = React.useState(false)
  const [isExiting, setIsExiting] = React.useState(false)

  React.useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const handleRemove = () => {
    setIsExiting(true)
    setTimeout(() => onRemove(toast.id), 200)
  }

  React.useEffect(() => {
    // Auto-remove timer
    const timer = setTimeout(() => {
      handleRemove()
    }, toast.duration)

    return () => clearTimeout(timer)
  }, [toast.duration, toast.id])

  return (
    <div
      className={`
        transform transition-all duration-200 ease-in-out
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${styles}
        border rounded-lg p-4 shadow-lg backdrop-blur-sm
        max-w-sm
      `}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-5">
            {toast.message}
          </p>
        </div>
        
        <button
          onClick={handleRemove}
          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      
      {/* Progress bar */}
      <div className="mt-2 h-1 bg-black/20 rounded-full overflow-hidden">
        <div 
          className="h-full bg-white/30 rounded-full transition-all ease-linear"
          style={{
            animation: `shrink ${toast.duration}ms linear`,
            width: '100%'
          }}
        />
      </div>
      
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}

export default ToastNotifications
