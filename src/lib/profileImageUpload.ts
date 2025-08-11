import { supabase } from './supabase'

export interface ImageUploadResult {
  success: boolean
  url?: string
  error?: string
}

export interface MultiImageUploadResult {
  success: boolean
  urls?: string[]
  failedUploads?: number
  error?: string
}

// Generate unique filename for image upload
function generateImageFilename(userId: string, index: number): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${userId}/${timestamp}-${index}-${random}.jpg`
}

// Validate image file
function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed' }
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return { valid: false, error: 'Image size must be less than 5MB' }
  }

  return { valid: true }
}

// Compress image before upload
async function compressImage(file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob(
        (blob) => {
          const compressedFile = new File([blob!], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          })
          resolve(compressedFile)
        },
        'image/jpeg',
        quality
      )
    }

    img.src = URL.createObjectURL(file)
  })
}

// Upload single profile image
export async function uploadProfileImage(
  file: File, 
  userId: string, 
  index: number = 0
): Promise<ImageUploadResult> {
  try {
    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // Compress image
    const compressedFile = await compressImage(file)
    
    // Generate filename - 确保使用正确的用户ID
    const filename = generateImageFilename(userId, index)
    
    console.log('Uploading file:', filename, 'for user:', userId)
    
    // Check if storage bucket exists
    /*const { data: bucket, error: bucketError } = await supabase.storage.getBucket('profile-images')
    if (bucketError) {
      console.error('Bucket error:', bucketError)
      return { 
        success: false, 
        error: 'Storage bucket not found. Please contact administrator.' 
      }
    } */
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(filename, compressedFile, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return { 
        success: false, 
        error: `Upload failed: ${error.message}` 
      }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filename)

    return { success: true, url: publicUrl }

  } catch (error) {
    console.error('Image upload error:', error)
    return { 
      success: false, 
      error: 'Upload failed due to network error' 
    }
  }
}

// Upload multiple profile images
export async function uploadMultipleImages(
  files: File[], 
  userId: string,
  onProgress?: (completed: number, total: number) => void
): Promise<MultiImageUploadResult> {
  if (files.length === 0) {
    return { success: false, error: 'No files provided' }
  }

  if (files.length > 10) {
    return { success: false, error: 'Maximum 10 images allowed' }
  }

  const urls: string[] = []
  let failedUploads = 0

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    onProgress?.(i, files.length)

    const result = await uploadProfileImage(file, userId, i)
    if (result.success && result.url) {
      urls.push(result.url)
    } else {
      failedUploads++
      console.error(`Failed to upload image ${i + 1}:`, result.error)
    }
  }

  onProgress?.(files.length, files.length)

  if (urls.length === 0) {
    return { success: false, error: 'All image uploads failed' }
  }

  return {
    success: true,
    urls,
    failedUploads: failedUploads > 0 ? failedUploads : undefined
  }
}

// Delete profile image
export async function deleteProfileImage(imageUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Extract filename from URL
    const url = new URL(imageUrl)
    const pathParts = url.pathname.split('/')
    const bucketIndex = pathParts.findIndex(part => part === 'profile-images')
    
    if (bucketIndex === -1 || bucketIndex === pathParts.length - 1) {
      return { success: false, error: 'Invalid image URL' }
    }

    const filename = pathParts.slice(bucketIndex + 1).join('/')

    const { error } = await supabase.storage
      .from('profile-images')
      .remove([filename])

    if (error) {
      console.error('Delete error:', error)
      return { success: false, error: 'Failed to delete image' }
    }

    return { success: true }

  } catch (error) {
    console.error('Image delete error:', error)
    return { success: false, error: 'Delete failed due to network error' }
  }
}

// Reorder profile images (update profile_images array order)
export async function reorderProfileImages(
  userId: string, 
  newImageOrder: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        profile_images: newImageOrder,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (error) {
      console.error('Reorder error:', error)
      return { success: false, error: 'Failed to reorder images' }
    }

    return { success: true }

  } catch (error) {
    console.error('Image reorder error:', error)
    return { success: false, error: 'Reorder failed due to network error' }
  }
}
