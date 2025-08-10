// Error handling and user-friendly error message utilities

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  userMessage: string;
}

// Error code mapping table - Convert backend error codes to user-friendly messages
export const ERROR_MESSAGES: Record<string, string> = {
  // Authentication related errors
  'UNAUTHORIZED': 'Please log in to perform this action',
  'FORBIDDEN': 'You do not have permission to perform this action',
  'TOKEN_EXPIRED': 'Your session has expired, please log in again',
  
  // Event related errors
  'EVENT_NOT_FOUND': 'Event not found',
  'EVENT_PAST': 'Cannot apply to past events',
  'EVENT_FULL': 'Event is at full capacity, cannot apply',
  'INVALID_EVENT_ID': 'Invalid event ID',
  'OWN_EVENT': 'Cannot apply to join your own event',
  
  // Application related errors
  'DUPLICATE_PENDING': 'You already have a pending request, please wait for review',
  'DUPLICATE_REQUEST': 'You have already applied to this event',
  'ALREADY_APPROVED': 'Your request has already been approved',
  'ALREADY_ATTENDING': 'You are already attending this event',
  'TOO_MANY_PENDING': 'You have too many pending requests, please wait for some to be processed',
  'REJECTION_COOLDOWN': 'You need to wait before applying again after being rejected',
  
  // Capacity related errors
  'CAPACITY_EXCEEDED': 'Event is at full capacity, cannot approve more requests',
  'REQUEST_NOT_PENDING': 'This request has already been processed',
  'ALREADY_ATTENDING_ERROR': 'This user is already attending the event',
  
  // Location unlock errors
  'LOCATION_ALREADY_UNLOCKED': 'Event location is already unlocked',
  'NOT_EVENT_HOST': 'Only event hosts can unlock location',
  'NO_EXACT_LOCATION': 'This event has no exact location set',
  
  // General errors
  'INTERNAL_ERROR': 'Internal server error, please try again later',
  'NETWORK_ERROR': 'Network connection error, please check your connection',
  'VALIDATION_ERROR': 'Input data format error',
  'RATE_LIMIT_EXCEEDED': 'Too many requests, please try again later',
  
  // Database errors
  'DATABASE_ERROR': 'Database operation failed, please try again later',
  'CONSTRAINT_VIOLATION': 'Data integrity error',
  'FOREIGN_KEY_VIOLATION': 'Related data does not exist',
  
  // File upload errors
  'UPLOAD_ERROR': 'File upload failed',
  'FILE_TOO_LARGE': 'File size exceeds limit',
  'INVALID_FILE_TYPE': 'Unsupported file type',
  
  // Time related errors
  'INVALID_DATE_TIME': 'Invalid date time format',
  'DATE_IN_PAST': 'Date and time must be in the future',
  'TIME_CONFLICT': 'Time conflict',
  
  // Permission related errors
  'INSUFFICIENT_PERMISSIONS': 'Insufficient permissions',
  'ACCOUNT_SUSPENDED': 'Account has been suspended',
  'ACCOUNT_VERIFICATION_REQUIRED': 'Account verification required',
};

// Generate user-friendly error messages based on error code and context
export const getErrorMessage = (errorCode: string, context?: any): string => {
  const baseMessage = ERROR_MESSAGES[errorCode] || 'An unknown error occurred, please try again later';
  
  // Customize specific error messages based on context
  switch (errorCode) {
    case 'TOO_MANY_PENDING':
      const { currentPendingCount, maxAllowed } = context || {};
      return `You currently have ${currentPendingCount} pending requests, reaching the maximum limit of ${maxAllowed}. Please wait for some requests to be processed before submitting new ones.`;
      
    case 'REJECTION_COOLDOWN':
      const { daysRemaining, hoursRemaining } = context || {};
      if (daysRemaining > 1) {
        return `You need to wait ${daysRemaining} days before applying to this event again`;
      } else {
        return `You need to wait ${hoursRemaining} hours before applying to this event again`;
      }
      
    case 'EVENT_FULL':
      const { capacity, currentAttendees } = context || {};
      return `Event is at full capacity (${currentAttendees}/${capacity}), cannot apply at this time`;
      
    case 'CAPACITY_EXCEEDED':
      const { eventCapacity, currentCount } = context || {};
      return `Event capacity is full (${currentCount}/${eventCapacity}), cannot approve more requests`;
      
    default:
      return baseMessage;
  }
};

