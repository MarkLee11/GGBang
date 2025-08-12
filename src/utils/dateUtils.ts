// === REPLACE FILE: src/utils/dateUtils.ts ===

// UTC time handling utility functions

// 把 'HH:MM' 或 'HH:MM:SS' 标准化为 'HH:MM:SS'
export const normalizeToHMS = (timeString: string): string => {
  if (!timeString) return '00:00:00';
  const parts = timeString.trim().split(':');
  const hh = parts[0]?.padStart(2, '0') ?? '00';
  const mm = parts[1]?.padStart(2, '0') ?? '00';
  const ss = (parts[2] ?? '00').padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

export const formatEventDate = (dateString: string): string => {
  // Create UTC date object and display in user's timezone
  const date = new Date(dateString + 'T00:00:00Z'); // Ensure processed as UTC
  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
};

export const formatEventTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':'); // 支持 'HH:MM' 或 'HH:MM:SS'
  const date = new Date();
  date.setHours(parseInt(hours, 10) || 0, parseInt(minutes, 10) || 0);
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Complete date-time formatting (UTC to local time)
export const formatEventDateTime = (dateString: string, timeString: string): string => {
  // timeString 先标准化，避免 '...:00Z' 变成 '...:00:00Z'
  const hms = normalizeToHMS(timeString);
  // Create UTC time and convert to user's local time
  const utcDateTime = new Date(`${dateString}T${hms}Z`);
  return utcDateTime.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  });
};

// Get current UTC time string (for backend storage)
export const getCurrentUTCDateTimeString = (): { date: string; time: string } => {
  const now = new Date();
  const utcDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const utcTime = now.toISOString().split('T')[1].slice(0, 5); // HH:MM
  return { date: utcDate, time: utcTime };
};

// Convert local time to UTC storage format
export const convertLocalToUTC = (dateString: string, timeString: string): { date: string; time: string } => {
  // Assume user input is local time, convert to UTC
  const hms = normalizeToHMS(timeString);
  const localDateTime = new Date(`${dateString}T${hms}`);
  // 注意：toISOString 是 UTC
  const iso = localDateTime.toISOString(); // e.g. '2025-08-11T17:30:00.000Z'
  const utcDate = iso.split('T')[0];
  const utcTime = iso.split('T')[1].slice(0, 8); // HH:MM:SS
  return { date: utcDate, time: utcTime };
};

// Check if event is in the future (for validation)
export const isEventInFuture = (dateString: string, timeString: string): boolean => {
  const hms = normalizeToHMS(timeString);
  const eventDateTime = new Date(`${dateString}T${hms}`); // 本地时区
  if (isNaN(eventDateTime.getTime())) return false;
  const now = new Date();
  return eventDateTime > now;
};

// Get event status (upcoming, ongoing, past)
export const getEventStatus = (dateString: string, timeString: string): 'upcoming' | 'ongoing' | 'past' => {
  const hms = normalizeToHMS(timeString);
  const eventDateTime = new Date(`${dateString}T${hms}`);
  if (isNaN(eventDateTime.getTime())) return 'past';

  const now = new Date();
  // Assume event lasts 2 hours
  const eventEndTime = new Date(eventDateTime.getTime() + 2 * 60 * 60 * 1000);

  if (now < eventDateTime) {
    return 'upcoming';
  } else if (now >= eventDateTime && now <= eventEndTime) {
    return 'ongoing';
  } else {
    return 'past';
  }
};
