// === src/components/EventModal.tsx ===
import React, { useEffect, useState } from 'react'
import { X, MapPin, Calendar, Clock, User, Tag, Users, Settings, MessageSquare, Eye, Lock, Unlock } from 'lucide-react'
import { formatEventDate, formatEventTime } from '../utils/dateUtils'
import { type Event } from '../lib/supabase'
import { unlockEventLocation } from '../lib/api'
import { useUserEventStatus } from '../hooks/useUserEventStatus'
import { useJoinRequest } from '../hooks/useJoinRequest'
import { JoinRequestModal } from './JoinRequestModal'
import { HostRequestsPanel } from './HostRequestsPanel'
import { UserStatusBadge, JoinButton } from './UserStatusBadge'

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  event: Event | null
  onEditClick?: (event: Event) => void
  onEventDeleted?: () => void
  onAttendanceChanged?: () => void
  onJoinClick?: () => void
  user?: any // Current user passed from parent
}

const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  event,
  onEditClick,
  onAttendanceChanged,
  onJoinClick,
  user
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'requests'>('details')
  const [isJoinRequestModalOpen, setIsJoinRequestModalOpen] = useState(false)
  const [unlockingLocation, setUnlockingLocation] = useState(false)
  const [unlockError, setUnlockError] = useState<string | null>(null)

  const isHost = user && event?.user_id === user.id

  // 使用改进后的hook
  const { status: userStatus, loading: statusLoading, refreshStatus, requestId } = useUserEventStatus(event?.id || null)
  const { withdrawRequest } = useJoinRequest()

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('details')
      setIsJoinRequestModalOpen(false)
      setUnlockError(null)
    }
  }, [isOpen])

  // ESC 关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleUnlockLocation = async () => {
    if (!event || !isHost) return
    setUnlockingLocation(true)
    setUnlockError(null)
    try {
      const result = await unlockEventLocation(event.id)
      if (result.success) {
        onAttendanceChanged?.()
        refreshStatus?.()
      } else {
        setUnlockError(result.error || 'Failed to unlock location')
      }
    } catch {
      setUnlockError('Network error occurred')
    } finally {
      setUnlockingLocation(false)
    }
  }

  // JoinRequestModal 成功后的回调
  const handleJoinRequestSuccess = () => {
    refreshStatus?.()
    onAttendanceChanged?.()
  }

  const handleHostActionSuccess = () => {
    refreshStatus?.()
    onAttendanceChanged?.()
  }

  // Handle withdraw request
  const handleWithdrawRequest = async () => {
    if (!requestId) return
    
    const success = await withdrawRequest(requestId)
    if (success) {
      refreshStatus?.()
      onAttendanceChanged?.()
    }
  }

  const canSeeExactLocation = () => {
    if (!event) return false
    
    // Host can always see exact location
    if (isHost) return true
    
    // Location is unlocked for everyone
    if (event.place_exact_visible) return true
    
    // User is approved/attending
    return userStatus === 'approved' || userStatus === 'attending'
  }

  if (!isOpen || !event) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">{event.title}</h2>
              <div className="flex items-center space-x-4 text-gray-400">
                <div className="flex items-center space-x-2">
                  <Calendar size={16} />
                  <span>{formatEventDate(event.date)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock size={16} />
                  <span>{formatEventTime(event.time)}</span>
                </div>
                {event.capacity && (
                  <div className="flex items-center space-x-2">
                    <Users size={16} />
                    <span>Capacity: {event.capacity}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* User Status Badge */}
              {user && !isHost && (
                <UserStatusBadge 
                  status={userStatus} 
                  className="mr-2"
                />
              )}
              
              {/* Join Button */}
              {user && !isHost && (
                <JoinButton
                  status={userStatus}
                  onRequestClick={() => setIsJoinRequestModalOpen(true)}
                  onLoginClick={() => onJoinClick?.()}
                  onWithdrawClick={handleWithdrawRequest}
                  isAuthenticated={!!user}
                  requestId={requestId}
                />
              )}
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 px-6 py-3 text-center font-medium transition-colors ${
                activeTab === 'details'
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}>
              Event Details
            </button>
            {isHost && (
              <button
                onClick={() => setActiveTab('requests')}
                className={`flex-1 px-6 py-3 text-center font-medium transition-colors ${
                  activeTab === 'requests'
                    ? 'text-purple-400 border-b-2 border-purple-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <MessageSquare size={16} />
                  <span>Join Requests</span>
                </div>
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {activeTab === 'details' ? (
              <div className="space-y-6">
                {/* Description */}
                {event.description && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">About This Event</h3>
                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {event.description}
                    </p>
                  </div>
                )}

                {/* Location */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <MapPin size={20} className="text-purple-400" />
                    <span>Location</span>
                  </h3>

                  {event.place_hint && (
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <p className="text-gray-300 font-medium mb-1">📍 Location Hint</p>
                      <p className="text-white">{event.place_hint}</p>
                      {event.country && (
                        <p className="text-gray-400 text-sm mt-1">{event.country}</p>
                      )}
                    </div>
                  )}

                  {canSeeExactLocation() ? (
                    <div className="bg-green-900/20 border border-green-800/50 rounded-lg p-4">
                      <p className="text-green-300 font-medium mb-1 flex items-center space-x-2">
                        <Unlock size={16} />
                        <span>Exact Location (Unlocked)</span>
                      </p>
                      <p className="text-white">{event.place_exact}</p>
                      <p className="text-green-400 text-sm mt-2">
                        ✅ Available to approved members
                      </p>
                    </div>
                  ) : event.place_exact && (
                    <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
                      <p className="text-gray-400 font-medium mb-1 flex items-center space-x-2">
                        <Lock size={16} />
                        <span>Exact Location</span>
                      </p>
                      <p className="text-gray-500 text-sm">
                        {userStatus === 'pending'
                          ? 'Will be revealed when your request is approved'
                          : userStatus === 'none'
                          ? 'Available to approved members only'
                          : 'Will be revealed closer to the event'
                        }
                      </p>
                    </div>
                  )}

                  {!event.place_hint && event.location && (
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <p className="text-gray-300">{event.location}</p>
                      {event.country && (
                        <p className="text-gray-400 text-sm mt-1">{event.country}</p>
                      )}
                    </div>
                  )}

                  {isHost && event.place_exact && !event.place_exact_visible && (
                    <div className="space-y-2">
                      <button
                        onClick={handleUnlockLocation}
                        disabled={unlockingLocation}
                        className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Eye size={16} />
                        <span>{unlockingLocation ? 'Unlocking...' : 'Unlock Location for Members'}</span>
                      </button>
                      {unlockError && (
                        <p className="text-red-400 text-sm">{unlockError}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Category */}
                {event.category && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                      <Tag size={20} className="text-purple-400" />
                      <span>Category</span>
                    </h3>
                    <span className="inline-block px-3 py-1 bg-purple-600/20 text-purple-300 rounded-full text-sm border border-purple-500/30">
                      {event.category}
                    </span>
                  </div>
                )}

                {/* Host */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                    <User size={20} className="text-purple-400" />
                    <span>Host</span>
                  </h3>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                      <User size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Event Host</p>
                      <p className="text-gray-400 text-sm">Organized this event</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <HostRequestsPanel
                eventId={event.id}
                isHost={!!isHost}
                onRequestUpdate={handleHostActionSuccess}
              />
            )}
          </div>
        </div>
      </div>

      {/* Join Request Modal */}
      <JoinRequestModal
        isOpen={isJoinRequestModalOpen}
        onClose={() => setIsJoinRequestModalOpen(false)}
        eventId={event.id}
        eventTitle={event.title}
        onSuccess={handleJoinRequestSuccess}
        onLoginRequired={() => onJoinClick?.()}
        user={user}
      />
    </>
  )
}

export default EventModal