// Handle API response errors
export const handleApiError = (error: any): ApiError => {
  // If it's our custom error response
  if (error?.code && typeof error.code === 'string') {
    return {
      code: error.code,
      message: error.message || error.error || 'Unknown error',
      details: error,
      userMessage: getErrorMessage(error.code, error)
    };
  }
  
  // If it's a network error
  if (error?.message?.includes('fetch')) {
    return {
      code: 'NETWORK_ERROR',
      message: error.message,
      details: error,
      userMessage: getErrorMessage('NETWORK_ERROR')
    };
  }
  
  // If it's a Supabase error
  if (error?.message && typeof error.message === 'string') {
    // Infer error type based on error message
    if (error.message.includes('JWT')) {
      return {
        code: 'TOKEN_EXPIRED',
        message: error.message,
        details: error,
        userMessage: getErrorMessage('TOKEN_EXPIRED')
      };
    }
    
    if (error.message.includes('permission') || error.message.includes('policy')) {
      return {
        code: 'FORBIDDEN',
        message: error.message,
        details: error,
        userMessage: getErrorMessage('FORBIDDEN')
      };
    }
    
    if (error.message.includes('violates') || error.message.includes('constraint')) {
      return {
        code: 'CONSTRAINT_VIOLATION',
        message: error.message,
        details: error,
        userMessage: getErrorMessage('CONSTRAINT_VIOLATION')
      };
    }
  }
  
  // Default internal error
  return {
    code: 'INTERNAL_ERROR',
    message: error?.message || 'Unknown error',
    details: error,
    userMessage: getErrorMessage('INTERNAL_ERROR')
  };
};

// Error logging function (for error tracking)
export const logError = (error: ApiError, context?: string) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    context,
    code: error.code,
    message: error.message,
    details: error.details,
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  // Print to console in development environment
  if (process.env.NODE_ENV === 'development') {
    console.error('[ERROR LOG]', logEntry);
  }
  
  // In production environment, this can be sent to error monitoring service
  // Example: sendToErrorTracking(logEntry);
};

// React Hook for error handling
export const useErrorHandler = () => {
  const handleError = (error: any, context?: string): string => {
    const apiError = handleApiError(error);
    logError(apiError, context);
    return apiError.userMessage;
  };
  
  return { handleError };
};

// Error handling for error boundary components
export const handleComponentError = (error: Error, errorInfo: any) => {
  const apiError: ApiError = {
    code: 'COMPONENT_ERROR',
    message: error.message,
    details: { error, errorInfo },
    userMessage: 'Page rendering error, please refresh and try again'
  };
  
  logError(apiError, 'React Error Boundary');
  return apiError;
};

// Success message mapping table
export const SUCCESS_MESSAGES: Record<string, string> = {
  'JOIN_REQUEST_SUBMITTED': 'Request submitted, please wait for review',
  'REQUEST_APPROVED': 'Request approved',
  'REQUEST_REJECTED': 'Request rejected',
  'LOCATION_UNLOCKED': 'Location unlocked, participants can now view exact address',
  'EVENT_CREATED': 'Event created successfully',
  'EVENT_UPDATED': 'Event updated successfully',
  'EVENT_DELETED': 'Event deleted successfully',
  'PROFILE_UPDATED': 'Profile updated successfully',
  'IMAGE_UPLOADED': 'Image uploaded successfully',
};

export const getSuccessMessage = (code: string): string => {
  return SUCCESS_MESSAGES[code] || 'Operation successful';
};
