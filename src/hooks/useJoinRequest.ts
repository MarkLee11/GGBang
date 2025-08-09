import { useState } from 'react'
import { requestJoinEvent, approveJoinRequest, rejectJoinRequest } from '../lib/supabase'
import { handleApiError, logError, type ApiError } from '../utils/errorHandling'
import type { ApiResponse } from '../lib/supabase'

// Hook for requesting to join an event
export const useRequestJoin = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestJoin = async (eventId: number, message: string = ''): Promise<ApiResponse> => {
    setLoading(true)
    setError(null)

    try {
      const result = await requestJoinEvent(eventId, message)
      
      if (!result.success) {
        setError(result.error || 'Failed to submit request')
        return result
      }

      return result
    } catch (err) {
      const apiError = handleApiError(err)
      logError(apiError, 'useJoinRequest')
      setError(apiError.userMessage)
      return { success: false, error: apiError.userMessage }
    } finally {
      setLoading(false)
    }
  }

  const clearError = () => setError(null)

  return {
    requestJoin,
    loading,
    error,
    clearError
  }
}

// Hook for host to approve requests
export const useApproveRequest = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const approve = async (requestId: number): Promise<ApiResponse> => {
    setLoading(true)
    setError(null)

    try {
      const result = await approveJoinRequest(requestId)
      
      if (!result.success) {
        setError(result.error || 'Failed to approve request')
        return result
      }

      return result
    } catch (err) {
      const apiError = handleApiError(err)
      logError(apiError, 'useJoinRequest')
      setError(apiError.userMessage)
      return { success: false, error: apiError.userMessage }
    } finally {
      setLoading(false)
    }
  }

  const clearError = () => setError(null)

  return {
    approve,
    loading,
    error,
    clearError
  }
}

// Hook for host to reject requests
export const useRejectRequest = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reject = async (requestId: number, note?: string): Promise<ApiResponse> => {
    setLoading(true)
    setError(null)

    try {
      const result = await rejectJoinRequest(requestId, note)
      
      if (!result.success) {
        setError(result.error || 'Failed to reject request')
        return result
      }

      return result
    } catch (err) {
      const apiError = handleApiError(err)
      logError(apiError, 'useJoinRequest')
      setError(apiError.userMessage)
      return { success: false, error: apiError.userMessage }
    } finally {
      setLoading(false)
    }
  }

  const clearError = () => setError(null)

  return {
    reject,
    loading,
    error,
    clearError
  }
}
