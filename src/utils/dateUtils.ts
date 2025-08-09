// UTC时间处理工具函数

export const formatEventDate = (dateString: string): string => {
  // 创建UTC日期对象并按用户时区显示
  const date = new Date(dateString + 'T00:00:00Z') // 确保作为UTC处理
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

// 新增：完整的日期时间格式化（UTC转本地时间）
export const formatEventDateTime = (dateString: string, timeString: string): string => {
  // 创建UTC时间并转换为用户本地时间
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

// 新增：获取当前UTC时间字符串（用于后端存储）
export const getCurrentUTCDateTimeString = (): { date: string; time: string } => {
  const now = new Date()
  const utcDate = now.toISOString().split('T')[0] // YYYY-MM-DD
  const utcTime = now.toISOString().split('T')[1].slice(0, 5) // HH:MM
  
  return { date: utcDate, time: utcTime }
}

// 新增：将本地时间转换为UTC存储格式
export const convertLocalToUTC = (dateString: string, timeString: string): { date: string; time: string } => {
  // 假设用户输入的是本地时间，转换为UTC
  const localDateTime = new Date(`${dateString}T${timeString}:00`)
  const utcDate = localDateTime.toISOString().split('T')[0]
  const utcTime = localDateTime.toISOString().split('T')[1].slice(0, 5)
  
  return { date: utcDate, time: utcTime }
}

// 新增：检查事件是否在未来（用于验证）
export const isEventInFuture = (dateString: string, timeString: string): boolean => {
  const eventDateTime = new Date(`${dateString}T${timeString}:00`)
  const now = new Date()
  return eventDateTime > now
}

// 新增：获取事件状态（即将开始、进行中、已结束）
export const getEventStatus = (dateString: string, timeString: string): 'upcoming' | 'ongoing' | 'past' => {
  const eventDateTime = new Date(`${dateString}T${timeString}:00`)
  const now = new Date()
  
  // 假设事件持续2小时
  const eventEndTime = new Date(eventDateTime.getTime() + 2 * 60 * 60 * 1000)
  
  if (now < eventDateTime) {
    return 'upcoming'
  } else if (now >= eventDateTime && now <= eventEndTime) {
    return 'ongoing'
  } else {
    return 'past'
  }
}