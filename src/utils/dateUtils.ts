// UTC time handling utility functions

export const formatEventDate = (dateString: string): string => {
  // Create UTC date object and display in user's timezone
  const date = new Date(dateString + 'T00:00:00Z') // Ensure processed as UTC
  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

export const formatEventTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':')
  const date = new Date()
  date.setHours(parseInt(hours), parseInt(minutes))
  
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

// Complete date-time formatting (UTC to local time)
export const formatEventDateTime = (dateString: string, timeString: string): string => {
  // Create UTC time and convert to user's local time
  const utcDateTime = new Date(`${dateString}T${timeString}:00Z`)
  
  return utcDateTime.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  })
}

// Get current UTC time string (for backend storage)
export const getCurrentUTCDateTimeString = (): { date: string; time: string } => {
  const now = new Date()
  const utcDate = now.toISOString().split('T')[0] // YYYY-MM-DD
  const utcTime = now.toISOString().split('T')[1].slice(0, 5) // HH:MM
  
  return { date: utcDate, time: utcTime }
}

// Convert local time to UTC storage format
export const convertLocalToUTC = (dateString: string, timeString: string): { date: string; time: string } => {
  // Assume user input is local time, convert to UTC
  const localDateTime = new Date(`${dateString}T${timeString}:00`)
  const utcDate = localDateTime.toISOString().split('T')[0]
  const utcTime = localDateTime.toISOString().split('T')[1].slice(0, 5)
  
  return { date: utcDate, time: utcTime }
}

// Check if event is in the future (for validation)
export const isEventInFuture = (dateString: string, timeString: string): boolean => {
  const eventDateTime = new Date(`${dateString}T${timeString}:00`)
  const now = new Date()
  return eventDateTime > now
}

// Get event status (upcoming, ongoing, past)
export const getEventStatus = (dateString: string, timeString: string): 'upcoming' | 'ongoing' | 'past' => {
  const eventDateTime = new Date(`${dateString}T${timeString}:00`)
  const now = new Date()
  
  // Assume event lasts 2 hours
  const eventEndTime = new Date(eventDateTime.getTime() + 2 * 60 * 60 * 1000)
  
  if (now < eventDateTime) {
    return 'upcoming'
  } else if (now >= eventDateTime && now <= eventEndTime) {
    return 'ongoing'
  } else {
    return 'past'
  }
}