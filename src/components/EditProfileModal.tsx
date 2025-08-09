import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Trash2, 
  User, 
  MapPin, 
  Calendar, 
  Heart, 
  Tag, 
  Ruler, 
  Weight,
  Shield,
  Link as LinkIcon,
  AlertTriangle,
  Save,
  Plus,
  Minus
} from 'lucide-react';
import { 
  updateUserProfile, 
  uploadProfileImage, 
  deleteProfileImage,
  getInterestCategories,
  getPreferenceOptions,
  getCurrentUserProfile,
  type Profile,
  type InterestCategory,
  type PreferenceOption
} from '../lib/supabase';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
  onProfileUpdated?: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onProfileUpdated
}) => {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Profile data
  const [profile, setProfile] = useState<Partial<Profile>>({
    display_name: '',
    bio: '',
    age: undefined,
    city: '',
    country: '',
    interests: [],
    preferences: [],
    height_cm: undefined,
    weight_kg: undefined,
    body_type: null,
    relationship_status: null,
    hiv_status: null,
    prep_usage: null,
    social_links: {},
    profile_images: []
  });

  // Options data
  const [interestCategories, setInterestCategories] = useState<InterestCategory[]>([]);
  const [preferenceOptions, setPreferenceOptions] = useState<PreferenceOption[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<'basic' | 'interests' | 'physical' | 'sensitive'>('basic');

  useEffect(() => {
    if (isOpen && user) {
      loadProfileData();
      loadOptions();
    }
  }, [isOpen, user]);

  const loadProfileData = async () => {
    try {
      const result = await getCurrentUserProfile();
      if (result.success && result.data) {
        setProfile(result.data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadOptions = async () => {
    try {
      const [interests, preferences] = await Promise.all([
        getInterestCategories(),
        getPreferenceOptions()
      ]);
      setInterestCategories(interests);
      setPreferenceOptions(preferences);
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploadingImage(true);
    setError(null);

    try {
      const result = await uploadProfileImage(file, user.id);
      if (result.success && result.url) {
        setProfile(prev => ({
          ...prev,
          profile_images: [...(prev.profile_images || []), result.url]
        }));
      } else {
        setError(result.error || 'Failed to upload image');
      }
    } catch (error) {
      setError('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageDelete = async (imageUrl: string) => {
    try {
      const result = await deleteProfileImage(imageUrl);
      if (result.success) {
        setProfile(prev => ({
          ...prev,
          profile_images: prev.profile_images?.filter(url => url !== imageUrl) || []
        }));
      } else {
        setError(result.error || 'Failed to delete image');
      }
    } catch (error) {
      setError('Failed to delete image');
    }
  };

  const handleInterestToggle = (interest: string) => {
    setProfile(prev => ({
      ...prev,
      interests: prev.interests?.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...(prev.interests || []), interest]
    }));
  };

  const handlePreferenceToggle = (preference: string) => {
    setProfile(prev => ({
      ...prev,
      preferences: prev.preferences?.includes(preference)
        ? prev.preferences.filter(p => p !== preference)
        : [...(prev.preferences || []), preference]
    }));
  };

  const handleSocialLinkChange = (platform: string, url: string) => {
    setProfile(prev => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [platform]: url || undefined
      }
    }));
  };

  const handleSubmit = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const result = await updateUserProfile(profile);
      if (result.success) {
        onProfileUpdated?.();
        onClose();
      } else {
        setError(result.error || 'Failed to update profile');
      }
    } catch (error) {
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const bodyTypeOptions = [
    'slim', 'average', 'athletic', 'muscular', 'bear', 'chubby', 'stocky', 'other'
  ];

  const relationshipStatusOptions = [
    'single', 'taken', 'married', 'open', 'complicated', 'not_specified'
  ];

  const hivStatusOptions = [
    'negative', 'positive', 'unknown', 'not_disclosed'
  ];

  const prepUsageOptions = [
    'on_prep', 'not_on_prep', 'considering', 'not_disclosed'
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-4xl max-h-[90vh] overflow-hidden animate-modal-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">Edit Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-800">
          <div className="flex">
            {[
              { id: 'basic', label: 'Basic Info', icon: User },
              { id: 'interests', label: 'Interests', icon: Heart },
              { id: 'physical', label: 'Physical', icon: Ruler },
              { id: 'sensitive', label: 'Sensitive', icon: Shield }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* Profile Images */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Profile Images (up to 6)
                </label>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {profile.profile_images?.map((imageUrl, index) => (
                    <div key={index} className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={`Profile ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleImageDelete(imageUrl)}
                        className="absolute top-2 right-2 p-1 bg-red-600 rounded-full text-white hover:bg-red-700 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  
                  {(profile.profile_images?.length || 0) < 6 && (
                    <label className="aspect-square bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-purple-500 transition-colors">
                      <div className="text-center">
                        {uploadingImage ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto"></div>
                        ) : (
                          <>
                            <Upload size={24} className="text-gray-400 mx-auto mb-2" />
                            <span className="text-sm text-gray-400">Add Photo</span>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Basic Info Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={profile.display_name || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, display_name: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="How others will see you"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Age
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="99"
                    value={profile.age || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, age: parseInt(e.target.value) || undefined }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Your age"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={profile.city || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Your city"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={profile.country || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Your country"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bio
                </label>
                <textarea
                  value={profile.bio || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  placeholder="Tell others about yourself..."
                  maxLength={500}
                />
                <div className="text-right text-sm text-gray-500 mt-1">
                  {(profile.bio || '').length}/500
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Relationship Status
                </label>
                <select
                  value={profile.relationship_status || ''}
                  onChange={(e) => setProfile(prev => ({ 
                    ...prev, 
                    relationship_status: e.target.value as any || null 
                  }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select status</option>
                  {relationshipStatusOptions.map(status => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'interests' && (
            <div className="space-y-6">
              {/* Interests */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Interests</h3>
                {interestCategories.map(category => (
                  <div key={category.id} className="mb-6">
                    <h4 className="text-md font-medium text-gray-300 mb-3">{category.category}</h4>
                    <div className="flex flex-wrap gap-2">
                      {category.interests.map(interest => (
                        <button
                          key={interest}
                          onClick={() => handleInterestToggle(interest)}
                          className={`px-3 py-1 rounded-full text-sm transition-colors ${
                            profile.interests?.includes(interest)
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {interest}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Preferences */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Preferences</h3>
                {preferenceOptions.map(category => (
                  <div key={category.id} className="mb-6">
                    <h4 className="text-md font-medium text-gray-300 mb-3">{category.category}</h4>
                    <div className="flex flex-wrap gap-2">
                      {category.options.map(option => (
                        <button
                          key={option}
                          onClick={() => handlePreferenceToggle(option)}
                          className={`px-3 py-1 rounded-full text-sm transition-colors ${
                            profile.preferences?.includes(option)
                              ? 'bg-pink-600 text-white'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'physical' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="250"
                    value={profile.height_cm || ''}
                    onChange={(e) => setProfile(prev => ({ 
                      ...prev, 
                      height_cm: parseInt(e.target.value) || undefined 
                    }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Your height in cm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="300"
                    value={profile.weight_kg || ''}
                    onChange={(e) => setProfile(prev => ({ 
                      ...prev, 
                      weight_kg: parseInt(e.target.value) || undefined 
                    }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Your weight in kg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Body Type
                </label>
                <select
                  value={profile.body_type || ''}
                  onChange={(e) => setProfile(prev => ({ 
                    ...prev, 
                    body_type: e.target.value as any || null 
                  }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select body type</option>
                  {bodyTypeOptions.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'sensitive' && (
            <div className="space-y-6">
              {/* Warning */}
              <div className="bg-yellow-900/30 border border-yellow-800/50 rounded-lg p-4 flex items-start space-x-3">
                <AlertTriangle size={20} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-yellow-200 font-medium">Sensitive Information</p>
                  <p className="text-yellow-300/80 text-sm mt-1">
                    This information is only visible to event hosts reviewing your request or approved members of the same event.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    HIV Status
                  </label>
                  <select
                    value={profile.hiv_status || ''}
                    onChange={(e) => setProfile(prev => ({ 
                      ...prev, 
                      hiv_status: e.target.value as any || null 
                    }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select status</option>
                    {hivStatusOptions.map(status => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    PrEP Usage
                  </label>
                  <select
                    value={profile.prep_usage || ''}
                    onChange={(e) => setProfile(prev => ({ 
                      ...prev, 
                      prep_usage: e.target.value as any || null 
                    }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select usage</option>
                    {prepUsageOptions.map(usage => (
                      <option key={usage} value={usage}>
                        {usage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Social Links */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Social Links (Optional)
                </label>
                <div className="space-y-3">
                  {['Instagram', 'Twitter', 'TikTok', 'Snapchat'].map(platform => (
                    <div key={platform}>
                      <label className="block text-xs text-gray-400 mb-1">{platform}</label>
                      <input
                        type="url"
                        value={(profile.social_links as any)?.[platform.toLowerCase()] || ''}
                        onChange={(e) => handleSocialLinkChange(platform.toLowerCase(), e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder={`Your ${platform} profile URL`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-4 flex items-start space-x-3 mt-6">
              <AlertTriangle size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-200 font-medium">Error</p>
                <p className="text-red-300/80 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Profile</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
