import React from 'react'
import { X, MapPin, Calendar, Heart, User, Globe, Instagram, Twitter, Facebook } from 'lucide-react'
import { type HostProfile } from '../hooks/useHostProfile'

interface HostProfileModalProps {
  isOpen: boolean
  onClose: () => void
  hostProfile: HostProfile | null
}

export const HostProfileModal: React.FC<HostProfileModalProps> = ({
  isOpen,
  onClose,
  hostProfile
}) => {
  if (!isOpen || !hostProfile) return null

  const formatHeight = (cm: number | null) => {
    if (!cm) return null
    const feet = Math.floor(cm / 30.48)
    const inches = Math.round((cm / 30.48 - feet) * 12)
    return `${cm}cm (${feet}'${inches}")`
  }

  const formatWeight = (kg: number | null) => {
    if (!kg) return null
    const lbs = Math.round(kg * 2.20462)
    return `${kg}kg (${lbs} lbs)`
  }

  const getBodyTypeLabel = (bodyType: string | null) => {
    if (!bodyType) return null
    const labels: Record<string, string> = {
      'slim': 'Slim',
      'average': 'Average',
      'athletic': 'Athletic',
      'muscular': 'Muscular',
      'bear': 'Bear',
      'chubby': 'Chubby',
      'stocky': 'Stocky',
      'other': 'Other'
    }
    return labels[bodyType] || bodyType
  }

  const getRelationshipStatusLabel = (status: string | null) => {
    if (!status) return null
    const labels: Record<string, string> = {
      'single': 'Single',
      'taken': 'Taken',
      'married': 'Married',
      'open': 'Open',
      'complicated': 'Complicated',
      'not_specified': 'Not Specified'
    }
    return labels[status] || status
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="relative w-12 h-12 flex-shrink-0">
              {hostProfile.profile_images && hostProfile.profile_images.length > 0 ? (
                <img
                  src={hostProfile.profile_images[0]}
                  alt={hostProfile.display_name || 'Host'}
                  className="w-12 h-12 rounded-full object-cover border-2 border-purple-500/30"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                  <User size={24} className="text-white" />
                </div>
              )}
              {hostProfile.is_verified && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {hostProfile.display_name || 'Anonymous Host'}
              </h2>
              <p className="text-gray-400 text-sm">Event Host</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {/* Profile Images */}
          {hostProfile.profile_images && hostProfile.profile_images.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Photos</h3>
              <div className="grid grid-cols-2 gap-3">
                {hostProfile.profile_images.map((image, index) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden">
                    <img
                      src={image}
                      alt={`${hostProfile.display_name || 'Host'} photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bio */}
          {hostProfile.bio && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">About</h3>
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                {hostProfile.bio}
              </p>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Age */}
            {hostProfile.age && (
              <div className="flex items-center space-x-2">
                <Calendar size={16} className="text-purple-400" />
                <span className="text-gray-300">{hostProfile.age} years old</span>
              </div>
            )}

            {/* Location */}
            {(hostProfile.city || hostProfile.country) && (
              <div className="flex items-center space-x-2">
                <MapPin size={16} className="text-purple-400" />
                <span className="text-gray-300">
                  {[hostProfile.city, hostProfile.country].filter(Boolean).join(', ')}
                </span>
              </div>
            )}

            {/* Relationship Status */}
            {hostProfile.relationship_status && (
              <div className="flex items-center space-x-2">
                <Heart size={16} className="text-purple-400" />
                <span className="text-gray-300">
                  {getRelationshipStatusLabel(hostProfile.relationship_status)}
                </span>
              </div>
            )}

            {/* Body Type */}
            {hostProfile.body_type && (
              <div className="flex items-center space-x-2">
                <User size={16} className="text-purple-400" />
                <span className="text-gray-300">
                  {getBodyTypeLabel(hostProfile.body_type)}
                </span>
              </div>
            )}
          </div>

          {/* Physical Information */}
          {(hostProfile.height_cm || hostProfile.weight_kg) && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Physical</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hostProfile.height_cm && (
                  <div className="flex items-center space-x-2">
                    <User size={16} className="text-purple-400" />
                    <span className="text-gray-300">{formatHeight(hostProfile.height_cm)}</span>
                  </div>
                )}
                {hostProfile.weight_kg && (
                  <div className="flex items-center space-x-2">
                    <User size={16} className="text-purple-400" />
                    <span className="text-gray-300">{formatWeight(hostProfile.weight_kg)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interests */}
          {hostProfile.interests && hostProfile.interests.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {hostProfile.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-purple-600/20 text-purple-300 rounded-full text-sm border border-purple-500/30"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Preferences */}
          {hostProfile.preferences && hostProfile.preferences.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Preferences</h3>
              <div className="flex flex-wrap gap-2">
                {hostProfile.preferences.map((preference, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-pink-600/20 text-pink-300 rounded-full text-sm border border-pink-500/30"
                  >
                    {preference}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Social Links */}
          {hostProfile.social_links && Object.keys(hostProfile.social_links).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Social Media</h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(hostProfile.social_links).map(([platform, url]) => {
                  const getIcon = (platform: string) => {
                    switch (platform.toLowerCase()) {
                      case 'instagram': return <Instagram size={16} />
                      case 'twitter': return <Twitter size={16} />
                      case 'facebook': return <Facebook size={16} />
                      default: return <Globe size={16} />
                    }
                  }
                  
                  return (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 px-3 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white rounded-lg transition-colors"
                    >
                      {getIcon(platform)}
                      <span className="capitalize">{platform}</span>
                    </a>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
