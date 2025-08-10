// 文件：src/hooks/useProfile.ts  （整文件替换）

import { useEffect, useState } from 'react'
import { supabase, getCurrentUserId } from '../lib/supabase'
import { uploadMultipleImages } from '../lib/profileImageUpload'

export function useProfile() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch profile data
  const fetchProfile = async () => {
    const uid = await getCurrentUserId()
    if (!uid) {
      setProfile(null)
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', uid)
      .single()

    if (error) {
      setError(error.message)
      setProfile(null)
    } else {
      setProfile(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setError(null)
      await fetchProfile()
      return () => {
        alive = false
      }
    })()
  }, [])

  // Update profile information
  const updateProfile = async (updates: any): Promise<boolean> => {
    try {
      const uid = await getCurrentUserId()
      if (!uid) {
        setError('User not authenticated')
        return false
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', uid)

      if (error) {
        setError(error.message)
        return false
      }

      // Refresh profile data
      await fetchProfile()
      return true
    } catch (err) {
      setError('Failed to update profile')
      return false
    }
  }

  // Upload multiple profile images
  const uploadImages = async (files: File[]): Promise<boolean> => {
    try {
      const uid = await getCurrentUserId()
      if (!uid) {
        setError('User not authenticated')
        return false
      }

      const result = await uploadMultipleImages(files, uid)
      
      if (!result.success) {
        setError(result.error || 'Upload failed')
        return false
      }

      // Get current profile images
      const currentImages = profile?.profile_images || []
      
      // Add new image URLs to the beginning (newest first)
      const updatedImages = [...result.urls, ...currentImages]
      
      // Limit to 10 images maximum
      const finalImages = updatedImages.slice(0, 10)
      
      // Update profile with new images
      const success = await updateProfile({ profile_images: finalImages })
      
      if (success) {
        // Update local state immediately for better UX
        setProfile(prev => prev ? { ...prev, profile_images: finalImages } : null)
      }
      
      return success
    } catch (err) {
      setError('Failed to upload images')
      return false
    }
  }

  // Delete a specific profile image
  const deleteImage = async (imageUrl: string): Promise<boolean> => {
    try {
      const uid = await getCurrentUserId()
      if (!uid) {
        setError('User not authenticated')
        return false
      }

      // Get current profile images
      const currentImages = profile?.profile_images || []
      
      // Remove the specified image URL
      const updatedImages = currentImages.filter(url => url !== imageUrl)
      
      // Update profile with updated images
      const success = await updateProfile({ profile_images: updatedImages })
      
      if (success) {
        // Update local state immediately for better UX
        setProfile(prev => prev ? { ...prev, profile_images: updatedImages } : null)
      }
      
      return success
    } catch (err) {
      setError('Failed to delete image')
      return false
    }
  }

  return { 
    profile, 
    loading, 
    error, 
    updateProfile, 
    uploadImages, 
    deleteImage,
    refetch: fetchProfile
  }
}
