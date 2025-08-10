import React, { useState } from 'react'
import { Users, Clock, CheckCircle, XCircle, MessageCircle, Calendar } from 'lucide-react'
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
    
    const success = await reject(requestId, 'Request declined by host')
    
    if (success) {
      await refreshRequests()
      onRequestUpdate?.()
    }
    
    setActioningRequestId(null)
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
        <p className="text-red-400">Error loading requests: {error}</p>
        <button 
          onClick={refreshRequests}
          className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
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
                      onClick={() => handleReject(request.id)}
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
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}