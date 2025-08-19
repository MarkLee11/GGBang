/**
 * Email Notification Service
 * Provides functions for sending various types of email notifications
 */

import { supabase } from './supabase'
import { sendEmail, getUserEmail, buildJoinRequestEmail, buildApprovalEmail, buildRejectionEmail, buildLocationUnlockEmail } from './mailer'

// Helper function to get event details
async function getEventDetails(eventId: number) {
  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('title, event_date, event_time, host_id, location')
      .eq('id', eventId)
      .single()

    if (error) throw error
    return event
  } catch (error) {
    console.error('Error fetching event details:', error)
    return null
  }
}

// Helper function to get user profile
async function getUserProfile(userId: string) {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', userId)
      .single()

    if (error) throw error
    return profile
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

// Helper function to get event URL
function getEventUrl(eventId: number): string {
  // Use window.location.origin if available (browser context)
  // Fallback to a default domain for server-side contexts
  const baseUrl = typeof window !== 'undefined' && window.location?.origin 
    ? window.location.origin 
    : 'https://ggbang.app'
  return `${baseUrl}/events/${eventId}`
}

/**
 * Send notification when a join request is submitted
 */
export async function notifyJoinRequestSubmitted(
  eventId: number, 
  requesterId: string, 
  message?: string
): Promise<boolean> {
  try {
    const event = await getEventDetails(eventId)
    if (!event) return false

    const requesterProfile = await getUserProfile(requesterId)
    if (!requesterProfile) return false

    const hostProfile = await getUserProfile(event.host_id)
    if (!hostProfile) return false

    // Send email to host
    const hostEmailOptions = buildJoinRequestEmail({
      eventTitle: event.title,
      eventDate: event.event_date,
      eventTime: event.event_time,
      eventUrl: getEventUrl(eventId),
      message: `You have a new join request from ${requesterProfile.full_name || 'a user'}${message ? ` with message: "${message}"` : ''}.`,
      recipientName: hostProfile.full_name
    })

    hostEmailOptions.to = hostProfile.email
    const hostResult = await sendEmail(hostEmailOptions)

    // Send confirmation email to requester
    const requesterEmailOptions = buildJoinRequestEmail({
      eventTitle: event.title,
      eventDate: event.event_date,
      eventTime: event.event_time,
      eventUrl: getEventUrl(eventId),
      message: `Your join request for "${event.title}" has been submitted successfully. The host will review your request and get back to you soon.`,
      recipientName: requesterProfile.full_name
    })

    requesterEmailOptions.to = requesterProfile.email
    const requesterResult = await sendEmail(requesterEmailOptions)

    return hostResult.success && requesterResult.success
  } catch (error) {
    console.error('Error sending join request submitted notification:', error)
    return false
  }
}

/**
 * Send notification when a join request is approved
 */
export async function notifyJoinRequestApproved(
  eventId: number, 
  requesterId: string
): Promise<boolean> {
  try {
    const event = await getEventDetails(eventId)
    if (!event) return false

    const requesterProfile = await getUserProfile(requesterId)
    if (!requesterProfile) return false

    const emailOptions = buildApprovalEmail({
      eventTitle: event.title,
      eventDate: event.event_date,
      eventTime: event.event_time,
      eventUrl: getEventUrl(eventId),
      message: `Great news! Your join request for "${event.title}" has been approved. You're now confirmed to attend this event.`,
      recipientName: requesterProfile.full_name
    })

    emailOptions.to = requesterProfile.email
    const result = await sendEmail(emailOptions)

    return result.success
  } catch (error) {
    console.error('Error sending join request approved notification:', error)
    return false
  }
}

/**
 * Send notification when a join request is rejected
 */
export async function notifyJoinRequestRejected(
  eventId: number, 
  requesterId: string, 
  note?: string
): Promise<boolean> {
  try {
    const event = await getEventDetails(eventId)
    if (!event) return false

    const requesterProfile = await getUserProfile(requesterId)
    if (!requesterProfile) return false

    const emailOptions = buildRejectionEmail({
      eventTitle: event.title,
      eventDate: event.event_date,
      eventTime: event.event_time,
      eventUrl: getEventUrl(eventId),
      message: `Your join request for "${event.title}" was not approved at this time.${note ? ` Host's note: "${note}"` : ''} Don't worry, there are plenty of other great events to explore!`,
      recipientName: requesterProfile.full_name
    })

    emailOptions.to = requesterProfile.email
    const result = await sendEmail(emailOptions)

    return result.success
  } catch (error) {
    console.error('Error sending join request rejected notification:', error)
    return false
  }
}

/**
 * Send notification when a join request is withdrawn
 */
export async function notifyJoinRequestWithdrawn(
  eventId: number, 
  requesterId: string
): Promise<boolean> {
  try {
    const event = await getEventDetails(eventId)
    if (!event) return false

    const requesterProfile = await getUserProfile(requesterId)
    if (!requesterProfile) return false

    const hostProfile = await getUserProfile(event.host_id)
    if (!hostProfile) return false

    // Send notification to host about withdrawal
    const hostEmailOptions = buildJoinRequestEmail({
      eventTitle: event.title,
      eventDate: event.event_date,
      eventTime: event.event_time,
      eventUrl: getEventUrl(eventId),
      message: `${requesterProfile.full_name || 'A user'} has withdrawn their join request for your event.`,
      recipientName: hostProfile.full_name
    })

    hostEmailOptions.to = hostProfile.email
    const hostResult = await sendEmail(hostEmailOptions)

    // Send confirmation to requester
    const requesterEmailOptions = buildJoinRequestEmail({
      eventTitle: event.title,
      eventDate: event.event_date,
      eventTime: event.event_time,
      eventUrl: getEventUrl(eventId),
      message: `Your join request for "${event.title}" has been withdrawn successfully.`,
      recipientName: requesterProfile.full_name
    })

    requesterEmailOptions.to = requesterProfile.email
    const requesterResult = await sendEmail(requesterEmailOptions)

    return hostResult.success && requesterResult.success
  } catch (error) {
    console.error('Error sending join request withdrawn notification:', error)
    return false
  }
}

/**
 * Send notification when an event is published
 */
export async function notifyEventPublished(
  eventId: number, 
  hostId: string
): Promise<boolean> {
  try {
    const event = await getEventDetails(eventId)
    if (!event) return false

    const hostProfile = await getUserProfile(hostId)
    if (!hostProfile) return false

    const emailOptions = buildJoinRequestEmail({
      eventTitle: event.title,
      eventDate: event.event_date,
      eventTime: event.event_time,
      eventUrl: getEventUrl(eventId),
      message: `Your event "${event.title}" has been published successfully! Users can now discover and request to join your event.`,
      recipientName: hostProfile.full_name
    })

    emailOptions.to = hostProfile.email
    const result = await sendEmail(emailOptions)

    return result.success
  } catch (error) {
    console.error('Error sending event published notification:', error)
    return false
  }
}

/**
 * Send notification when event location is unlocked
 */
export async function notifyLocationUnlocked(eventId: number): Promise<boolean> {
  try {
    const event = await getEventDetails(eventId)
    if (!event) return false

    // Get all attendees for this event
    const { data: attendees, error } = await supabase
      .from('event_attendees')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('status', 'confirmed')

    if (error) throw error

    if (!attendees || attendees.length === 0) {
      console.log('No confirmed attendees found for event:', eventId)
      return true
    }

    // Send location unlock notification to all attendees
    const emailPromises = attendees.map(async (attendee) => {
      const attendeeProfile = await getUserProfile(attendee.user_id)
      if (!attendeeProfile) return null

      const emailOptions = buildLocationUnlockEmail({
        eventTitle: event.title,
        eventDate: event.event_date,
        eventTime: event.event_time,
        eventUrl: getEventUrl(eventId),
        message: `The location for "${event.title}" has been revealed! Check the event details to see where you'll be meeting.`,
        recipientName: attendeeProfile.full_name
      })

      emailOptions.to = attendeeProfile.email
      return sendEmail(emailOptions)
    })

    const results = await Promise.all(emailPromises.filter(Boolean))
    const successCount = results.filter(result => result?.success).length

    console.log(`Location unlock notifications sent: ${successCount}/${attendees.length} successful`)
    return successCount > 0
  } catch (error) {
    console.error('Error sending location unlock notification:', error)
    return false
  }
}

