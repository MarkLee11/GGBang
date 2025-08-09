import React, { useEffect, useState } from 'react';
import { supabase, type Event } from '../lib/supabase';
import EventCard from './EventCard';

const EventGrid: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select(
          `id, title, description, location, country, date, time, category, image, capacity, place_hint`
        )
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
      } else {
        setEvents(data || []);
      }
      setLoading(false);
    };

    fetchEvents();
  }, []);

  if (loading) {
    return <p className="text-gray-400">Loading events...</p>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard
          key={event.id}
          title={event.title}
          description={event.description || ''}
          location={event.location}
          country={event.country}
          date={event.date}
          time={event.time}
          category={event.category}
          image={event.image || '/placeholder.jpg'}
          capacity={event.capacity}
          place_hint={event.place_hint}
          onViewDetails={() => {
            // TODO: 打开 EventModal 逻辑
            console.log(`View details for event ${event.id}`);
          }}
        />
      ))}
    </div>
  );
};

export default EventGrid;

