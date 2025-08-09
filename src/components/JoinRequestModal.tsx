import React, { useState, useEffect } from 'react';
import { X, Send, User, MessageSquare } from 'lucide-react';

interface JoinRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  eventId: number;
  onRequestSent: () => void;
}

const JoinRequestModal: React.FC<JoinRequestModalProps> = ({ 
  isOpen, 
  onClose, 
  eventTitle, 
  eventId, 
  onRequestSent 
}) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/join-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          eventId,
          message: message.trim() || null
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send join request');
      }

      // Success
      onRequestSent();
      onClose();
      
    } catch (error) {
      console.error('Error sending join request:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to send join request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMessage('');
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
      aria-labelledby="join-request-title"
    >
      <div className="relative w-full max-w-md bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden animate-modal-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 id="join-request-title" className="text-xl font-bold text-white">
            Request to Join
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Event Info */}
        <div className="p-6 pb-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-500/20 border border-purple-500/30 rounded-full flex items-center justify-center">
              <User size={18} className="text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">{eventTitle}</h3>
              <p className="text-gray-400 text-sm">Small group outing</p>
            </div>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            Send a request to join this event. The host will review your request and let you know if you're approved.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 pt-0 space-y-4">
          {/* Error Message */}
          {submitError && (
            <div className="p-4 bg-red-900/50 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{submitError}</p>
            </div>
          )}

          {/* Message Field */}
          <div>
            <label htmlFor="join-message" className="flex items-center text-sm font-medium text-gray-300 mb-2">
              <MessageSquare size={16} className="mr-2 text-purple-500" />
              Message (Optional)
            </label>
            <textarea
              id="join-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={4}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 resize-none"
              placeholder="Share why you want to join or any questions you have..."
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-500">
                Let the host know why you're interested in joining
              </p>
              <span className="text-xs text-gray-500">
                {message.length}/500
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800/50 text-gray-300 hover:text-white disabled:text-gray-500 border border-gray-700 hover:border-gray-600 disabled:border-gray-700/50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:transform-none disabled:shadow-none flex items-center justify-center space-x-2"
            >
              <Send size={16} />
              <span>{isSubmitting ? 'Sending...' : 'Send Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinRequestModal;