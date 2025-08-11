import React, { useState, useEffect } from 'react'
import { X, Upload, Trash2, Plus, User, Lock, Eye, EyeOff, Save, Move } from 'lucide-react'
import { useProfile } from '../hooks/useProfile'
import { type Profile } from '../lib/supabase'

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  user?: any
  userProfile?: any
  onProfileUpdated?: () => void
}

// Predefined options for dropdowns
const INTERESTS_OPTIONS = [
  'Music', 'Sports', 'Art', 'Travel', 'Food', 'Technology', 'Books', 'Movies', 
  'Fitness', 'Gaming', 'Photography', 'Dancing', 'Hiking', 'Cooking', 'Fashion',
  'Politics', 'Science', 'History', 'Animals', 'Meditation', 'Wine', 'Coffee'
]

const PREFERENCES_OPTIONS = [
  'Long-term relationship', 'Casual dating', 'Friendship', 'Networking', 
  'Travel companion', 'Activity partner', 'Mentorship', 'Creative collaboration'
]

const BODY_TYPE_OPTIONS = [
  { value: 'slim', label: 'Slim' },
  { value: 'average', label: 'Average' },
  { value: 'athletic', label: 'Athletic' },
  { value: 'muscular', label: 'Muscular' },
  { value: 'bear', label: 'Bear' },
  { value: 'chubby', label: 'Chubby' },
  { value: 'stocky', label: 'Stocky' },
  { value: 'other', label: 'Other' }
]

const RELATIONSHIP_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'taken', label: 'Taken' },
  { value: 'married', label: 'Married' },
  { value: 'open', label: 'Open Relationship' },
  { value: 'complicated', label: 'It\'s Complicated' },
  { value: 'not_specified', label: 'Prefer not to say' }
]

const HIV_STATUS_OPTIONS = [
  { value: 'negative', label: 'Negative' },
  { value: 'positive', label: 'Positive' },
  { value: 'unknown', label: 'Unknown' },
  { value: 'not_disclosed', label: 'Prefer not to disclose' }
]

