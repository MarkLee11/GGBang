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

    try {
      // 首先尝试获取现有的profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', uid)
        .single()

      if (error) {
        // 如果profile不存在，创建一个默认的profile
        if (error.code === 'PGRST116') { // No rows returned
          console.log('Profile not found, creating default profile for user:', uid)
          
          // 获取用户基本信息
          const { data: userData } = await supabase.auth.getUser()
          const user = userData?.user
          
          // 创建默认profile
          const defaultProfile = {
            user_id: uid,
            display_name: user?.user_metadata?.name || 'New User',
            bio: null,
            age: null,
            city: null,
            country: null,
            interests: [],
            preferences: [],
            height_cm: null,
            weight_kg: null,
            body_type: null,
            relationship_status: null,
            is_verified: false,
            profile_images: [],
            last_seen: new Date().toISOString()
          }

          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert(defaultProfile)
            .select()
            .single()

          if (createError) {
            console.error('Failed to create default profile:', createError)
            setError('Failed to create profile')
            setProfile(null)
          } else {
            console.log('Default profile created successfully:', newProfile)
            setProfile(newProfile)
          }
        } else {
          // 其他错误
          console.error('Error fetching profile:', error)
          setError(error.message)
          setProfile(null)
        }
      } else {
        // Profile存在，正常设置
        setProfile(data)
      }
    } catch (err) {
      console.error('Unexpected error in fetchProfile:', err)
      setError('Failed to fetch profile')
      setProfile(null)
    } finally {
      setLoading(false)
    }
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

      // 检查profile是否存在，如果不存在则先创建
      if (!profile) {
        console.log('Profile not found, creating default profile before update')
        await fetchProfile()
        // 如果创建失败，直接返回
        if (!profile) {
          return false
        }
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
      console.error('Error updating profile:', err)
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
      
      // Add new image URLs to the end (preserve current order)
      const updatedImages = [...currentImages, ...result.urls]
      
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
