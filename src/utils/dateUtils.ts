export const formatEventDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric'
  })
}

export const formatEventTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':')
  const date = new Date()
  date.setHours(parseInt(hours), parseInt(minutes))
  
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}