/**
 * Send notification when an attendee is removed from an event
 */
export async function notifyAttendeeRemoved(
  eventId: number, 
  attendeeId: string
): Promise<boolean> {
  try {
    const event = await getEventDetails(eventId)
    if (!event) return false

    const attendeeProfile = await getUserProfile(attendeeId)
    if (!attendeeProfile) return false

    const emailOptions = buildRejectionEmail({
      eventTitle: event.title,
      eventDate: event.event_date,
      eventTime: event.event_time,
      eventUrl: getEventUrl(eventId),
      message: `You have been removed from "${event.title}" by the event host. If you have any questions, please contact the host directly.`,
      recipientName: attendeeProfile.full_name
    })

    emailOptions.to = attendeeProfile.email
    const result = await sendEmail(emailOptions)

    return result.success
  } catch (error) {
    console.error('Error sending attendee removed notification:', error)
    return false
  }
}

/**
 * Send event reminder notification
 */
export async function notifyEventReminder(eventId: number): Promise<boolean> {
  try {
    const event = await getEventDetails(eventId)
    if (!event) return false

    // Get all confirmed attendees
    const { data: attendees, error } = await supabase
      .from('event_attendees')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('status', 'confirmed')

    if (error) throw error

    if (!attendees || attendees.length === 0) {
      console.log('No confirmed attendees found for event:', eventId)
      return true
    }

    // Send reminder to all attendees
    const emailPromises = attendees.map(async (attendee) => {
      const attendeeProfile = await getUserProfile(attendee.user_id)
      if (!attendeeProfile) return null

      const emailOptions = buildJoinRequestEmail({
        eventTitle: event.title,
        eventDate: event.event_date,
        eventTime: event.event_time,
        eventUrl: getEventUrl(eventId),
        message: `Reminder: "${event.title}" is happening soon! Don't forget to check the event details and location.`,
        recipientName: attendeeProfile.full_name
      })

      emailOptions.to = attendeeProfile.email
      return sendEmail(emailOptions)
    })

    const results = await Promise.all(emailPromises.filter(Boolean))
    const successCount = results.filter(result => result?.success).length

    console.log(`Event reminder notifications sent: ${successCount}/${attendees.length} successful`)
    return successCount > 0
  } catch (error) {
    console.error('Error sending event reminder notification:', error)
    return false
    }
}
