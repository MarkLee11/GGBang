import React from 'react'
import { Clock, CheckCircle, XCircle, Users, Undo2 } from 'lucide-react'
import { UserEventStatus } from '../hooks/useUserEventStatus'

interface UserStatusBadgeProps {
  status: UserEventStatus
  className?: string
}

export const UserStatusBadge: React.FC<UserStatusBadgeProps> = ({ status, className = '' }) => {
  const getStatusConfig = (status: UserEventStatus) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          text: 'Request Pending',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/40',
          textColor: 'text-yellow-300',
          iconColor: 'text-yellow-400'
        }
      case 'approved':
        return {
          icon: CheckCircle,
          text: 'Request Approved',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/40',
          textColor: 'text-green-300',
          iconColor: 'text-green-400'
        }
      case 'rejected':
        return {
          icon: XCircle,
          text: 'Request Rejected',
          bgColor: 'bg-red-500/20',
          borderColor: 'border-red-500/40',
          textColor: 'text-red-300',
          iconColor: 'text-red-400'
        }
      case 'attending':
        return {
          icon: Users,
          text: 'Attending',
          bgColor: 'bg-blue-500/20',
          borderColor: 'border-blue-500/40',
          textColor: 'text-blue-300',
          iconColor: 'text-blue-400'
        }
      default:
        return null
    }
  }

  const config = getStatusConfig(status)
  
  if (!config || status === 'none') {
    return null
  }

  const Icon = config.icon

  return (
    <div className={`
      inline-flex items-center space-x-2 px-3 py-2 rounded-full border text-sm font-medium
      ${config.bgColor} ${config.borderColor} ${config.textColor} ${className}
    `}>
      <Icon size={16} className={config.iconColor} />
      <span>{config.text}</span>
    </div>
  )
}

interface JoinButtonProps {
  status: UserEventStatus
  onRequestClick: () => void
  onLoginClick: () => void
  onWithdrawClick?: () => void
  isAuthenticated: boolean
  disabled?: boolean
  className?: string
  requestId?: number
}

export const JoinButton: React.FC<JoinButtonProps> = ({
  status,
  onRequestClick,
  onLoginClick,
  onWithdrawClick,
  isAuthenticated,
  disabled = false,
  className = '',
  requestId
}) => {
  const getButtonConfig = () => {
    if (!isAuthenticated) {
      return {
        text: 'Log In to Join',
        onClick: onLoginClick,
        className: 'bg-purple-600 hover:bg-purple-700 text-white',
        disabled: false,
        showWithdraw: false
      }
    }

    switch (status) {
      case 'none':
        return {
          text: 'Request to Join',
          onClick: onRequestClick,
          className: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white',
          disabled: false,
          showWithdraw: false
        }
      case 'pending':
        return {
          text: 'Request Pending',
          onClick: () => {},
          className: 'bg-yellow-600/20 border border-yellow-500/40 text-yellow-300 cursor-not-allowed',
          disabled: true,
          showWithdraw: true
        }
      case 'approved':
        return {
          text: 'Approved - Attending',
          onClick: () => {},
          className: 'bg-green-600/20 border border-green-500/40 text-green-300 cursor-not-allowed',
          disabled: true,
          showWithdraw: false
        }
      case 'rejected':
        return {
          text: 'Request Rejected',
          onClick: onRequestClick, // Allow re-applying
          className: 'bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/30 hover:border-red-500/60',
          disabled: false,
          showWithdraw: false
        }
      case 'attending':
        return {
          text: 'Attending',
          onClick: () => {},
          className: 'bg-blue-600/20 border border-blue-500/40 text-blue-300 cursor-not-allowed',
          disabled: true,
          showWithdraw: false
        }
      default:
        return {
          text: 'Request to Join',
          onClick: onRequestClick,
          className: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white',
          disabled: false,
          showWithdraw: false
        }
    }
  }

  const config = getButtonConfig()

  return (
    <div className="flex flex-col space-y-2">
      <button
        onClick={config.onClick}
        disabled={disabled || config.disabled}
        className={`
          px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed
          ${config.className} ${className}
        `}
      >
        {config.text}
      </button>
      
      {/* Withdraw Button for Pending Requests */}
      {config.showWithdraw && onWithdrawClick && requestId && (
        <button
          onClick={onWithdrawClick}
          className="px-4 py-2 text-sm bg-gray-600/20 hover:bg-gray-600/30 text-gray-300 hover:text-gray-200 border border-gray-500/40 hover:border-gray-500/60 rounded-lg transition-all flex items-center justify-center space-x-2"
        >
          <Undo2 size={14} />
          <span>Withdraw Request</span>
        </button>
      )}
    </div>
  )
}
