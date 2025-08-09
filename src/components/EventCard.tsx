import React from 'react';
import { MapPin, Calendar, Clock, User, Tag, Users } from 'lucide-react';

interface EventCardProps {
  title: string;
  description: string;
  location: string | null;
  country: string | null;
  date: string;
  time: string;
  category: string;
  image: string;
  capacity: number | null;
  place_hint: string | null;
  onViewDetails: () => void;
}

const EventCard: React.FC<EventCardProps> = ({
  title,
  description,
  location,
  country,
  date,
  time,
  category,
  image,
  capacity,
  place_hint,
  onViewDetails,
}) => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden hover:border-purple-500/30 transition-all duration-300 group cursor-pointer">
      <div className="relative">
        <img 
          src={image} 
          alt={title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-4 left-4">
          <span className="bg-purple-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
            <Tag size={14} className="mr-1" />
            {category}
          </span>
        </div>
        {capacity && (
          <div className="absolute top-4 right-4">
            <span className="bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
              <Users size={14} className="mr-1" />
              {capacity}
            </span>
          </div>
        )}
      </div>
      
      <div className="p-6">
        <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-purple-400 transition-colors duration-200 line-clamp-2">
          {title}
        </h3>
        
        {description && (
          <p className="text-gray-400 text-sm mb-4 line-clamp-2">
            {description}
          </p>
        )}
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-gray-300 text-sm">
            <Calendar size={16} className="mr-2 text-purple-400" />
            <span>{date}</span>
          </div>
          
          <div className="flex items-center text-gray-300 text-sm">
            <Clock size={16} className="mr-2 text-purple-400" />
            <span>{time}</span>
          </div>
          
          {(place_hint || location) && (
            <div className="flex items-center text-gray-300 text-sm">
              <MapPin size={16} className="mr-2 text-purple-400" />
              <span>{place_hint || location}</span>
              {country && <span className="ml-1">• {country}</span>}
            </div>
          )}
        </div>
        
        <button
          onClick={onViewDetails}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          View Details
        </button>
      </div>
    </div>
  );
};

export default EventCard;