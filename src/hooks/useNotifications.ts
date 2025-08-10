/**
 * Custom hook for handling notifications with AI-generated copy
 * Provides toast notifications and email integration
 */

import { useState } from 'react'
import { genNotice, shortenForToast, type CopyType, type NotificationContext } from '../lib/aiCopy'

export interface NotificationOptions {
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
  showToast?: boolean
}

export interface ToastNotification {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration: number
  timestamp: number
}

export function useNotifications() {
  const [toasts, setToasts] = useState<ToastNotification[]>([])

  // Generate AI notification and show toast
  const showAINotification = async (
    copyType: CopyType,
    context: NotificationContext,
    options: NotificationOptions = { type: 'info' }
  ): Promise<string> => {
    try {
      // Generate AI copy
      const fullMessage = await genNotice(copyType, context)
      
      // Shorten for toast if needed
      const toastMessage = shortenForToast(fullMessage, 120)
      
      // Show toast notification
      if (options.showToast !== false) {
        showToast(toastMessage, options)
      }
      
      return fullMessage
      
    } catch (error) {
      console.error('Error generating AI notification:', error)
      const fallbackMessage = 'Notification update'
      
      if (options.showToast !== false) {
        showToast(fallbackMessage, { ...options, type: 'info' })
      }
      
      return fallbackMessage
    }
  }

  // Show a simple toast notification
  const showToast = (
    message: string, 
    options: NotificationOptions = { type: 'info' }
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const duration = options.duration || (options.type === 'error' ? 6000 : 4000)
    
    const toast: ToastNotification = {
      id,
      message,
      type: options.type,
      duration,
      timestamp: Date.now()
    }
    
    setToasts(prev => [...prev, toast])
    
    // Auto-remove toast after duration
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }

  // Remove a specific toast
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  // Clear all toasts
  const clearToasts = () => {
    setToasts([])
  }

  // Specific notification functions
  const notifyJoinRequestCreated = async (
    eventTitle: string,
    eventDate: string,
    eventTime: string,
    requesterName?: string
  ) => {
    return showAINotification('request_created', {
      eventTitle,
      eventDate,
      eventTime,
      requesterName
    }, { type: 'success' })
  }

  const notifyJoinRequestApproved = async (
    eventTitle: string,
    eventDate: string,
    eventTime: string
  ) => {
    return showAINotification('approved', {
      eventTitle,
      eventDate,
      eventTime
    }, { type: 'success' })
  }

  const notifyJoinRequestRejected = async (
    eventTitle: string,
    eventDate: string,
    eventTime: string,
    hostNote?: string
  ) => {
    return showAINotification('rejected', {
      eventTitle,
      eventDate,
      eventTime,
      hostNote
    }, { type: 'info' })
  }

  const notifyLocationUnlocked = async (
    eventTitle: string,
    eventDate: string,
    eventTime: string
  ) => {
    return showAINotification('location_unlocked', {
      eventTitle,
      eventDate,
      eventTime
    }, { type: 'info' })
  }

  const notifyEventReminder = async (
    eventTitle: string,
    eventDate: string,
    eventTime: string
  ) => {
    return showAINotification('event_reminder', {
      eventTitle,
      eventDate,
      eventTime
    }, { type: 'info' })
  }

  // Error notification
  const notifyError = (message: string) => {
    showToast(message, { type: 'error' })
  }

  // Success notification
  const notifySuccess = (message: string) => {
    showToast(message, { type: 'success' })
  }

  // Info notification
  const notifyInfo = (message: string) => {
    showToast(message, { type: 'info' })
  }

  // Warning notification
  const notifyWarning = (message: string) => {
    showToast(message, { type: 'warning' })
  }

  return {
    // State
    toasts,
    
    // Core functions
    showAINotification,
    showToast,
    removeToast,
    clearToasts,
    
    // Specific notification functions
    notifyJoinRequestCreated,
    notifyJoinRequestApproved,
    notifyJoinRequestRejected,
    notifyLocationUnlocked,
    notifyEventReminder,
    
    // Simple notification functions
    notifyError,
    notifySuccess,
    notifyInfo,
    notifyWarning
  }
}
