import { useState, useCallback } from 'react'
import { submitJoinRequest, approveJoinRequest, rejectJoinRequest, withdrawJoinRequest } from '../lib/api'
import { useNotifications } from './useNotifications'
import { formatDateForAI, formatTimeForAI } from '../lib/aiCopy'
import { supabase } from '../lib/supabase';
export interface UseJoinRequestResult {
  loading: boolean
  error: string | null
  submitRequest: (eventId: number, message?: string) => Promise<boolean>
  withdrawRequest: (requestId: number) => Promise<boolean>
  clearError: () => void
}

export function useJoinRequest(refreshStatus?: () => void): UseJoinRequestResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { notifySuccess, notifyError } = useNotifications()

  /*const submitRequest = useCallback(async (eventId: number, message?: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const result = await submitJoinRequest(eventId, message)
      
      if (result.success) {
        notifySuccess('Join request submitted successfully! The host will review your request.')
        return true
      } else {
        const errorMessage = result.error || 'Failed to submit join request'
        setError(errorMessage)
        notifyError(errorMessage)
        return false
      }
    } catch (err) {
      const errorMessage = 'Network error occurred'
      setError(errorMessage)
      notifyError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [notifySuccess, notifyError])*/
  const submitRequest = useCallback(async (eventId: number, message?: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
  
    try {
      // ✅ 1. 乐观更新：先刷新状态（UI秒变pending）
      refreshStatus?.();
  
      const result = await submitJoinRequest(eventId, message)
  
      if (result.success) {
        notifySuccess('Join request submitted successfully! The host will review your request.')
        // ✅ 2. 成功后再确保状态同步
        refreshStatus?.();
        return true
      } else {
        const errorMessage = result.error || 'Failed to submit join request'
        setError(errorMessage)
        notifyError(errorMessage)
        // ❌ 插入失败，回退状态
        refreshStatus?.();
        return false
      }
    } catch (err) {
      const errorMessage = 'Network error occurred'
      setError(errorMessage)
      notifyError(errorMessage)
      // ❌ 网络失败，回退状态
      refreshStatus?.();
      return false
    } finally {
      setLoading(false)
    }
  }, [notifySuccess, notifyError, refreshStatus])
  

  const withdrawRequest = useCallback(async (requestId: number): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const result = await withdrawJoinRequest(requestId)
      
      if (result.success) {
        notifySuccess('Join request withdrawn successfully.')
        return true
      } else {
        const errorMessage = result.error || 'Failed to withdraw request'
        setError(errorMessage)
        notifyError(errorMessage)
        return false
      }
    } catch (err) {
      const errorMessage = 'Network error occurred'
      setError(errorMessage)
      notifyError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [notifySuccess, notifyError])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    loading,
    error,
    submitRequest,
    withdrawRequest,
    clearError
  }
}

export interface UseHostActionsResult {
  approving: boolean
  rejecting: boolean
  approveError: string | null
  rejectError: string | null
  approve: (requestId: number) => Promise<boolean>
  reject: (requestId: number, note?: string) => Promise<boolean>
  clearErrors: () => void
}

export function useHostActions(): UseHostActionsResult {
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [approveError, setApproveError] = useState<string | null>(null)
  const [rejectError, setRejectError] = useState<string | null>(null)
  const { notifySuccess, notifyError } = useNotifications()

  const approve = useCallback(async (requestId: number): Promise<boolean> => {
    setApproving(true)
    setApproveError(null)

    try {
      const result = await approveJoinRequest(requestId)
      
      if (result.success) {
        notifySuccess('Join request approved! The applicant has been notified.')
        return true
      } else {
        const errorMessage = result.error || 'Failed to approve request'
        setApproveError(errorMessage)
        notifyError(errorMessage)
        return false
      }
    } catch (err) {
      const errorMessage = 'Network error occurred'
      setApproveError(errorMessage)
      notifyError(errorMessage)
      return false
    } finally {
      setApproving(false)
    }
  }, [notifySuccess, notifyError])

  const reject = useCallback(async (requestId: number, note?: string): Promise<boolean> => {
    setRejecting(true)
    setRejectError(null)

    try {
      const result = await rejectJoinRequest(requestId, note)
      
      if (result.success) {
        notifySuccess('Join request declined. The applicant has been notified.')
        return true
      } else {
        const errorMessage = result.error || 'Failed to reject request'
        setRejectError(errorMessage)
        notifyError(errorMessage)
        return false
      }
    } catch (err) {
      const errorMessage = 'Network error occurred'
      setRejectError(errorMessage)
      notifyError(errorMessage)
      return false
    } finally {
      setRejecting(false)
    }
  }, [notifySuccess, notifyError])

  const clearErrors = useCallback(() => {
    setApproveError(null)
    setRejectError(null)
  }, [])

  return {
    approving,
    rejecting,
    approveError,
    rejectError,
    approve,
    reject,
    clearErrors
  }
}