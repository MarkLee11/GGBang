// === src/components/JoinRequestModal.tsx ===
import React, { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { requestToJoin } from '../lib/api'

interface JoinRequestModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: number
  eventTitle: string
  onSuccess?: () => void            // 成功后回调（由父组件传入）
  onLoginRequired?: () => void      // 未登录时触发登录（由父组件传入）
  user?: any                        // 当前用户（父组件传入）
}

export const JoinRequestModal: React.FC<JoinRequestModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  onSuccess,
  onLoginRequired,
  user
}) => {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  // 关键：定义在组件内部，避免 “handleSubmit is not defined”
  const handleSubmit = async () => {
    if (!eventId) return

    // 未登录：让父组件拉起登录
    if (!user) {
      onLoginRequired?.()
      return
    }

    setSending(true)
    setError(null)
    try {
      const res = await requestToJoin(eventId, message)
      if (!res.ok) {
        setError(res.message || 'Failed to send request')
        toast.error(res.message || 'Failed to send request')
        return
      }

      toast.success('Request sent — pending host approval')
      onSuccess?.()     // 通知父组件（EventModal）刷新
      onClose()
    } catch (e: any) {
      console.error('Join request error:', e)
      setError(e?.message || 'Network error')
      toast.error(e?.message || 'Network error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-md w-full border border-gray-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">
            Request to Join: {eventTitle}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-400 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <label className="block text-sm text-gray-400 mb-2">
          Message to the host (optional)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell the host why you want to join or ask a question…"
          className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-purple-500 resize-none"
          rows={4}
        />

        <div className="flex justify-end mt-4 space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={sending}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send Request'}
          </button>
        </div>
      </div>
    </div>
  )
}
