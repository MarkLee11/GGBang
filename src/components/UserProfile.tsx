import React, { useState, useEffect } from 'react';
import { User, Calendar, MapPin, Clock, Tag, Eye, Plus } from 'lucide-react';
import { supabase, type Event } from '../lib/supabase';
import { formatEventDate, formatEventTime } from '../utils/dateUtils';
import EventModal from './EventModal';

interface UserProfileProps {
  user: any;
  onCreateEventClick?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onCreateEventClick }) => {
  const [activeTab, setActiveTab] = useState<'attending' | 'created'>('attending');
  const [createdEvents, setCreatedEvents] = useState<Event[]>([]);
  const [attendingEvents, setAttendingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  // Fetch user's attending events
  useEffect(() => {
    const fetchAttendingEvents = async () => {
      if (activeTab === 'attending' && user) {
        setLoading(true);
        setError(null);

        try {
          const { data, error: fetchError } = await supabase
            .from('event_attendees')
            .select('event_id')
            .eq('user_id', user.id);

          if (fetchError) {
            throw fetchError;
          }

          // Get the event IDs that the user is attending
          const eventIds = data?.map(item => item.event_id) || [];
          
          if (eventIds.length > 0) {
            // Fetch the actual event details
            const { data: eventsData, error: eventsError } = await supabase
              .from('events')
              .select('*')
              .in('id', eventIds)
              .order('date', { ascending: true });

            if (eventsError) {
              throw eventsError;
            }

            setAttendingEvents(eventsData || []);
          } else {
            setAttendingEvents([]);
          }
        } catch (err) {
          console.error('Error fetching attending events:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch attending events');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchAttendingEvents();
  }, [activeTab, user]);

  // Fetch user's created events
  useEffect(() => {
    const fetchCreatedEvents = async () => {
      if (activeTab === 'created' && user) {
        setLoading(true);
        setError(null);

        try {
          const { data, error: fetchError } = await supabase
            .from('events')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: true });

          if (fetchError) {
            throw fetchError;
          }

          setCreatedEvents(data || []);
        } catch (err) {
          console.error('Error fetching created events:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch events');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchCreatedEvents();
  }, [activeTab, user]);

  const handleViewDetails = (event: Event) => {
    setSelectedEvent(event);
    setIsEventModalOpen(true);
  };

  const handleCloseEventModal = () => {
    setIsEventModalOpen(false);
    setSelectedEvent(null);
  };

  const handleEventDeleted = () => {
    // Close the modal first
    setIsEventModalOpen(false);
    setSelectedEvent(null);
    
    // Refresh both tabs since an event could be deleted from either
    refreshEvents();
  };

  // Function to refresh events based on active tab
  const refreshEvents = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'attending') {
        const { data, error: fetchError } = await supabase
          .from('event_attendees')
          .select('event_id')
          .eq('user_id', user.id);

        if (fetchError) {
          throw fetchError;
        }

        const eventIds = data?.map(item => item.event_id) || [];
        
        if (eventIds.length > 0) {
          const { data: eventsData, error: eventsError } = await supabase
            .from('events')
            .select('*')
            .in('id', eventIds)
            .order('date', { ascending: true });

          if (eventsError) {
            throw eventsError;
          }

          setAttendingEvents(eventsData || []);
        } else {
          setAttendingEvents([]);
        }
      } else if (activeTab === 'created') {
        const { data, error: fetchError } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: true });

        if (fetchError) {
          throw fetchError;
        }

        setCreatedEvents(data || []);
      }
    } catch (err) {
      console.error('Error refreshing events:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh events');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';

  return (
    <div className="min-h-screen bg-black pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            {/* Profile Picture */}
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
              {getInitials(userName)}
            </div>
            
            {/* User Info */}
            <div>
              <h1 className="text-2xl font-bold text-white">{userName}</h1>
              <p className="text-gray-400">{userEmail}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex space-x-0 bg-gray-900/50 rounded-lg p-1 max-w-md">
            <button
              onClick={() => setActiveTab('attending')}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'attending'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              Events Attending
            </button>
            <button
              onClick={() => setActiveTab('created')}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'created'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              Events Created
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'attending' && (
            <div>
              {loading ? (
                <div className="text-center py-16">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  <p className="text-gray-400 mt-4">Loading attending events...</p>
                </div>
              ) : error ? (
                <div className="text-center py-16">
                  <p className="text-red-400 mb-4">Error loading attending events: {error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-purple-400 hover:text-purple-300 transition-colors duration-200"
                  >
                    Try again
                  </button>
                </div>
              ) : attendingEvents.length > 0 ? (
                <div className="space-y-4">
                  {attendingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:bg-gray-900/70 hover:border-purple-500/50 transition-all duration-300"
                    >
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Event Image */}
                        <div className="flex-shrink-0">
                          <div className="w-full md:w-32 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600">
                            <img 
                              src={event.image || 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=400'} 
                              alt={event.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        </div>

                        {/* Event Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-lg font-semibold text-white">
                              {event.title}
                            </h3>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                              <Tag size={10} className="mr-1" />
                              {event.category}
                            </span>
                          </div>

                          <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                            {event.description}
                          </p>

                          <div className="flex flex-wrap gap-4 text-sm text-gray-300 mb-4">
                            <div className="flex items-center">
                              <MapPin size={14} className="mr-1 text-purple-500" />
                              <span>{event.location}, {event.country}</span>
                            </div>
                            <div className="flex items-center">
                              <Calendar size={14} className="mr-1 text-purple-500" />
                              <span>{formatEventDate(event.date)}</span>
                            </div>
                            <div className="flex items-center">
                              <Clock size={14} className="mr-1 text-purple-500" />
                              <span>{formatEventTime(event.time)}</span>
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <button 
                              onClick={() => handleViewDetails(event)}
                              className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-all duration-200 text-sm"
                            >
                              <Eye size={14} className="mr-2" />
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar size={24} className="text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No Events Yet</h3>
                  <p className="text-gray-400 mb-6 max-w-md mx-auto">
                    You haven't marked any events as attending yet. Browse events and start building your calendar!
                  </p>
                  <button
                    onClick={() => {
                      // Navigate to homepage and scroll to events section
                      window.location.href = '/#events';
                      // Alternative approach for better UX
                      setTimeout(() => {
                        const eventsSection = document.getElementById('events');
                        if (eventsSection) {
                          eventsSection.scrollIntoView({ 
                            behavior: 'smooth',
                            block: 'start'
                          });
                        }
                      }, 100);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
                  >
                    Browse Events
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'created' && (
            <div>
              {loading ? (
                <div className="text-center py-16">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  <p className="text-gray-400 mt-4">Loading your events...</p>
                </div>
              ) : error ? (
                <div className="text-center py-16">
                  <p className="text-red-400 mb-4">Error loading events: {error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-purple-400 hover:text-purple-300 transition-colors duration-200"
                  >
                    Try again
                  </button>
                </div>
              ) : createdEvents.length > 0 ? (
                <div className="space-y-4">
                  {createdEvents.map((event) => (
                    <div
                      key={event.id}
                      className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:bg-gray-900/70 hover:border-purple-500/50 transition-all duration-300"
                    >
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Event Image */}
                        <div className="flex-shrink-0">
                          <div className="w-full md:w-32 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600">
                            <img 
                              src={event.image || 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=400'} 
                              alt={event.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        </div>

                        {/* Event Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-lg font-semibold text-white">
                              {event.title}
                            </h3>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                              <Tag size={10} className="mr-1" />
                              {event.category}
                            </span>
                          </div>

                          <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                            {event.description}
                          </p>

                          <div className="flex flex-wrap gap-4 text-sm text-gray-300 mb-4">
                            <div className="flex items-center">
                              <MapPin size={14} className="mr-1 text-purple-500" />
                              <span>{event.location}, {event.country}</span>
                            </div>
                            <div className="flex items-center">
                              <Calendar size={14} className="mr-1 text-purple-500" />
                              <span>{formatEventDate(event.date)}</span>
                            </div>
                            <div className="flex items-center">
                              <Clock size={14} className="mr-1 text-purple-500" />
                              <span>{formatEventTime(event.time)}</span>
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <button 
                              onClick={() => handleViewDetails(event)}
                              className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-all duration-200 text-sm"
                            >
                              <Eye size={14} className="mr-2" />
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User size={24} className="text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No Events Created</h3>
                  <p className="text-gray-400 mb-6 max-w-md mx-auto">
                    You haven't created any events yet. Start organizing and bring your community together!
                  </p>
                  <div className="flex justify-center">
                    <button
                      onClick={onCreateEventClick}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25"
                    >
                      <Plus size={18} className="mr-2" />
                      Create Your First Event
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Event Modal */}
      {isEventModalOpen && selectedEvent && (
        <EventModal
          event={selectedEvent}
          isOpen={isEventModalOpen}
          onClose={handleCloseEventModal}
          onEditClick={(event) => {
            // Close the current modal first
            setIsEventModalOpen(false);
            setSelectedEvent(null);
            // Then trigger the create event modal (which can be used for editing)
            if (onCreateEventClick) {
              onCreateEventClick();
            }
          }}
          onEventDeleted={handleEventDeleted}
          onAttendanceChanged={refreshEvents}
          user={user}
          onJoinClick={() => {
            // For profile page, we don't need join functionality since user is already authenticated
            // This is just to satisfy the prop requirement
          }}
        />
      )}
    </div>
  );
};

export default UserProfile;