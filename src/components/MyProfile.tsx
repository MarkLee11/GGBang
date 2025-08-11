import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, MapPin, Edit, Heart, Ruler, Weight, Users, Shield, Pill, Image } from 'lucide-react';
import { supabase } from '../lib/supabase';
import EditProfileModal from './EditProfileModal';

interface MyProfileProps {
  user: any;
  onCreateEventClick?: () => void;
}

const MyProfile: React.FC<MyProfileProps> = ({ user, onCreateEventClick }) => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [showMoreImages, setShowMoreImages] = useState(false);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        setLoading(true);
        setError(null);

        try {
          const { data, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (fetchError) {
            throw fetchError;
          }

          setUserProfile(data);
        } catch (err) {
          console.error('Error fetching user profile:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch profile');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleEditProfileClick = () => {
    setIsEditProfileModalOpen(true);
  };

  const handleCloseEditProfileModal = () => {
    setIsEditProfileModalOpen(false);
  };

  const handleProfileUpdated = () => {
    // Refresh profile data after update
    if (user) {
      const refreshProfile = async () => {
        try {
          const { data, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (!fetchError) {
            setUserProfile(data);
          }
        } catch (err) {
          console.error('Error refreshing profile:', err);
        }
      };

      refreshProfile();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black pt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <p className="text-gray-400 mt-4">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black pt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <p className="text-red-400 mb-4">Error loading profile: {error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-purple-400 hover:text-purple-300 transition-colors duration-200"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Title Banner */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            My Profile
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-purple-600 to-pink-600 mx-auto mt-2 rounded-full"></div>
        </div>

        {/* Profile Header Card */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-8 mb-8">
          <div className="flex items-center space-x-6">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center overflow-hidden">
                {userProfile?.profile_images && userProfile.profile_images.length > 0 ? (
                  <img 
                    src={userProfile.profile_images[0]} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={40} className="text-white" />
                )}
              </div>
              
              {/* Show More Images Button */}
              {userProfile?.profile_images && userProfile.profile_images.length > 1 && (
                <button
                  onClick={() => setShowMoreImages(!showMoreImages)}
                  className="px-2 py-1 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-purple-200 border border-purple-500/30 rounded transition-all duration-200"
                >
                  Show More Photos
                </button>
              )}
            </div>
            
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white mb-2">
                {userProfile?.display_name || user?.email?.split('@')[0] || 'User'}
              </h2>
              <div className="flex items-center space-x-3">
                <Mail size={20} className="text-purple-400" />
                <p className="text-gray-300 text-lg">{user?.email}</p>
              </div>
              {userProfile?.bio && (
                <p className="text-gray-400 mt-3 text-lg">{userProfile.bio}</p>
              )}
            </div>
          </div>
          
          {/* Additional Images Display */}
          {showMoreImages && userProfile?.profile_images && userProfile.profile_images.length > 1 && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {userProfile.profile_images.slice(1).map((imageUrl: string, index: number) => (
                  <div key={index + 1} className="aspect-square overflow-hidden rounded-lg border border-gray-600">
                    <img
                      src={imageUrl}
                      alt={`Profile ${index + 2}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile Information Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Left Column - Basic Information */}
          <div className="space-y-6">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <User size={20} className="text-purple-400 mr-2" />
                Basic Information
              </h3>
              <div className="space-y-4">
                {userProfile?.age && (
                  <div className="flex items-center space-x-3">
                    <Calendar size={18} className="text-purple-400" />
                    <div>
                      <p className="text-gray-400 text-sm">Age</p>
                      <p className="text-white">{userProfile.age} years old</p>
                    </div>
                  </div>
                )}
                
                {userProfile?.city && (
                  <div className="flex items-center space-x-3">
                    <MapPin size={18} className="text-purple-400" />
                    <div>
                      <p className="text-gray-400 text-sm">City</p>
                      <p className="text-white">{userProfile.city}</p>
                    </div>
                  </div>
                )}
                
                {userProfile?.country && (
                  <div className="flex items-center space-x-3">
                    <MapPin size={18} className="text-purple-400" />
                    <div>
                      <p className="text-gray-400 text-sm">Country</p>
                      <p className="text-white">{userProfile.country}</p>
                    </div>
                  </div>
                )}
                

              </div>
            </div>

            {/* Physical Information */}
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Ruler size={20} className="text-purple-400 mr-2" />
                Physical Information
              </h3>
              <div className="space-y-4">
                {userProfile?.height_cm && (
                  <div className="flex items-center space-x-3">
                    <Ruler size={18} className="text-purple-400" />
                    <div>
                      <p className="text-gray-400 text-sm">Height</p>
                      <p className="text-white">{userProfile.height_cm} cm</p>
                    </div>
                  </div>
                )}
                
                {userProfile?.weight_kg && (
                  <div className="flex items-center space-x-3">
                    <Weight size={18} className="text-purple-400" />
                    <div>
                      <p className="text-gray-400 text-sm">Weight</p>
                      <p className="text-white">{userProfile.weight_kg} kg</p>
                    </div>
                  </div>
                )}
                
                {userProfile?.body_type && (
                  <div className="flex items-center space-x-3">
                    <User size={18} className="text-purple-400" />
                    <div>
                      <p className="text-gray-400 text-sm">Body Type</p>
                      <p className="text-white capitalize">{userProfile.body_type}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Additional Information */}
          <div className="space-y-6">
            {/* Relationship & Social */}
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Heart size={20} className="text-purple-400 mr-2" />
                Relationship & Social
              </h3>
              <div className="space-y-4">
                {userProfile?.relationship_status && (
                  <div className="flex items-center space-x-3">
                    <Heart size={18} className="text-purple-400" />
                    <div>
                      <p className="text-gray-400 text-sm">Relationship Status</p>
                      <p className="text-white capitalize">{userProfile.relationship_status}</p>
                    </div>
                  </div>
                )}
                
                {userProfile?.interests && userProfile.interests.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Interests</p>
                    <div className="flex flex-wrap gap-2">
                      {userProfile.interests.map((interest: string, index: number) => (
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
                
                {userProfile?.preferences && userProfile.preferences.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Preferences</p>
                    <div className="flex flex-wrap gap-2">
                      {userProfile.preferences.map((pref: string, index: number) => (
                        <span 
                          key={index}
                          className="px-3 py-1 bg-pink-600/20 text-pink-300 rounded-full text-sm border border-pink-500/30"
                        >
                          {pref}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Health Information */}
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Shield size={20} className="text-purple-400 mr-2" />
                Health Information
              </h3>
              <div className="space-y-4">
                {userProfile?.hiv_status && (
                  <div className="flex items-center space-x-3">
                    <Shield size={18} className="text-purple-400" />
                    <div>
                      <p className="text-gray-400 text-sm">HIV Status</p>
                      <p className="text-white capitalize">{userProfile.hiv_status}</p>
                    </div>
                  </div>
                )}
                
                {userProfile?.prep_usage && (
                  <div className="flex items-center space-x-3">
                    <Pill size={18} className="text-purple-400" />
                    <div>
                      <p className="text-gray-400 text-sm">PrEP Usage</p>
                      <p className="text-white capitalize">{userProfile.prep_usage}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* System Information */}
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Users size={20} className="text-purple-400 mr-2" />
                System Information
              </h3>
              <div className="space-y-4">
                {userProfile?.is_verified !== undefined && (
                  <div className="flex items-center space-x-3">
                    <Shield size={18} className="text-purple-400" />
                    <div>
                      <p className="text-gray-400 text-sm">Verification Status</p>
                      <p className={`${userProfile.is_verified ? 'text-green-400' : 'text-yellow-400'}`}>
                        {userProfile.is_verified ? 'Verified' : 'Not Verified'}
                      </p>
                    </div>
                  </div>
                )}
                
                {userProfile?.created_at && (
                  <div className="flex items-center space-x-3">
                    <Calendar size={18} className="text-purple-400" />
                    <div>
                      <p className="text-gray-400 text-sm">Member Since</p>
                      <p className="text-white">{new Date(userProfile.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
                
                {userProfile?.last_seen && (
                  <div className="flex items-center space-x-3">
                    <Calendar size={18} className="text-purple-400" />
                    <div>
                      <p className="text-gray-400 text-sm">Last Seen</p>
                      <p className="text-white">{new Date(userProfile.last_seen).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center mb-8">
          <button
            onClick={handleEditProfileClick}
            className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
          >
            <Edit size={20} />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={handleCloseEditProfileModal}
        user={user}
        userProfile={userProfile}
        onProfileUpdated={handleProfileUpdated}
      />
    </div>
  );
};

export default MyProfile;
