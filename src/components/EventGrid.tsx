import React, { forwardRef, useImperativeHandle } from 'react';
import { useState } from 'react';
import EventCard from './EventCard';
import CategoryFilter from './CategoryFilter';
import EventModal from './EventModal';
import EditEventModal from './EditEventModal';
import { useEvents } from '../hooks/useEvents';
import { formatEventDate, formatEventTime } from '../utils/dateUtils';
import { type Event } from '../lib/supabase';
import { type FilterOptions } from './CategoryFilter';

export interface EventGridRef {
  refetch: () => void;
}

interface EventGridProps {
  user?: any;
  onJoinClick?: () => void;
  onClearFilters?: () => void;
}

const EventGrid = forwardRef<EventGridRef, EventGridProps>(({ user, onJoinClick, onClearFilters }, ref) => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [appliedFilters, setAppliedFilters] = useState<FilterOptions | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
  const [displayCount, setDisplayCount] = useState(3);
  
  const { events, loading, error, refetch } = useEvents(activeCategory, appliedFilters);
  
  const categories = ['All', 'Bar', 'Club', 'Festival', 'Social Meetup', 'Home Party', 'Other'];

  // Expose refetch function to parent component
  useImperativeHandle(ref, () => ({
    refetch
  }));

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
  };

  const handleFiltersChange = (filters: FilterOptions) => {
    // Apply the filters to trigger a new query
    setAppliedFilters(filters);
    
    // Update category if it changed
    if (filters.category !== activeCategory) {
      setActiveCategory(filters.category);
    }
  };
  const handleViewDetails = (event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleEditClick = (event: Event) => {
    setEventToEdit(event);
    setIsEditModalOpen(true);
    setIsModalOpen(false); // Close the details modal
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEventToEdit(null);
  };

  const handleEventUpdated = () => {
    refetch(); // Refresh the events list
  };

  const handleClearAllFilters = () => {
    // Step 1: Clear all filter states first
    const defaultFilters = {
      dateFrom: '',
      dateTo: '',
      timeFrom: '',
      timeTo: '',
      city: '',
      country: '',
      category: 'All',
    };
    
    // Reset all local states immediately
    setActiveCategory('All');
    setAppliedFilters(undefined);
    setDisplayCount(3);
    
    // Step 2: Trigger filter clearing event for CategoryFilter component
    const filterClearEvent = new CustomEvent('filters:cleared', {
      detail: { filters: defaultFilters }
    });
    document.dispatchEvent(filterClearEvent);
    
    // Step 3: Update the filters and category to show all events
    handleCategoryChange('All');
    handleFiltersChange(defaultFilters);
  };

  const handleDiscoverMore = () => {
    // Show 3 more events (maximum 3 at a time)
    setDisplayCount(prev => Math.min(prev + 3, events.length));
  };

  const handleEventDeleted = () => {
    // Close modal and refresh events list
    setIsModalOpen(false);
    setSelectedEvent(null);
    
    // Refresh the events list after a short delay
    setTimeout(() => {
      refetch();
    }, 100);
  };

  // Get events to display based on current display count
  const eventsToDisplay = events.slice(0, displayCount);
  const hasMoreEvents = displayCount < events.length;

  return (
    <section id="events" className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            <span className="text-white">Choose your outing type:</span>
          </h2>
        </div>

        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          onFiltersChange={handleFiltersChange}
        />

        <div className="text-center mb-8 mt-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            <span className="text-white">Small Gay Outings</span>{' '}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Near You
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Join small group outings with gay friends in your city
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <p className="text-gray-400 mt-4">Loading events...</p>
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
        ) : (
          <div className="space-y-6 transition-all duration-500">
            {eventsToDisplay.length > 0 ? (
              eventsToDisplay.map((event, index) => (
                <div
                  key={event.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <EventCard 
                    title={event.title}
                    description={event.description || ''}
                    location={event.location}
                    country={event.country}
                    date={formatEventDate(event.date)}
                    time={formatEventTime(event.time)}
                    category={event.category}
                    image={event.image || 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=400'}
                    capacity={event.capacity}
                    place_hint={event.place_hint}
                    onViewDetails={() => handleViewDetails(event)}
                  />
                </div>
              ))
            ) : (
              <div
                className="text-center py-16"
              >
                <div className="text-gray-400 text-lg mb-4">
                  No {activeCategory === 'All' ? 'events' : activeCategory.toLowerCase() + ' events'} found
                </div>
                <p className="text-gray-500 text-sm mb-4">
                  Try adjusting your filters or check back later for new events
                </p>
                <button
                  onClick={handleClearAllFilters}
                  className="text-purple-400 hover:text-purple-300 transition-colors duration-200"
                >
                  View all results
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && !error && eventsToDisplay.length > 0 && hasMoreEvents && (
          <div className="text-center mt-12">
            <button 
              onClick={handleDiscoverMore}
              className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-full transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
            >
              Discover More Gay Events
            </button>
          </div>
        )}
      </div>

      <EventModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        event={selectedEvent}
        onEditClick={handleEditClick}
        onEventDeleted={handleEventDeleted}
        onAttendanceChanged={() => {
          // Refresh events when attendance changes
          refetch();
        }}
        user={user}
        onJoinClick={onJoinClick}
      />

      <EditEventModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        event={eventToEdit}
        onEventUpdated={handleEventUpdated}
      />
    </section>
  );
});

EventGrid.displayName = 'EventGrid';

export default EventGrid;