const PREP_USAGE_OPTIONS = [
  { value: 'on_prep', label: 'On PrEP' },
  { value: 'not_on_prep', label: 'Not on PrEP' },
  { value: 'considering', label: 'Considering PrEP' },
  { value: 'not_disclosed', label: 'Prefer not to disclose' }
]

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user,
  userProfile,
  onProfileUpdated
}) => {
  const { profile, loading, error, updateProfile, uploadImages, deleteImage } = useProfile()
  
  const [activeTab, setActiveTab] = useState<'basic' | 'physical' | 'preferences' | 'sensitive'>('basic')
  const [formData, setFormData] = useState<Partial<Profile>>({})
  const [saving, setSaving] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false)
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null)

  // Initialize form data when profile loads or when userProfile changes
  useEffect(() => {
    const profileData = userProfile || profile;
    if (profileData) {
      setFormData({
        display_name: profileData.display_name || '',
        bio: profileData.bio || '',
        age: profileData.age || null,
        city: profileData.city || '',
        country: profileData.country || '',
        interests: profileData.interests || [],
        preferences: profileData.preferences || [],
        height_cm: profileData.height_cm || null,
        weight_kg: profileData.weight_kg || null,
        body_type: profileData.body_type || null,
        relationship_status: profileData.relationship_status || null,
        hiv_status: profileData.hiv_status || null,
        prep_usage: profileData.prep_usage || null,
        social_links: profileData.social_links || {}
      })
    }
  }, [profile, userProfile])

  const handleInputChange = (field: keyof Profile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleInterestsChange = (interest: string, checked: boolean) => {
    const currentInterests = formData.interests || []
    if (checked) {
      handleInputChange('interests', [...currentInterests, interest])
    } else {
      handleInputChange('interests', currentInterests.filter(i => i !== interest))
    }
  }

  const handlePreferencesChange = (preference: string, checked: boolean) => {
    const currentPreferences = formData.preferences || []
    if (checked) {
      handleInputChange('preferences', [...currentPreferences, preference])
    } else {
      handleInputChange('preferences', currentPreferences.filter(p => p !== preference))
    }
  }

  const handleSocialLinkChange = (platform: string, url: string) => {
    const currentLinks = formData.social_links || {}
    if (url.trim()) {
      handleInputChange('social_links', { ...currentLinks, [platform]: url })
    } else {
      const newLinks = { ...currentLinks }
      delete newLinks[platform]
      handleInputChange('social_links', newLinks)
    }
  }

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploadingImages(true)
    try {
      const fileArray = Array.from(files)
      const success = await uploadImages(fileArray)
      if (!success) {
        // 显示更详细的错误信息
        const errorMessage = 'Failed to upload some images. Please check:\n' +
          '1. File type (JPEG, PNG, WebP only)\n' +
          '2. File size (max 5MB)\n' +
          '3. Internet connection\n' +
          '4. Contact support if problem persists'
        alert(errorMessage)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed. Please try again or contact support.')
    } finally {
      setUploadingImages(false)
    }
  }

  const handleImageDelete = async (imageUrl: string) => {
    if (confirm('Are you sure you want to delete this image?')) {
      await deleteImage(imageUrl)
    }
  }

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedImageIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  // Handle drop to reorder images
  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (draggedImageIndex === null || draggedImageIndex === dropIndex) {
      setDraggedImageIndex(null)
      return
    }

    const currentImages = profile?.profile_images || []
    if (currentImages.length === 0) return

    // Create new array with reordered images
    const newImages = [...currentImages]
    const [draggedImage] = newImages.splice(draggedImageIndex, 1)
    newImages.splice(dropIndex, 0, draggedImage)

    // Update profile with new image order
    try {
      const success = await updateProfile({ profile_images: newImages })
      if (success) {
        // Update local state immediately for better UX
        // The useProfile hook will handle the state update
      }
    } catch (error) {
      console.error('Failed to reorder images:', error)
    }

    setDraggedImageIndex(null)
  }

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedImageIndex(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const success = await updateProfile(formData)
      if (success) {
        onSuccess?.()
        onProfileUpdated?.()
        onClose()
      }
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (saving || uploadingImages) return
    setActiveTab('basic')
    onClose()
  }

  if (!isOpen) return null

  const currentImages = profile?.profile_images || []

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-600/20 rounded-full flex items-center justify-center">
              <User size={20} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Edit Profile</h2>
              <p className="text-gray-400 text-sm">Update your profile information</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={saving || uploadingImages}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700 overflow-x-auto">
          {[
            { id: 'basic', label: 'Basic Info', icon: User },
            { id: 'physical', label: 'Physical', icon: User },
            { id: 'preferences', label: 'Interests', icon: Plus },
            { id: 'sensitive', label: 'Sensitive', icon: Lock }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === id
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading profile...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400 mb-4">Error: {error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Basic Info Tab */}
              {activeTab === 'basic' && (
                <div className="space-y-6">
                  {/* Profile Images */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Profile Images (up to 10)
                    </label>
                    
                    <p className="text-xs text-gray-500 mb-3">
                      Drag and drop images to reorder them. The first image will be your main profile photo. Max 5MB per image.
                    </p>
                    
                    {/* Image Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      {currentImages.map((imageUrl, index) => (
                        <div 
                          key={index} 
                          className={`relative group cursor-move ${
                            draggedImageIndex === index ? 'opacity-50' : ''
                          }`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index)}
                          onDragEnd={handleDragEnd}
                        >
                          <img
                            src={imageUrl}
                            alt={`Profile ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-600 pointer-events-none"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <button
                              onClick={() => handleImageDelete(imageUrl)}
                              className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          {index === 0 && (
                            <div className="absolute top-2 left-2 px-2 py-1 bg-purple-600 text-white text-xs rounded">
                              Main
                            </div>
                          )}
                          <div className="absolute top-2 right-2 p-1 bg-gray-800/80 rounded-full">
                            <Move size={12} className="text-gray-300" />
                          </div>
                        </div>
                      ))}
                      
                      {/* Upload Button */}
                      {currentImages.length < 10 && (
                        <label className="w-full h-32 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 transition-colors">
                          {uploadingImages ? (
                            <div className="w-6 h-6 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                          ) : (
                            <>
                              <Upload size={24} className="text-gray-400 mb-2" />
                              <span className="text-sm text-gray-400">Add Photos</span>
                            </>
                          )}
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e.target.files)}
                            className="hidden"
                            disabled={uploadingImages}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={formData.display_name || ''}
                      onChange={(e) => handleInputChange('display_name', e.target.value)}
                      placeholder="How others see you"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      maxLength={50}
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={formData.bio || ''}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      placeholder="Tell others about yourself..."
                      rows={4}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none"
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {(formData.bio || '').length}/500 characters
                    </p>
                  </div>

                  {/* Age */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Age
                    </label>
                    <input
                      type="number"
                      value={formData.age || ''}
                      onChange={(e) => handleInputChange('age', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Your age"
                      min="18"
                      max="100"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Location */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.city || ''}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="Your city"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        value={formData.country || ''}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        placeholder="Your country"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Physical Tab */}
              {activeTab === 'physical' && (
                <div className="space-y-6">
                  {/* Height & Weight */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Height (cm)
                      </label>
                      <input
                        type="number"
                        value={formData.height_cm || ''}
                        onChange={(e) => handleInputChange('height_cm', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="170"
                        min="100"
                        max="250"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Weight (kg)
                      </label>
                      <input
                        type="number"
                        value={formData.weight_kg || ''}
                        onChange={(e) => handleInputChange('weight_kg', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="70"
                        min="30"
                        max="200"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* Body Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Body Type
                    </label>
                    <select
                      value={formData.body_type || ''}
                      onChange={(e) => handleInputChange('body_type', e.target.value || null)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Select body type</option>
                      {BODY_TYPE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Relationship Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Relationship Status
                    </label>
                    <select
                      value={formData.relationship_status || ''}
                      onChange={(e) => handleInputChange('relationship_status', e.target.value || null)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Select status</option>
                      {RELATIONSHIP_STATUS_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  {/* Interests */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Interests
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {INTERESTS_OPTIONS.map(interest => (
                        <label key={interest} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(formData.interests || []).includes(interest)}
                            onChange={(e) => handleInterestsChange(interest, e.target.checked)}
                            className="rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-300">{interest}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Preferences */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Looking For
                    </label>
                    <div className="space-y-2">
                      {PREFERENCES_OPTIONS.map(preference => (
                        <label key={preference} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(formData.preferences || []).includes(preference)}
                            onChange={(e) => handlePreferencesChange(preference, e.target.checked)}
                            className="rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-300">{preference}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Sensitive Tab */}
              {activeTab === 'sensitive' && (
                <div className="space-y-6">
                  {/* Privacy Notice */}
                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Lock size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-yellow-300 font-medium mb-1">Sensitive Information</h4>
                        <p className="text-yellow-200/80 text-sm">
                          These fields are only visible to event hosts reviewing your requests 
                          or to other approved members of the same events you attend.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Show/Hide Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Show sensitive fields</span>
                    <button
                      onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
                      className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      {showSensitiveInfo ? <EyeOff size={16} /> : <Eye size={16} />}
                      <span className="text-sm">{showSensitiveInfo ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>

                  {showSensitiveInfo && (
                    <>
                      {/* HIV Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          HIV Status (Optional)
                        </label>
                        <select
                          value={formData.hiv_status || ''}
                          onChange={(e) => handleInputChange('hiv_status', e.target.value || null)}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        >
                          <option value="">Select status</option>
                          {HIV_STATUS_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* PrEP Usage */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          PrEP Usage (Optional)
                        </label>
                        <select
                          value={formData.prep_usage || ''}
                          onChange={(e) => handleInputChange('prep_usage', e.target.value || null)}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        >
                          <option value="">Select usage</option>
                          {PREP_USAGE_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Social Links */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Social Links (Optional)
                        </label>
                        <div className="space-y-3">
                          {['Instagram', 'Twitter', 'LinkedIn', 'Website'].map(platform => (
                            <div key={platform}>
                              <label className="block text-xs text-gray-400 mb-1">{platform}</label>
                              <input
                                type="url"
                                value={(formData.social_links as any)?.[platform] || ''}
                                onChange={(e) => handleSocialLinkChange(platform, e.target.value)}
                                placeholder={`Your ${platform} URL`}
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <button
            onClick={handleClose}
            disabled={saving || uploadingImages}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploadingImages || !profile}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditProfileModal