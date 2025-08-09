import React, { useEffect } from 'react';
import { X, MapPin, Calendar, Clock, User, Tag, UserCheck, Users, MessageSquare, CheckCircle, XCircle, Clock as ClockIcon } from 'lucide-react';
import { formatEventDate, formatEventTime } from '../utils/dateUtils';
import { supabase, type Event, type JoinRequest, type Profile } from '../lib/supabase';
import JoinRequestModal from './JoinRequestModal';

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

const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, event, onEditClick, onEventDeleted, onAttendanceChanged, user, onJoinClick }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [joinRequestStatus, setJoinRequestStatus] = React.useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [isJoinRequestModalOpen, setIsJoinRequestModalOpen] = React.useState(false);
  const [joinRequests, setJoinRequests] = React.useState<(JoinRequest & { profiles?: Profile })[]>([]);
  const [activeTab, setActiveTab] = React.useState<'details' | 'requests'>('details');
  const [requestsLoading, setRequestsLoading] = React.useState(false);
  const [attendeeCount, setAttendeeCount] = React.useState(0);
  const [isAttending, setIsAttending] = React.useState(false);
  const [attendButtonLoading, setAttendButtonLoading] = React.useState(false);

  // Check if current user owns this event
  const canUserModifyEvent = React.useMemo(() => {
    if (!event || !user) {
      return false;
    }
    return event.user_id === user.id;
  }, [user, event]);

  // Handle attend event
  const handleAttendEvent = async () => {
    if (!user || !event) return;
    
    setAttendButtonLoading(true);
    try {
      if (isAttending) {
        // Leave event
        const { error } = await supabase
          .from('event_attendees')
          .delete()
          .eq('event_id', event.id)
          .eq('user_id', user.id);

        if (error) throw error;
        
        setIsAttending(false);
        setAttendeeCount(prev => prev - 1);
      } else {
        // Join event
        const { error } = await supabase
          .from('event_attendees')
          .insert([{ event_id: event.id, user_id: user.id }]);

        if (error) throw error;
        
        setIsAttending(true);
        setAttendeeCount(prev => prev + 1);
      }
      
      if (onAttendanceChanged) {
        onAttendanceChanged();
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      alert('Failed to update attendance. Please try again.');
    } finally {
      setAttendButtonLoading(false);
    }
  };

  // Check user's join request status and get attendee count
  React.useEffect(() => {
    const checkStatusAndCount = async () => {
      if (!event) return;

      try {
        console.log('Checking status for event:', event.id);
        
        // Get total attendee count
        const { count, error: countError } = await supabase
          .from('event_attendees')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id);

        if (countError) {
          console.error('Error fetching attendee count:', countError);
        } else {
          console.log('Attendee count:', count);
          setAttendeeCount(count || 0);
        }

        // Check user's join request status (only if user is logged in)
        if (user) {
          console.log('Checking user join request status. User ID:', user.id);
          
          // First check if user is already attending
          const { data, error: attendanceError } = await supabase
            .from('event_attendees')
            .select('id')
            .eq('event_id', event.id)
            .eq('user_id', user.id);

          if (attendanceError) {
            console.error('Error checking attendance:', attendanceError);
          } else {
            if (data && data.length > 0) {
              setJoinRequestStatus('approved');
              setIsAttending(true);
              return;
            }
          }
          
          // If not attending, check for join request
          const { data: requestData, error: requestError } = await supabase
            .from('join_requests')
            .select('status')
            .eq('event_id', event.id)
            .eq('requester_id', user.id)
            .maybeSingle();

          if (requestError && requestError.code !== 'PGRST116') {
            console.error('Error checking join request:', requestError);
          } else if (requestData) {
            setJoinRequestStatus(requestData.status as 'pending' | 'approved' | 'rejected');
          } else {
            setJoinRequestStatus('none');
          }
        }
      } catch (error) {
        console.error('Error in checkStatusAndCount:', error);
      }
    };

    if (isOpen && event) {
      checkStatusAndCount();
    }
  }, [event, user, isOpen]);

  // Fetch join requests for event host
  React.useEffect(() => {
    const fetchJoinRequests = async () => {
      if (!event || !canUserModifyEvent || activeTab !== 'requests') return;

      setRequestsLoading(true);
      try {
        const { data, error } = await supabase
          .from('join_requests')
          .select(`
            *,
            profiles!inner(user_id, display_name, age, city, country, bio, profile_images, interests, preferences)
          `)
          .eq('event_id', event.id)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        setJoinRequests(data || []);
      } catch (error) {
        console.error('Error fetching join requests:', error);
      } finally {
        setRequestsLoading(false);
      }
    };

    fetchJoinRequests();
  }, [event, canUserModifyEvent, activeTab]);

  // Handle join request
  const handleJoinRequest = () => {
    if (!user) {
      onJoinClick?.();
      return;
    }

    setIsJoinRequestModalOpen(true);
  };

  // Handle request sent
  const handleRequestSent = () => {
    setJoinRequestStatus('pending');
    // Show success message
    alert('Request sent! The host will review your request and get back to you.');
  };

  // Handle approve/reject request
  const handleRequestAction = async (requestId: number, action: 'approve' | 'reject') => {
    if (!event) return;

    try {
      const endpoint = action === 'approve' ? 'join-approve' : 'join-reject';
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ requestId })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to ${action} request`);
      }

      // Refresh requests and attendee count
      if (action === 'approve') {
        setAttendeeCount(prev => prev + 1);
      }
      
      // Refresh join requests
      const { data, error } = await supabase
        .from('join_requests')
        .select(`
          *,
          profiles!inner(user_id, display_name, age, city, country, bio, profile_images, interests, preferences)
        `)
        .eq('event_id', event.id)
        .order('created_at', { ascending: false });

      if (!error) {
        setJoinRequests(data || []);
      }

      if (onAttendanceChanged) {
        onAttendanceChanged();
      }

    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      alert(`Failed to ${action} request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle delete event
  const handleDeleteEvent = async () => {
    if (!event) return;
    
    // Check if user is authenticated
    if (!user) {
      alert('You must be logged in to delete events.');
      return;
    }
    
    // Check if user owns this event
    if (!canUserModifyEvent) {
      alert('You can only delete events that you created.');
      return;
    }

    const confirmed = window.confirm('Are you sure you want to delete this event? This action cannot be undone.');
    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id)
        .eq('user_id', user.id);

      if (error) {
        throw new Error(`Failed to delete event: ${error.message}`);
      }

      alert('Event deleted successfully!');
      onClose();
      if (onEventDeleted) {
        onEventDeleted();
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete event';
      alert(`Error: ${errorMessage}. Please try again.`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !event) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden animate-fade-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className="overflow-y-auto max-h-[90vh]">
          {/* Hero Image */}
          <div className="relative h-64 md:h-80 overflow-hidden">
            <img 
              src={event.image || 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=400'} 
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
            
            {/* Category Badge */}
            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30 backdrop-blur-sm">
                <Tag size={14} className="mr-1" />
                {attendeeCount} / {event.capacity} {attendeeCount === 1 ? 'person' : 'people'} attending
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8">
            {/* Title and Description */}
            <div className="mb-8">
              <h1 id="modal-title" className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                {event.title}
              </h1>
              <p className="text-gray-300 text-lg leading-relaxed">
                {event.description}
              </p>
            </div>

            {/* Event Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Date & Time */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Calendar size={20} className="text-purple-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-white font-semibold mb-1">Date</h3>
                    <p className="text-gray-300">{typeof event.date === 'string' && event.date.includes('-') ? formatEventDate(event.date) : event.date}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Clock size={20} className="text-purple-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-white font-semibold mb-1">Time</h3>
                    <p className="text-gray-300">{typeof event.time === 'string' && event.time.includes(':') && event.time.length <= 8 ? formatEventTime(event.time) : event.time}</p>
                  </div>
                </div>
              </div>

              {/* Location & Organizer */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <MapPin size={20} className="text-purple-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-white font-semibold mb-1">Location</h3>
                    <p className="text-gray-300">{event.location}, {event.country}</p>
                  </div>
                </div>

                {event.organizer && (
                  <div className="flex items-start space-x-3">
                    <User size={20} className="text-purple-500 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-white font-semibold mb-1">Organizer</h3>
                      <p className="text-gray-300">{event.organizer}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Location Information */}
            <div className="border-t border-gray-800 pt-6 mb-6">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <MapPin size={20} className="text-purple-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-white font-semibold mb-1">Location</h3>
                    <p className="text-gray-300">{event.location}, {event.country}</p>
                    {event.place_hint && (
                      <p className="text-gray-400 text-sm mt-1">Area: {event.place_hint}</p>
                    )}
                    {joinRequestStatus === 'approved' && event.place_exact_visible && event.place_exact && (
                      <p className="text-green-400 text-sm mt-2 font-medium">
                        📍 Exact location: {event.place_exact}
                      </p>
                    )}
                    {joinRequestStatus === 'approved' && !event.place_exact_visible && (
                      <p className="text-yellow-400 text-sm mt-2">
                        🔒 Exact location will be shared closer to the event time
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs for event host */}
            {canUserModifyEvent && (
              <div className="border-t border-gray-800 pt-6 mb-6">
                <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1 mb-6">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      activeTab === 'details'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    Details
                  </button>
                  <button
                    onClick={() => setActiveTab('requests')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                      activeTab === 'requests'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <MessageSquare size={16} />
                    <span>Requests</span>
                    {joinRequests.filter(r => r.status === 'pending').length > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {joinRequests.filter(r => r.status === 'pending').length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Requests Tab Content */}
                {activeTab === 'requests' && (
                  <div className="space-y-4">
                    {requestsLoading ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                        <p className="text-gray-400 mt-2">Loading requests...</p>
                      </div>
                    ) : joinRequests.length > 0 ? (
                      joinRequests.map((request) => (
                        <div
                          key={request.id}
                          className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
                        >
                          <div className="flex items-start space-x-4">
                            {/* User Avatar */}
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                              {request.profiles?.display_name?.charAt(0) || 'U'}
                            </div>

                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="text-white font-semibold">
                                    {request.profiles?.display_name || 'Anonymous User'}
                                  </h4>
                                  <div className="flex items-center space-x-3 text-sm text-gray-400">
                                    {request.profiles?.age && <span>Age {request.profiles.age}</span>}
                                    {request.profiles?.city && request.profiles?.country && (
                                      <span>{request.profiles.city}, {request.profiles.country}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {request.status === 'pending' && (
                                    <ClockIcon size={16} className="text-yellow-500" />
                                  )}
                                  {request.status === 'approved' && (
                                    <CheckCircle size={16} className="text-green-500" />
                                  )}
                                  {request.status === 'rejected' && (
                                    <XCircle size={16} className="text-red-500" />
                                  )}
                                  <span className={`text-sm font-medium capitalize ${
                                    request.status === 'pending' ? 'text-yellow-400' :
                                    request.status === 'approved' ? 'text-green-400' :
                                    'text-red-400'
                                  }`}>
                                    {request.status}
                                  </span>
                                </div>
                              </div>

                              {request.profiles?.bio && (
                                <p className="text-gray-300 text-sm mb-3">{request.profiles.bio}</p>
                              )}

                              {/* Interests and Preferences */}
                              {(request.profiles?.interests || request.profiles?.preferences) && (
                                <div className="mb-3">
                                  {request.profiles?.interests && request.profiles.interests.length > 0 && (
                                    <div className="mb-2">
                                      <span className="text-xs text-gray-500 uppercase tracking-wide">Interests:</span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {request.profiles.interests.slice(0, 3).map((interest, idx) => (
                                          <span key={idx} className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                                            {interest}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {request.profiles?.preferences && request.profiles.preferences.length > 0 && (
                                    <div>
                                      <span className="text-xs text-gray-500 uppercase tracking-wide">Looking for:</span>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {request.profiles.preferences.slice(0, 3).map((pref, idx) => (
                                          <span key={idx} className="px-2 py-1 bg-pink-500/20 text-pink-400 text-xs rounded-full">
                                            {pref}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {request.message && (
                                <div className="bg-gray-700/50 rounded-lg p-3 mb-3">
                                  <p className="text-gray-300 text-sm">{request.message}</p>
                                </div>
                              )}

                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                  Requested {new Date(request.created_at).toLocaleDateString()}
                                </span>

                                {request.status === 'pending' && (
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => handleRequestAction(request.id, 'reject')}
                                      className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 rounded text-sm transition-all duration-200"
                                    >
                                      Reject
                                    </button>
                                    <button
                                      onClick={() => handleRequestAction(request.id, 'approve')}
                                      className="px-3 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 hover:text-green-300 border border-green-500/30 hover:border-green-500/50 rounded text-sm transition-all duration-200"
                                    >
                                      Approve
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <MessageSquare size={48} className="text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">No requests yet</h3>
                        <p className="text-gray-400">Join requests will appear here when people want to join your event.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Attendee Count */}
            <div className="border-t border-gray-800 pt-6 mb-6">
              <div className="flex items-center justify-center space-x-2 text-gray-300">
                <UserCheck size={18} className="text-purple-500" />
                <span className="font-medium">
                  {attendeeCount} / {event.capacity} {attendeeCount === 1 ? 'person' : 'people'} attending
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            {user ? (
              <div className="border-t border-gray-800 pt-6">
                {canUserModifyEvent ? (
                  <div className="flex flex-col items-center space-y-4">
                    <button
                      onClick={handleDeleteEvent}
                      disabled={isDeleting}
                      className="px-6 py-3 bg-red-600/20 hover:bg-red-600/30 disabled:bg-red-600/10 text-red-400 hover:text-red-300 disabled:text-red-500 border border-red-500/30 hover:border-red-500/50 disabled:border-red-500/20 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Event'}
                    </button>
                    <button
                      onClick={() => event && onEditClick?.(event)}
                      className="px-6 py-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 hover:text-purple-300 border border-purple-500/30 hover:border-purple-500/50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                    >
                      Edit Event
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-4">
                    <button
                      onClick={handleJoinRequest}
                      disabled={joinRequestStatus === 'pending'}
                      className={`px-8 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 flex items-center space-x-2 ${
                        joinRequestStatus === 'approved'
                          ? 'bg-green-600/20 text-green-400 border border-green-500/30 cursor-default transform-none'
                          : joinRequestStatus === 'pending'
                          ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 cursor-not-allowed transform-none'
                          : joinRequestStatus === 'rejected'
                          ? 'bg-red-600/20 text-red-400 border border-red-500/30 cursor-not-allowed transform-none'
                          : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white hover:shadow-purple-500/25 focus:ring-purple-500'
                      }`}
                    >
                      <UserCheck size={18} />
                      <span>
                        {joinRequestStatus === 'approved' ? 'Approved ✓' :
                         joinRequestStatus === 'pending' ? 'Request Pending...' :
                         joinRequestStatus === 'rejected' ? 'Request Rejected' :
                         'Request to Join'}
                      </span>
                    </button>
                    <p className="text-gray-400 text-sm text-center">
                      {joinRequestStatus === 'pending' ? 'Your request is being reviewed by the host' :
                       joinRequestStatus === 'approved' ? 'You\'re approved for this event!' :
                       joinRequestStatus === 'rejected' ? 'Your request was not approved for this event' :
                       'Send a request to join this small group outing'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-t border-gray-800 pt-6">
                <div className="flex flex-col items-center space-y-4">
                  <button
                    onClick={onJoinClick}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 flex items-center space-x-2"
                  >
                    <UserCheck size={18} />
                    <span>Join to Request</span>
                  </button>
                  <p className="text-gray-400 text-sm text-center">
                    Create an account to request to join events and connect with the community
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    🔒 Exact location visible to approved members only
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Join Request Modal */}
      <JoinRequestModal
        isOpen={isJoinRequestModalOpen}
        onClose={() => setIsJoinRequestModalOpen(false)}
        eventTitle={event?.title || ''}
        eventId={event?.id || 0}
        onRequestSent={handleRequestSent}
      />
    </div>
  );
};

export default EventModal;