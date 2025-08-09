import React, { useState } from 'react'
import { 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  User, 
  MapPin, 
  Calendar,
  MessageCircle,
  MoreHorizontal,
  AlertCircle
} from 'lucide-react'
import { useHostRequests } from '../hooks/useHostRequests'
import { useApproveRequest, useRejectRequest } from '../hooks/useJoinRequest'
import ProfileCard from './ProfileCard'
import type { JoinRequestWithProfile } from '../lib/supabase'

interface HostRequestsPanelProps {
  eventId: number
  isHost: boolean
}

const HostRequestsPanel: React.FC<HostRequestsPanelProps> = ({ eventId, isHost }) => {
  const { requests, loading, error, stats, refetch, pendingRequests, approvedRequests, rejectedRequests } = useHostRequests(eventId)
  const { approve, loading: approving } = useApproveRequest()
  const { reject, loading: rejecting } = useRejectRequest()
  
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [showRejectModal, setShowRejectModal] = useState<number | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  if (!isHost) {
    return (
      <div className="text-center py-8">
        <AlertCircle size={48} className="text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400">Only event organizers can view join requests.</p>
      </div>
    )
  }

  const handleApprove = async (requestId: number) => {
    setProcessingId(requestId)
    try {
      const result = await approve(requestId)
      if (result.success) {
        refetch() // Refresh the list
      }
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (requestId: number, note?: string) => {
    setProcessingId(requestId)
    try {
      const result = await reject(requestId, note)
      if (result.success) {
        setShowRejectModal(null)
        setRejectNote('')
        refetch() // Refresh the list
      }
    } finally {
      setProcessingId(null)
    }
  }

  const RequestCard: React.FC<{ request: JoinRequestWithProfile }> = ({ request }) => {
    const isProcessing = processingId === request.id

    return (
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
          {/* Profile Card - Enhanced for hosts */}
          <div className="lg:col-span-1">
            <ProfileCard
              userId={request.requester_id}
              eventId={eventId}
              showSensitive={true}
              className="h-full"
            />
          </div>

          {/* Request Details */}
          <div className="lg:col-span-2 space-y-4">
            {/* Status Badge */}
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-medium text-white">Join Request</h3>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                request.status === 'pending' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-800/50' :
                request.status === 'approved' ? 'bg-green-900/50 text-green-300 border border-green-800/50' :
                'bg-red-900/50 text-red-300 border border-red-800/50'
              }`}>
                {request.status === 'pending' && <Clock size={12} className="inline mr-1" />}
                {request.status === 'approved' && <CheckCircle size={12} className="inline mr-1" />}
                {request.status === 'rejected' && <XCircle size={12} className="inline mr-1" />}
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </div>
            </div>

            {/* Request Message */}
            {request.message && (
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <MessageCircle size={16} className="text-purple-400" />
                  <span className="text-sm font-medium text-gray-300">Message from requester:</span>
                </div>
                <p className="text-gray-300 leading-relaxed">{request.message}</p>
              </div>
            )}

            {/* Request Metadata */}
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <Calendar size={14} />
                <span>Requested on {new Date(request.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
              
              {request.updated_at !== request.created_at && (
                <div className="flex items-center space-x-2">
                  <Clock size={14} />
                  <span>Updated on {new Date(request.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
              )}
            </div>

            {/* Actions for Pending Requests */}
            {request.status === 'pending' && (
              <div className="flex space-x-3 pt-4 border-t border-gray-700">
                <button
                  onClick={() => handleApprove(request.id)}
                  disabled={isProcessing || approving}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isProcessing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      <span>Approve Request</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowRejectModal(request.id)}
                  disabled={isProcessing || rejecting}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <XCircle size={16} />
                  <span>Reject Request</span>
                </button>
              </div>
            )}

            {/* Approved/Rejected Status Info */}
            {request.status === 'approved' && (
              <div className="bg-green-900/20 border border-green-800/50 rounded-lg p-3">
                <p className="text-green-300 text-sm">
                  ✅ This request has been approved. The user can now attend the event.
                </p>
              </div>
            )}

            {request.status === 'rejected' && (
              <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3">
                <p className="text-red-300 text-sm">
                  ❌ This request has been rejected. The user cannot attend the event.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading requests...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
        <p className="text-red-400 mb-2">Error loading requests</p>
        <p className="text-gray-400 text-sm mb-4">{error}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  const currentRequests = activeTab === 'pending' ? pendingRequests : 
                         activeTab === 'approved' ? approvedRequests : rejectedRequests

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-sm text-gray-400">Total</div>
        </div>
        <div className="bg-yellow-900/20 rounded-lg p-4 text-center border border-yellow-800/30">
          <div className="text-2xl font-bold text-yellow-300">{stats.pending}</div>
          <div className="text-sm text-yellow-400">Pending</div>
        </div>
        <div className="bg-green-900/20 rounded-lg p-4 text-center border border-green-800/30">
          <div className="text-2xl font-bold text-green-300">{stats.approved}</div>
          <div className="text-sm text-green-400">Approved</div>
        </div>
        <div className="bg-red-900/20 rounded-lg p-4 text-center border border-red-800/30">
          <div className="text-2xl font-bold text-red-300">{stats.rejected}</div>
          <div className="text-sm text-red-400">Rejected</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
        {(['pending', 'approved', 'rejected'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === tab
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {tab === 'pending' && <Clock size={16} />}
            {tab === 'approved' && <CheckCircle size={16} />}
            {tab === 'rejected' && <XCircle size={16} />}
            <span className="capitalize">{tab}</span>
            <span className="bg-gray-600 text-xs px-2 py-1 rounded-full">
              {tab === 'pending' ? stats.pending : 
               tab === 'approved' ? stats.approved : stats.rejected}
            </span>
          </button>
        ))}
      </div>

      {/* Requests List */}
      {currentRequests.length === 0 ? (
        <div className="text-center py-12">
          <Users size={48} className="text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No {activeTab} requests</p>
          {activeTab === 'pending' && (
            <p className="text-gray-500 text-sm mt-1">New requests will appear here</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {currentRequests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Reject Request</h3>
              <p className="text-gray-400 mb-4">
                Are you sure you want to reject this request? You can optionally provide a reason.
              </p>
              
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Optional reason for rejection..."
                className="w-full h-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none mb-4"
              />

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowRejectModal(null)
                    setRejectNote('')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(showRejectModal, rejectNote.trim() || undefined)}
                  disabled={processingId === showRejectModal}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {processingId === showRejectModal ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <XCircle size={16} />
                      <span>Reject</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HostRequestsPanel
