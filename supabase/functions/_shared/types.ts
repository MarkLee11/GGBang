// Shared types for Edge Functions
export interface Event {
  id: number
  user_id: string
  title: string
  capacity: number | null
  place_hint: string | null
  place_exact: string | null
  place_exact_visible: boolean
  date: string
  time: string
  created_at: string
  updated_at: string
}

export interface JoinRequest {
  id: number
  event_id: number
  requester_id: string
  message: string | null
  waitlist: boolean
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

export interface ApiResponse<T = any> {
  ok: boolean
  data?: T
  code?: string
  message?: string
}

export interface JoinRequestBody {
  eventId: number
  message?: string
}

export interface ApproveRejectBody {
  requestId: number
  note?: string
}

export interface LocationUnlockBody {
  eventId: number
}

// Standard error codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PAST_EVENT: 'PAST_EVENT',
  EVENT_FULL: 'EVENT_FULL',
  DUPLICATE_REQUEST: 'DUPLICATE_REQUEST',
  OWN_EVENT: 'OWN_EVENT',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const

export const ERROR_MESSAGES = {
  [ERROR_CODES.UNAUTHORIZED]: 'Authentication required',
  [ERROR_CODES.FORBIDDEN]: 'Access denied',
  [ERROR_CODES.NOT_FOUND]: 'Resource not found',
  [ERROR_CODES.CONFLICT]: 'Conflict with current state',
  [ERROR_CODES.VALIDATION_ERROR]: 'Invalid request data',
  [ERROR_CODES.PAST_EVENT]: 'Cannot perform action on past events',
  [ERROR_CODES.EVENT_FULL]: 'Event is at full capacity',
  [ERROR_CODES.DUPLICATE_REQUEST]: 'Request already exists',
  [ERROR_CODES.OWN_EVENT]: 'You cannot join your own event. This event was created by you.',
  [ERROR_CODES.INTERNAL_ERROR]: 'Internal server error'
} as const
