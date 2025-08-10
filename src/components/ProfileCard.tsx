import React, { useState } from 'react'
import { User, MapPin, Heart, Calendar, Lock, Shield, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { type PublicProfile } from '../lib/supabase'

interface ProfileCardProps {
  profile: PublicProfile | null
  canViewSensitive?: boolean
  showSensitiveShield?: boolean
  compact?: boolean
  className?: string
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  canViewSensitive = false,
  showSensitiveShield = true,
  compact = false,
  className = ''
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showSensitiveTooltip, setShowSensitiveTooltip] = useState(false)

  if (!profile) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
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

  const formatHeight = (cm: number | null) => {
    if (!cm) return null
    const feet = Math.floor(cm / 30.48)
    const inches = Math.round((cm / 30.48 - feet) * 12)
    return `${cm}cm (${feet}'${inches}")`
  }

  const getSensitiveFieldDisplay = (field: any, label: string) => {
    if (canViewSensitive && field) {
      return field
    }
    if (showSensitiveShield && field) {
      return (
        <div className="flex items-center space-x-1 text-gray-500">
          <Lock size={12} />
          <span className="text-xs">Private</span>
        </div>
      )
    }
    return null
  }

  // Compact version for small spaces
  if (compact) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          {/* Profile Image */}
          <div className="relative flex-shrink-0">
            {images.length > 0 ? (
              <img
                src={images[0]}
                alt={profile.display_name || 'User'}
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-600"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                <User size={20} className="text-gray-400" />
              </div>
            )}
            {hasMultipleImages && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center text-xs text-white">
                {images.length}
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-medium truncate">
              {profile.display_name || 'Anonymous User'}
            </h4>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              {profile.age && <span>{profile.age}</span>}
              {profile.city && (
                <span className="flex items-center space-x-1">
                  <MapPin size={12} />
                  <span className="truncate">{profile.city}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Full profile card
  return (
    <div className={`bg-gray-800 rounded-lg overflow-hidden border border-gray-700 ${className}`}>
      {/* Image Carousel */}
      {images.length > 0 ? (
        <div className="relative h-64 bg-gray-700">
          <img
            src={images[currentImageIndex]}
            alt={`${profile.display_name} - ${currentImageIndex + 1}`}
            className="w-full h-full object-cover"
          />
          
          {/* Image Navigation */}
          {hasMultipleImages && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <ChevronRight size={16} />
              </button>
              
              {/* Image Indicators */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
              
              {/* Image Counter */}
              <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                {currentImageIndex + 1}/{images.length}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="h-64 bg-gray-700 flex items-center justify-center">
          <User size={48} className="text-gray-500" />
        </div>
      )}

      {/* Profile Information */}
      <div className="p-6 space-y-4">
        {/* Name and Basic Info */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold text-white">
              {profile.display_name || 'Anonymous User'}
            </h3>
            {profile.is_verified && (
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
            {profile.age && (
              <span className="flex items-center space-x-1">
                <Calendar size={12} />
                <span>{profile.age} years old</span>
              </span>
            )}
            
            {(profile.city || profile.country) && (
              <span className="flex items-center space-x-1">
                <MapPin size={12} />
                <span>
                  {[profile.city, profile.country].filter(Boolean).join(', ')}
                </span>
              </span>
            )}
            
            {profile.relationship_status && (
              <span className="flex items-center space-x-1">
                <Heart size={12} />
                <span className="capitalize">
                  {profile.relationship_status.replace('_', ' ')}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div>
            <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Physical Info */}
        {(profile.height_cm || profile.weight_kg || profile.body_type) && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Physical</h4>
            <div className="flex flex-wrap gap-2">
              {profile.height_cm && (
                <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                  {formatHeight(profile.height_cm)}
                </span>
              )}
              {profile.weight_kg && (
                <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                  {profile.weight_kg}kg
                </span>
              )}
              {profile.body_type && (
                <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded capitalize">
                  {profile.body_type.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Interests */}
        {profile.interests && profile.interests.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Interests</h4>
            <div className="flex flex-wrap gap-1">
              {profile.interests.slice(0, 6).map((interest, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded border border-purple-500/30"
                >
                  {interest}
                </span>
              ))}
              {profile.interests.length > 6 && (
                <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded">
                  +{profile.interests.length - 6} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Preferences */}
        {profile.preferences && profile.preferences.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Looking For</h4>
            <div className="flex flex-wrap gap-1">
              {profile.preferences.slice(0, 3).map((preference, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-pink-600/20 text-pink-300 text-xs rounded border border-pink-500/30"
                >
                  {preference}
                </span>
              ))}
              {profile.preferences.length > 3 && (
                <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded">
                  +{profile.preferences.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Sensitive Information */}
        {((profile as any).hiv_status || (profile as any).prep_usage || (profile as any).social_links) && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-300">Health & Social</h4>
              {showSensitiveShield && !canViewSensitive && (
                <div className="relative">
                  <button
                    onMouseEnter={() => setShowSensitiveTooltip(true)}
                    onMouseLeave={() => setShowSensitiveTooltip(false)}
                    className="flex items-center space-x-1 text-yellow-400 hover:text-yellow-300"
                  >
                    <Shield size={14} />
                    <Info size={12} />
                  </button>
                  
                  {showSensitiveTooltip && (
                    <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-gray-900 border border-gray-600 rounded-lg text-xs text-gray-300 z-10">
                      Sensitive info is visible to hosts reviewing your request or approved members of the same event.
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              {((profile as any).hiv_status) && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">HIV Status:</span>
                  {getSensitiveFieldDisplay((profile as any).hiv_status, 'HIV Status') && (
                    <span className="text-xs text-gray-300 capitalize">
                      {canViewSensitive ? (profile as any).hiv_status.replace('_', ' ') : getSensitiveFieldDisplay((profile as any).hiv_status, 'HIV Status')}
                    </span>
                  )}
                </div>
              )}
              
              {((profile as any).prep_usage) && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">PrEP:</span>
                  {getSensitiveFieldDisplay((profile as any).prep_usage, 'PrEP Usage') && (
                    <span className="text-xs text-gray-300 capitalize">
                      {canViewSensitive ? (profile as any).prep_usage.replace('_', ' ') : getSensitiveFieldDisplay((profile as any).prep_usage, 'PrEP Usage')}
                    </span>
                  )}
                </div>
              )}
              
              {((profile as any).social_links) && Object.keys((profile as any).social_links || {}).length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Social Links:</span>
                  {canViewSensitive ? (
                    <div className="flex space-x-1">
                      {Object.keys((profile as any).social_links || {}).slice(0, 2).map((platform) => (
                        <span key={platform} className="text-xs text-purple-300">
                          {platform}
                        </span>
                      ))}
                      {Object.keys((profile as any).social_links || {}).length > 2 && (
                        <span className="text-xs text-gray-400">+{Object.keys((profile as any).social_links || {}).length - 2}</span>
                      )}
                    </div>
                  ) : (
                    getSensitiveFieldDisplay((profile as any).social_links, 'Social Links')
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Last Seen */}
        {profile.last_seen && (
          <div className="pt-2 border-t border-gray-700">
            <p className="text-xs text-gray-500">
              Last seen {new Date(profile.last_seen).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}