import React, { useState } from 'react'
import { X, User, MessageCircle, Send, AlertCircle, CheckCircle } from 'lucide-react'
import { useRequestJoin } from '../hooks/useJoinRequest'
import type { Event } from '../lib/supabase'

interface JoinRequestModalProps {
  isOpen: boolean
  onClose: () => void
  event: Event | null
  user?: any
  onJoinClick?: () => void
  onSuccess?: () => void
}

const JoinRequestModal: React.FC<JoinRequestModalProps> = ({
  isOpen,
  onClose,
  event,
  user,
  onJoinClick,
  onSuccess
}) => {
  const [message, setMessage] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const { requestJoin, loading, error, clearError } = useRequestJoin()

  if (!isOpen || !event) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 非登录用户需要先登录
    if (!user) {
      onJoinClick?.()
      onClose()
      return
    }

    clearError()
    
    const result = await requestJoin(event.id, message.trim())
    
    if (result.success) {
      setShowSuccess(true)
      setMessage('')
      
      // 显示成功消息后关闭modal
      setTimeout(() => {
        setShowSuccess(false)
        onClose()
        onSuccess?.()
      }, 2000)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setMessage('')
      setShowSuccess(false)
      clearError()
      onClose()
    }
  }

  // 字符限制
  const messageMaxLength = 500
  const remainingChars = messageMaxLength - message.length

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-lg animate-modal-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <User size={20} className="text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Request to Join</h3>
              <p className="text-sm text-gray-400">{event.title}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Success State */}
        {showSuccess && (
          <div className="p-6 text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-green-600/20 rounded-full mx-auto mb-4">
              <CheckCircle size={32} className="text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Request Sent!</h3>
            <p className="text-gray-400">
              Your join request has been submitted to the event organizer. 
              You'll be notified when they respond.
            </p>
          </div>
        )}

        {/* Form */}
        {!showSuccess && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Event Info */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">{event.title}</h4>
              <div className="text-sm text-gray-400 space-y-1">
                <p>📅 {event.date} at {event.time}</p>
                <p>📍 {event.location || event.place_hint || 'Location TBD'}</p>
                {event.capacity && (
                  <p>👥 Capacity: {event.capacity} people</p>
                )}
              </div>
            </div>

            {/* Authentication Check */}
            {!user && (
              <div className="bg-yellow-900/30 border border-yellow-800/50 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle size={20} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-yellow-200 font-medium">Sign in required</p>
                  <p className="text-yellow-300/80 text-sm mt-1">
                    You need to be signed in to request to join events.
                  </p>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-300 mb-2">
                <MessageCircle size={16} />
                <span>Message to organizer (optional)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, messageMaxLength))}
                placeholder="Tell the organizer why you'd like to join this event..."
                className="w-full h-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                disabled={loading || !user}
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500">
                  Share your interests, experience, or why you're excited about this event
                </p>
                <span className={`text-xs ${remainingChars < 50 ? 'text-yellow-400' : 'text-gray-500'}`}>
                  {remainingChars} characters left
                </span>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-200 font-medium">Request failed</p>
                  <p className="text-red-300/80 text-sm mt-1">{error}</p>
                  {error.includes('DUPLICATE') && (
                    <p className="text-red-300/60 text-xs mt-2">
                      Check your profile or event details for existing requests.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Sending...</span>
                  </>
                ) : user ? (
                  <>
                    <Send size={16} />
                    <span>Send Request</span>
                  </>
                ) : (
                  <span>Sign In to Join</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default JoinRequestModal