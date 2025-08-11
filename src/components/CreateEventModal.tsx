import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, User, Tag, FileText, Upload, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { convertLocalToUTC, isEventInFuture } from '../utils/dateUtils';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated?: () => void;
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({ isOpen, onClose, onEventCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    country: 'United States',
    category: 'Other',
    image: null as File | null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const categories = ['Bar', 'Club', 'Festival', 'Social Meetup', 'Home Party', 'Other'];

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

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({
      ...prev,
      image: file
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Validate that event is not in the past (using local time)
      if (!isEventInFuture(formData.date, formData.time)) {
        throw new Error('Event date and time must be in the future');
      }

      // Convert local time to UTC for storage
      const { date: utcDate, time: utcTime } = convertLocalToUTC(formData.date, formData.time);

      // Get current user for organizer info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to create an event');
      }

      const organizerName = user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown Organizer';

      let imageUrl = null;

      // Upload image if provided
      if (formData.image) {
        const fileExt = formData.image.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `event-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('event-images')
          .upload(filePath, formData.image);

        if (uploadError) {
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }

        // Get public URL for the uploaded image
        const { data: { publicUrl } } = supabase.storage
          .from('event-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Create event in database (store UTC time)
      const { error: insertError } = await supabase
        .from('events')
        .insert([
          {
            title: formData.title,
            description: formData.description || null,
            date: utcDate,  // Store UTC date
            time: utcTime,  // Store UTC time
            location: formData.location,
            country: formData.country,
            organizer: organizerName,
            category: formData.category,
            image: imageUrl,
            user_id: user.id,  // Always insert the authenticated user's UID
            capacity: 6,  // Default capacity for small gay outings
            place_hint: formData.location,  // Use location as place hint
            place_exact: null,  // No exact location initially
            place_exact_visible: false  // Exact location not visible initially
          }
        ]);

      if (insertError) {
        throw new Error(`Failed to create event: ${insertError.message}`);
      }

      // Success - close modal and refresh events
      onClose();
      if (onEventCreated) {
        onEventCreated();
      }

    } catch (error) {
      console.error('Error creating event:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        country: 'United States',
        category: 'Other',
        image: null
      });
      setSubmitError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-event-title"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden animate-modal-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 id="create-event-title" className="text-2xl font-bold text-white">
            Create New Event
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            {/* Error Message */}
            {submitError && (
              <div className="p-4 bg-red-900/50 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm">{submitError}</p>
              </div>
            )}

            {/* Event Title */}
            <div>
              <label htmlFor="title" className="flex items-center text-sm font-medium text-gray-300 mb-2">
                <Tag size={16} className="mr-2 text-purple-500" />
                Event Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter event title"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="flex items-center text-sm font-medium text-gray-300 mb-2">
                <FileText size={16} className="mr-2 text-purple-500" />
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 resize-none"
                placeholder="Describe your event..."
              />
            </div>

            {/* Date and Time Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="flex items-center text-sm font-medium text-gray-300 mb-2">
                  <Calendar size={16} className="mr-2 text-purple-500" />
                  Date *
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="time" className="flex items-center text-sm font-medium text-gray-300 mb-2">
                  <Clock size={16} className="mr-2 text-purple-500" />
                  Time *
                </label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="flex items-center text-sm font-medium text-gray-300 mb-2">
                <MapPin size={16} className="mr-2 text-purple-500" />
                City *
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter city name"
              />
            </div>

            {/* Country */}
            <div>
              <label htmlFor="country" className="flex items-center text-sm font-medium text-gray-300 mb-2">
                <MapPin size={16} className="mr-2 text-purple-500" />
                Country *
              </label>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              >
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Germany">Germany</option>
                <option value="Netherlands">Netherlands</option>
                <option value="France">France</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
                <option value="Spain">Spain</option>
                <option value="Italy">Italy</option>
                <option value="Brazil">Brazil</option>
                <option value="Mexico">Mexico</option>
                <option value="Argentina">Argentina</option>
                <option value="Sweden">Sweden</option>
                <option value="Norway">Norway</option>
                <option value="Denmark">Denmark</option>
                <option value="Belgium">Belgium</option>
                <option value="Switzerland">Switzerland</option>
                <option value="Austria">Austria</option>
                <option value="Portugal">Portugal</option>
                <option value="Ireland">Ireland</option>
                <option value="New Zealand">New Zealand</option>
                <option value="South Africa">South Africa</option>
                <option value="Japan">Japan</option>
                <option value="Thailand">Thailand</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {/* Category */}
            <div>
              <label htmlFor="category" className="flex items-center text-sm font-medium text-gray-300 mb-2">
                <Tag size={16} className="mr-2 text-purple-500" />
                Category *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              >
                {categories.map((category) => (
                  <option key={category} value={category} className="bg-gray-800">
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Image Upload */}
            <div>
              <label htmlFor="image" className="flex items-center text-sm font-medium text-gray-300 mb-2">
                <Upload size={16} className="mr-2 text-purple-500" />
                Event Image
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="image"
                  name="image"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                />
                {formData.image && (
                  <div className="mt-2 flex items-center text-sm text-gray-400">
                    <ImageIcon size={16} className="mr-2 text-purple-500" />
                    <span>Selected: {formData.image.name}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Optional: Upload an image for your event (JPG, PNG, GIF)
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-800 bg-gray-900/50">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 text-gray-300 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:transform-none disabled:shadow-none"
            >
              {isSubmitting ? 'Creating Event...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEventModal;