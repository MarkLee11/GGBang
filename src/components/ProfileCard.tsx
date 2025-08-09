import React, { useState, useEffect } from 'react';
import { 
  User, 
  MapPin, 
  Calendar, 
  Heart, 
  Tag, 
  Ruler, 
  Weight,
  Shield,
  Eye,
  EyeOff,
  CheckCircle,
  Clock,
  AlertTriangle,
  Link as LinkIcon,
  Instagram,
  Twitter,
  MessageCircle
} from 'lucide-react';
import { getFullProfileInfo, type Profile } from '../lib/supabase';

interface ProfileCardProps {
  userId: string;
  eventId?: number;
  showSensitive?: boolean;
  className?: string;
  onProfileLoad?: (profile: Profile | null) => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  userId,
  eventId,
  showSensitive = false,
  className = '',
  onProfileLoad
}) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [userId, eventId]);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getFullProfileInfo(userId, eventId);
      if (result.success && result.data) {
        setProfile(result.data);
        onProfileLoad?.(result.data);
      } else {
        setError(result.error || 'Failed to load profile');
      }
    } catch (err) {
      setError('Failed to load profile');
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const nextImage = () => {
    if (profile?.profile_images && profile.profile_images.length > 1) {
      setCurrentImageIndex((prev) => 
        (prev + 1) % profile.profile_images.length
      );
    }
  };

  const prevImage = () => {
    if (profile?.profile_images && profile.profile_images.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? profile.profile_images.length - 1 : prev - 1
      );
    }
  };

  const formatAge = (age: number | null) => {
    return age ? `${age} years old` : 'Age not specified';
  };

  const formatLocation = (city: string | null, country: string | null) => {
    if (city && country) return `${city}, ${country}`;
    if (city) return city;
    if (country) return country;
    return 'Location not specified';
  };

  const formatBodyInfo = (height: number | null, weight: number | null, bodyType: string | null) => {
    const parts = [];
    if (height) parts.push(`${height}cm`);
    if (weight) parts.push(`${weight}kg`);
    if (bodyType) parts.push(bodyType.charAt(0).toUpperCase() + bodyType.slice(1));
    return parts.join(' • ') || 'Not specified';
  };

  const formatStatus = (status: string | null) => {
    if (!status) return 'Not specified';
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram': return Instagram;
      case 'twitter': return Twitter;
      case 'tiktok': return MessageCircle;
      case 'snapchat': return MessageCircle;
      default: return LinkIcon;
    }
  };

  if (loading) {
    return (
      <div className={`bg-gray-800/50 rounded-xl border border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="aspect-square bg-gray-700 rounded-lg mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            <div className="h-3 bg-gray-700 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={`bg-gray-800/50 rounded-xl border border-gray-700 p-6 ${className}`}>
        <div className="text-center text-gray-400">
          <User size={48} className="mx-auto mb-2 opacity-50" />
          <p>{error || 'Profile not available'}</p>
        </div>
      </div>
    );
  }

  const canViewSensitive = profile.can_view_sensitive || showSensitive;
  const hasImages = profile.profile_images && profile.profile_images.length > 0;

  return (
    <div className={`bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden ${className}`}>
      {/* Image Carousel */}
      <div className="relative aspect-square bg-gray-700">
        {hasImages ? (
          <>
            <img
              src={profile.profile_images[currentImageIndex]}
              alt={`${profile.display_name || 'User'} - Image ${currentImageIndex + 1}`}
              className="w-full h-full object-cover"
            />
            
            {/* Image Navigation */}
            {profile.profile_images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                  aria-label="Previous image"
                >
                  ←
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                  aria-label="Next image"
                >
                  →
                </button>
                
                {/* Image Indicators */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
                  {profile.profile_images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Verification Badge */}
            {profile.is_verified && (
              <div className="absolute top-2 right-2 bg-green-600 text-white p-1 rounded-full">
                <CheckCircle size={16} />
              </div>
            )}

            {/* Online Status */}
            {profile.last_seen && (
              <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
                <Clock size={12} className="inline mr-1" />
                {new Date(profile.last_seen) > new Date(Date.now() - 5 * 60 * 1000) ? 'Online' : 'Recently active'}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
            <User size={48} className="text-white" />
          </div>
        )}
      </div>

      {/* Profile Info */}
      <div className="p-4 space-y-4">
        {/* Basic Info */}
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <span>{profile.display_name || 'Anonymous User'}</span>
            {profile.is_verified && (
              <CheckCircle size={16} className="text-green-400" />
            )}
          </h3>
          <div className="flex items-center space-x-1 text-gray-400 text-sm mt-1">
            <Calendar size={12} />
            <span>{formatAge(profile.age)}</span>
          </div>
          <div className="flex items-center space-x-1 text-gray-400 text-sm">
            <MapPin size={12} />
            <span>{formatLocation(profile.city, profile.country)}</span>
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

        {/* Interests */}
        {profile.interests && profile.interests.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center space-x-1">
              <Heart size={12} />
              <span>Interests</span>
            </h4>
            <div className="flex flex-wrap gap-1">
              {profile.interests.slice(0, 6).map((interest, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded-full"
                >
                  {interest}
                </span>
              ))}
              {profile.interests.length > 6 && (
                <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded-full">
                  +{profile.interests.length - 6} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Preferences */}
        {profile.preferences && profile.preferences.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center space-x-1">
              <Tag size={12} />
              <span>Looking For</span>
            </h4>
            <div className="flex flex-wrap gap-1">
              {profile.preferences.slice(0, 4).map((preference, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-pink-600/20 text-pink-300 text-xs rounded-full"
                >
                  {preference}
                </span>
              ))}
              {profile.preferences.length > 4 && (
                <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded-full">
                  +{profile.preferences.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Physical Info */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center space-x-1">
            <Ruler size={12} />
            <span>Physical</span>
          </h4>
          <div className="space-y-1 text-xs text-gray-400">
            <p>{formatBodyInfo(profile.height_cm, profile.weight_kg, profile.body_type)}</p>
            {profile.relationship_status && (
              <p>Relationship: {formatStatus(profile.relationship_status)}</p>
            )}
          </div>
        </div>

        {/* Sensitive Information */}
        {canViewSensitive && (
          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-300 flex items-center space-x-1">
                <Shield size={12} />
                <span>Sensitive Info</span>
              </h4>
              <button
                onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
                className="text-gray-400 hover:text-white transition-colors"
                title={showSensitiveInfo ? 'Hide sensitive info' : 'Show sensitive info'}
              >
                {showSensitiveInfo ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
            
            {showSensitiveInfo && (
              <div className="space-y-2 text-xs text-gray-400">
                {profile.hiv_status && (
                  <p>HIV Status: {formatStatus(profile.hiv_status)}</p>
                )}
                {profile.prep_usage && (
                  <p>PrEP: {formatStatus(profile.prep_usage)}</p>
                )}
                
                {/* Social Links */}
                {profile.social_links && Object.keys(profile.social_links).length > 0 && (
                  <div>
                    <p className="text-gray-300 mb-1">Social:</p>
                    <div className="flex space-x-2">
                      {Object.entries(profile.social_links).map(([platform, url]) => {
                        if (!url) return null;
                        const IconComponent = getSocialIcon(platform);
                        return (
                          <a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-white transition-colors"
                            title={`${platform.charAt(0).toUpperCase() + platform.slice(1)} profile`}
                          >
                            <IconComponent size={14} />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sensitive Info Notice */}
        {!canViewSensitive && (
          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-start space-x-2 text-xs text-gray-500">
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
              <p>
                Sensitive info is visible to hosts reviewing your request or approved members of the same event.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileCard;
