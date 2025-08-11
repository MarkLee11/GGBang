import React, { useState } from 'react'
import { Users, Clock, CheckCircle, XCircle, MessageCircle, Calendar, AlertCircle } from 'lucide-react'
import { useEventRequests } from '../hooks/useEventRequests'
import { useHostActions } from '../hooks/useJoinRequest'
import { formatEventDate } from '../utils/dateUtils'
import { ProfileCard } from './ProfileCard'

interface HostRequestsPanelProps {
  eventId: number
  isHost: boolean
  onRequestUpdate?: () => void
}

export const HostRequestsPanel: React.FC<HostRequestsPanelProps> = ({
  eventId,
  isHost,
  onRequestUpdate
}) => {
  const { requests, capacityInfo, loading, error, refreshRequests } = useEventRequests(eventId, isHost)
  const { 
    approving, 
    rejecting, 
    approveError, 
    rejectError, 
    approve, 
    reject, 
    clearErrors 
  } = useHostActions()
  
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [actioningRequestId, setActioningRequestId] = useState<number | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [showRejectModal, setShowRejectModal] = useState<number | null>(null)

  // Debug logging
  console.log('🔍 HostRequestsPanel Debug:', {
    eventId,
    isHost,
    requestsCount: requests.length,
    capacityInfo,
    loading,
    error,
    activeTab
  })

  const handleApprove = async (requestId: number) => {
    setActioningRequestId(requestId)
    clearErrors()
    
    const success = await approve(requestId)
    
    if (success) {
      await refreshRequests()
      onRequestUpdate?.()
    }
    
    setActioningRequestId(null)
  }

  const handleReject = async (requestId: number) => {
    setActioningRequestId(requestId)
    clearErrors()
    
    const success = await reject(requestId, rejectNote)
    
    if (success) {
      await refreshRequests()
      onRequestUpdate?.()
      setRejectNote('')
      setShowRejectModal(null)
    }
    
    setActioningRequestId(null)
  }

  const openRejectModal = (requestId: number) => {
    setShowRejectModal(requestId)
    setRejectNote('')
  }

  const closeRejectModal = () => {
    setShowRejectModal(null)
    setRejectNote('')
  }

  const filteredRequests = requests.filter(request => request.status === activeTab)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={16} className="text-yellow-400" />
      case 'approved': return <CheckCircle size={16} className="text-green-400" />
      case 'rejected': return <XCircle size={16} className="text-red-400" />
      default: return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'border-yellow-500/20 bg-yellow-500/10'
      case 'approved': return 'border-green-500/20 bg-green-500/10'
      case 'rejected': return 'border-red-500/20 bg-red-500/10'
      default: return 'border-gray-500/20 bg-gray-500/10'
    }
  }

  if (!isHost) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Only event hosts can view join requests.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading requests...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-red-400 mb-4">Error loading join requests: {error}</p>
        <button 
          onClick={() => refreshRequests()}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  // Show empty state when no requests exist
  if (requests.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <MessageCircle size={24} className="text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-4">Join Requests</h3>
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 max-w-md mx-auto">
          <p className="text-gray-300 leading-relaxed mb-4">
            No join requests yet for this event.
          </p>
          <p className="text-gray-400 text-sm">
            When users request to join your event, they will appear here for you to review.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Capacity Information */}
      {capacityInfo && (
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users size={20} className="text-purple-400" />
              <div>
                <p className="text-white font-medium">Event Capacity</p>
                <p className="text-gray-400 text-sm">
                  {capacityInfo.currentAttendees} attending
                  {capacityInfo.capacity && ` of ${capacityInfo.capacity} spots`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-white">
                {capacityInfo.pendingRequests} pending
              </p>
              <p className="text-gray-400 text-sm">requests</p>
            </div>
          </div>
          
          {capacityInfo.capacity && (
            <div className="mt-3">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min((capacityInfo.currentAttendees / capacityInfo.capacity) * 100, 100)}%` 
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {capacityInfo.capacity - capacityInfo.currentAttendees > 0 
                  ? `${capacityInfo.capacity - capacityInfo.currentAttendees} spots remaining`
                  : 'Event is full'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1">
        {(['pending', 'approved', 'rejected'] as const).map((tab) => {
          const count = requests.filter(r => r.status === tab).length
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all capitalize ${
                activeTab === tab
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              {tab} ({count})
            </button>
          )
        })}
      </div>

      {/* Error Messages */}
      {(approveError || rejectError) && (
        <div className="p-4 bg-red-900/20 border border-red-500/20 rounded-lg">
          <p className="text-red-300 text-sm">
            {approveError || rejectError}
          </p>
        </div>
      )}

      {/* Request List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              No {activeTab} requests yet.
            </p>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div
              key={request.id}
              className={`border rounded-lg p-4 ${getStatusColor(request.status)}`}
            >
              <div className="space-y-4">
                {/* Profile Card with Sensitive Info Access */}
                <ProfileCard
                  profile={request.profiles}
                  canViewSensitive={true} // Host can view sensitive info when reviewing requests
                  compact={false}
                />

                {/* Request Message */}
                {request.message && (
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <h5 className="text-gray-300 font-medium mb-2">Message from applicant:</h5>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap italic">
                      "{request.message}"
                    </p>
                  </div>
                )}

                {/* Request Details */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar size={12} className="text-gray-400" />
                    <span className="text-gray-400">
                      Requested {formatEventDate(request.created_at.split('T')[0])}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(request.status)}
                    <span className="text-gray-400 capitalize">
                      {request.status}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                {request.status === 'pending' && (
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={approving && actioningRequestId === request.id}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {approving && actioningRequestId === request.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          <span>Approving...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          <span>Approve</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => openRejectModal(request.id)}
                      disabled={rejecting && actioningRequestId === request.id}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {rejecting && actioningRequestId === request.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          <span>Rejecting...</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={16} />
                          <span>Reject</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Rejection Note Display */}
                {request.status === 'rejected' && request.note && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-300 font-medium text-sm mb-1">Rejection Reason:</p>
                        <p className="text-red-200 text-sm">{request.note}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl max-w-md w-full border border-gray-700 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <AlertCircle size={20} className="text-red-400" />
              <h3 className="text-lg font-semibold text-white">Reject Join Request</h3>
            </div>
            
            <p className="text-gray-300 mb-4">
              Please provide a reason for rejecting this request (optional but recommended):
            </p>
            
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g., Event is full, doesn't meet requirements, etc."
              className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-red-500 resize-none mb-4"
              rows={3}
            />
            
            <div className="flex space-x-3">
              <button
                onClick={closeRejectModal}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={rejecting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {rejecting ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}