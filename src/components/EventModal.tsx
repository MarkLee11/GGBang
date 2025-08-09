import React, { useEffect, useState } from 'react';
import { X, MapPin, Calendar, Clock, User, Tag, Users, Settings, MessageSquare, UserPlus, Eye } from 'lucide-react';
import { formatEventDate, formatEventTime } from '../utils/dateUtils';
import { type Event } from '../lib/supabase';
import { useEventStatus } from '../hooks/useEventStatus';
import { unlockEventLocation } from '../lib/supabase';
import JoinRequestModal from './JoinRequestModal';
import HostRequestsPanel from './HostRequestsPanel';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  onEditClick?: (event: Event) => void;
  onEventDeleted?: () => void;
  onAttendanceChanged?: () => void;
  user?: any;
  onJoinClick?: () => void;
}

const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  event,
  onEditClick,
  onEventDeleted: _onEventDeleted,
  onAttendanceChanged,
  user,
  onJoinClick
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'requests'>('details');
  const [isJoinRequestModalOpen, setIsJoinRequestModalOpen] = useState(false);
  const [unlockingLocation, setUnlockingLocation] = useState(false);

  // Use the event status hook
  const { eventInfo, refetch: refetchStatus, isHost, userStatus } = useEventStatus(
    event?.id || 0,
    user?.id
  );

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('details');
      setIsJoinRequestModalOpen(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleRequestToJoin = () => {
    if (!user) {
      onJoinClick?.();
      return;
    }
    setIsJoinRequestModalOpen(true);
  };

  const handleUnlockLocation = async () => {
    if (!event || !isHost) return;

    setUnlockingLocation(true);
    try {
      const result = await unlockEventLocation(event.id);
      if (result.success) {
        // Location unlocked successfully
        refetchStatus(); // Refresh event info
      }
    } catch (error) {
      console.error('Failed to unlock location:', error);
    } finally {
      setUnlockingLocation(false);
    }
  };

  const handleJoinRequestSuccess = () => {
    refetchStatus(); // Refresh event status
    onAttendanceChanged?.(); // Notify parent component
  };

  if (!isOpen || !event) return null;

  const canJoin = eventInfo && !isHost && userStatus === 'none' && eventInfo.availableSpots > 0;
  const showLocationUnlock = isHost && event.place_exact && !event.place_exact_visible;

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        role="dialog"
        aria-modal="true"
      >
        <div className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden animate-modal-fade-in">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>

          {/* Header */}
          <div className="relative">
            <div className="h-48 bg-gradient-to-br from-purple-600 via-pink-600 to-red-600">
              {event.image && (
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black/40" />
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-2">{event.title}</h1>
                  <div className="flex items-center space-x-4 text-gray-300">
                    <div className="flex items-center space-x-1">
                      <Calendar size={16} />
                      <span>{formatEventDate(event.date)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock size={16} />
                      <span>{formatEventTime(event.time)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Tag size={16} />
                      <span>{event.category}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  {isHost && (
                    <>
                      <button
                        onClick={() => onEditClick?.(event)}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                      >
                        <Settings size={16} />
                        <span>Edit</span>
                      </button>
                      {showLocationUnlock && (
                        <button
                          onClick={handleUnlockLocation}
                          disabled={unlockingLocation}
                          className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Eye size={16} />
                          <span>{unlockingLocation ? 'Unlocking...' : 'Unlock Location'}</span>
                        </button>
                      )}
                    </>
                  )}
                  
                  {canJoin && (
                    <button
                      onClick={handleRequestToJoin}
                      className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105"
                    >
                      <UserPlus size={16} />
                      <span>Request to Join</span>
                    </button>
                  )}

                  {userStatus === 'pending' && (
                    <div className="px-4 py-2 bg-yellow-900/50 border border-yellow-800/50 text-yellow-300 rounded-lg">
                      Request Pending
                    </div>
                  )}

                  {userStatus === 'approved' && (
                    <div className="px-4 py-2 bg-green-900/50 border border-green-800/50 text-green-300 rounded-lg">
                      Request Approved
                    </div>
                  )}

                  {userStatus === 'attending' && (
                    <div className="px-4 py-2 bg-blue-900/50 border border-blue-800/50 text-blue-300 rounded-lg">
                      Attending
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-800">
            <div className="flex">
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 px-6 py-4 text-center transition-colors ${
                  activeTab === 'details'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                Event Details
              </button>
              {isHost && (
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`flex-1 px-6 py-4 text-center transition-colors relative ${
                    activeTab === 'requests'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <span className="flex items-center justify-center space-x-2">
                    <MessageSquare size={16} />
                    <span>Join Requests</span>
                    {eventInfo && eventInfo.pendingRequests > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] h-5 flex items-center justify-center">
                        {eventInfo.pendingRequests}
                      </span>
                    )}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[calc(90vh-300px)] overflow-y-auto">
            {activeTab === 'details' ? (
              <div className="space-y-6">
                {/* Event Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Location */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                      <MapPin size={20} className="text-purple-400" />
                      <span>Location</span>
                    </h3>
                    {/* Always show place_hint by default */}
                    <div className="space-y-3">
                      {/* Place Hint (Always visible) */}
                      {event.place_hint && (
                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <p className="text-gray-300 font-medium mb-1">📍 Location Hint</p>
                          <p className="text-white">{event.place_hint}</p>
                          {event.country && (
                            <p className="text-gray-400 text-sm mt-1">{event.country}</p>
                          )}
                        </div>
                      )}

                      {/* Exact Location (Only for approved users when unlocked) */}
                      {event.place_exact_visible && event.place_exact && (userStatus === 'approved' || userStatus === 'attending' || isHost) ? (
                        <div className="bg-green-900/20 border border-green-800/50 rounded-lg p-4">
                          <p className="text-green-300 font-medium mb-1">🎯 Exact Location (Unlocked)</p>
                          <p className="text-white">{event.place_exact}</p>
                          <p className="text-green-400 text-sm mt-2">
                            ✅ Available to approved members
                          </p>
                        </div>
                      ) : (
                        /* Show locked state for non-approved users or when not unlocked */
                        <>
                          {event.place_exact && !event.place_exact_visible && (
                            <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
                              <p className="text-gray-400 font-medium mb-1">🔒 Exact Location</p>
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
                          
                          {/* Fallback to general location if no place_hint */}
                          {!event.place_hint && event.location && (
                            <div className="bg-gray-800/50 rounded-lg p-4">
                              <p className="text-gray-300">{event.location}</p>
                              {event.country && (
                                <p className="text-gray-400 text-sm mt-1">{event.country}</p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Capacity */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                      <Users size={20} className="text-purple-400" />
                      <span>Capacity</span>
                    </h3>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      {eventInfo ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300">Current / Total</span>
                            <span className="text-white font-semibold">
                              {eventInfo.currentAttendees} / {eventInfo.capacity}
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min((eventInfo.currentAttendees / eventInfo.capacity) * 100, 100)}%`
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">
                              {eventInfo.availableSpots} spots available
                            </span>
                            {eventInfo.pendingRequests > 0 && (
                              <span className="text-yellow-400">
                                {eventInfo.pendingRequests} pending
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                          <div className="h-2 bg-gray-700 rounded mb-2"></div>
                          <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {event.description && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">Description</h3>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {event.description}
                      </p>
                    </div>
                  </div>
                )}

                {/* Organizer */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <User size={20} className="text-purple-400" />
                    <span>Organizer</span>
                  </h3>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-gray-300">{event.organizer || 'Event Organizer'}</p>
                  </div>
                </div>
              </div>
            ) : (
              // Host Requests Tab
              <HostRequestsPanel eventId={event.id} isHost={isHost} />
            )}
          </div>
        </div>
      </div>

      {/* Join Request Modal */}
      <JoinRequestModal
        isOpen={isJoinRequestModalOpen}
        onClose={() => setIsJoinRequestModalOpen(false)}
        event={event}
        user={user}
        onJoinClick={onJoinClick}
        onSuccess={handleJoinRequestSuccess}
      />
    </>
  );
};

export default EventModal;