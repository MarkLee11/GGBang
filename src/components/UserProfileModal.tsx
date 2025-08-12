import React, { useState } from 'react'
import { X, User, MapPin, Heart, Calendar, Lock, Shield, ChevronLeft, ChevronRight, Info, Mail, Phone } from 'lucide-react'
import { type PublicProfile } from '../lib/supabase'

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profile: PublicProfile | null
  canViewSensitive?: boolean
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  canViewSensitive = false
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  if (!isOpen || !profile) return null

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
    if (field) {
      return (
        <div className="flex items-center space-x-1 text-gray-500">
          <Lock size={12} />
          <span className="text-xs">Private</span>
        </div>
      )
    }
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">User Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-start space-x-6">
              {/* Profile Image */}
              <div className="relative flex-shrink-0">
                {images.length > 0 ? (
                  <div className="relative">
                    <img
                      src={images[currentImageIndex]}
                      alt={profile.display_name || 'User'}
                      className="w-24 h-24 rounded-full object-cover border-4 border-gray-700"
                    />
                    {hasMultipleImages && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute -left-3 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-white hover:bg-gray-700 transition-colors"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-white hover:bg-gray-700 transition-colors"
                        >
                          <ChevronRight size={16} />
                        </button>
                        <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-xs text-white font-medium">
                          {images.length}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center">
                    <User size={32} className="text-gray-400" />
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-2">
                  {profile.display_name || 'Anonymous User'}
                </h3>
                {profile.is_verified && (
                  <div className="flex items-center space-x-2 text-green-400 mb-2">
                    <Shield size={16} />
                    <span className="text-sm font-medium">Verified User</span>
                  </div>
                )}
                {profile.bio && (
                  <p className="text-gray-300 text-lg leading-relaxed">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Basic Information */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Info size={20} className="text-purple-400" />
                <span>Basic Information</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.age && (
                  <div className="flex items-center space-x-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-gray-300">{profile.age} years old</span>
                  </div>
                )}
                {profile.city && (
                  <div className="flex items-center space-x-2">
                    <MapPin size={16} className="text-gray-400" />
                    <span className="text-gray-300">
                      {profile.city}
                      {profile.country && `, ${profile.country}`}
                    </span>
                  </div>
                )}
                {profile.height_cm && (
                  <div className="flex items-center space-x-2">
                    <User size={16} className="text-gray-400" />
                    <span className="text-gray-300">{formatHeight(profile.height_cm)}</span>
                  </div>
                )}
                {profile.weight_kg && (
                  <div className="flex items-center space-x-2">
                    <User size={16} className="text-gray-400" />
                    <span className="text-gray-300">{profile.weight_kg} kg</span>
                  </div>
                )}
                {profile.body_type && (
                  <div className="flex items-center space-x-2">
                    <User size={16} className="text-gray-400" />
                    <span className="text-gray-300 capitalize">{profile.body_type}</span>
                  </div>
                )}
                {profile.relationship_status && (
                  <div className="flex items-center space-x-2">
                    <Heart size={16} className="text-gray-400" />
                    <span className="text-gray-300 capitalize">{profile.relationship_status}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Heart size={20} className="text-purple-400" />
                  <span>Interests</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest, index) => (
                    <span
                      key={index}
                      className="px-3 py-2 bg-purple-600/20 text-purple-300 rounded-full border border-purple-500/30"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Preferences */}
            {profile.preferences && profile.preferences.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Heart size={20} className="text-pink-400" />
                  <span>Preferences</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {profile.preferences.map((preference, index) => (
                    <span
                      key={index}
                      className="px-3 py-2 bg-pink-600/20 text-pink-300 rounded-full border border-pink-500/30"
                    >
                      {preference}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Last Seen */}
            {profile.last_seen && (
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-2">Last Active</h4>
                <p className="text-gray-300">
                  {new Date(profile.last_seen).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
