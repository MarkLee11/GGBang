import React, { useState } from 'react'
import { User, MapPin, Heart, Calendar, Lock, Shield, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { type PublicProfile } from '../lib/supabase'

interface CompactProfileCardProps {
  profile: PublicProfile | null
  canViewSensitive?: boolean
  showSensitiveShield?: boolean
  className?: string
  onProfileClick?: () => void
}

export const CompactProfileCard: React.FC<CompactProfileCardProps> = ({
  profile,
  canViewSensitive = false,
  showSensitiveShield = true,
  className = '',
  onProfileClick
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  if (!profile) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
            <User size={20} className="text-gray-400" />
          </div>
          <div>
            <p className="text-gray-300">Profile not available</p>
            <p className="text-gray-500 text-sm">User information is private</p>
          </div>
        </div>
      </div>
    )
  }

  const images = profile.profile_images || []
  const hasMultipleImages = images.length > 1

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-4">
        {/* Profile Image Section */}
        <div className="relative flex-shrink-0">
          {images.length > 0 ? (
            <div className="relative">
              <img
                src={images[currentImageIndex]}
                alt={profile.display_name || 'User'}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-600"
              />
              {hasMultipleImages && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center text-white hover:bg-gray-700 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center text-white hover:bg-gray-700 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center text-xs text-white font-medium">
                    {images.length}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
              <User size={24} className="text-gray-400" />
            </div>
          )}
        </div>

        {/* User Info Section */}
        <div className="flex-1 min-w-0">
          {/* Name - Clickable with underline */}
          <button
            onClick={onProfileClick}
            className="text-left w-full group"
          >
            <h4 className="text-white font-semibold text-lg group-hover:text-purple-300 transition-colors underline decoration-gray-500 hover:decoration-purple-400">
              {profile.display_name || 'Anonymous User'}
            </h4>
          </button>

          {/* Bio */}
          {profile.bio && (
            <p className="text-gray-300 text-sm mt-2 leading-relaxed line-clamp-2">
              {profile.bio}
            </p>
          )}

          {/* Basic Info Row */}
          <div className="flex items-center space-x-4 mt-3 text-sm text-gray-400">
            {profile.age && (
              <div className="flex items-center space-x-1">
                <Calendar size={14} />
                <span>{profile.age} years old</span>
              </div>
            )}
            {profile.city && (
              <div className="flex items-center space-x-1">
                <MapPin size={14} />
                <span>{profile.city}</span>
                {profile.country && <span>, {profile.country}</span>}
              </div>
            )}
            {profile.is_verified && (
              <div className="flex items-center space-x-1 text-green-400">
                <Shield size={14} />
                <span>Verified</span>
              </div>
            )}
          </div>

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {profile.interests.slice(0, 3).map((interest, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded-full border border-purple-500/30"
                >
                  {interest}
                </span>
              ))}
              {profile.interests.length > 3 && (
                <span className="px-2 py-1 bg-gray-600/20 text-gray-400 text-xs rounded-full">
                  +{profile.interests.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
