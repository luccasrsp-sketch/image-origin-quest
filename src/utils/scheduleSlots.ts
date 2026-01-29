// Schedule slots configuration
export const SLOT_DURATION_MINUTES = 20;
export const WORK_START_HOUR = 9;
export const WORK_END_HOUR = 20;
export const LUNCH_START_HOUR = 12;
export const LUNCH_END_HOUR = 13;

export interface TimeSlot {
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  label: string;     // Display label
}

/**
 * Generate all available time slots for a workday
 * Slots are 45 minutes, from 09:00 to 20:00, with lunch break 12:00-13:00
 */
export function generateDaySlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  
  // Morning slots: 09:00 - 12:00
  let currentHour = WORK_START_HOUR;
  let currentMinute = 0;
  
  while (currentHour < LUNCH_START_HOUR) {
    const startTime = formatTime(currentHour, currentMinute);
    
    // Calculate end time
    let endMinute = currentMinute + SLOT_DURATION_MINUTES;
    let endHour = currentHour;
    
    if (endMinute >= 60) {
      endHour += Math.floor(endMinute / 60);
      endMinute = endMinute % 60;
    }
    
    // Don't add slot if it goes into lunch
    if (endHour > LUNCH_START_HOUR || (endHour === LUNCH_START_HOUR && endMinute > 0)) {
      break;
    }
    
    const endTime = formatTime(endHour, endMinute);
    slots.push({
      startTime,
      endTime,
      label: `${startTime} - ${endTime}`,
    });
    
    currentHour = endHour;
    currentMinute = endMinute;
  }
  
  // Afternoon slots: 13:00 - 20:00
  currentHour = LUNCH_END_HOUR;
  currentMinute = 0;
  
  while (true) {
    const startTime = formatTime(currentHour, currentMinute);
    
    // Calculate end time
    let endMinute = currentMinute + SLOT_DURATION_MINUTES;
    let endHour = currentHour;
    
    if (endMinute >= 60) {
      endHour += Math.floor(endMinute / 60);
      endMinute = endMinute % 60;
    }
    
    // Don't add slot if it goes past work end
    if (endHour > WORK_END_HOUR || (endHour === WORK_END_HOUR && endMinute > 0)) {
      break;
    }
    
    const endTime = formatTime(endHour, endMinute);
    slots.push({
      startTime,
      endTime,
      label: `${startTime} - ${endTime}`,
    });
    
    currentHour = endHour;
    currentMinute = endMinute;
  }
  
  return slots;
}

function formatTime(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

/**
 * Check if a slot conflicts with existing events
 */
export function isSlotAvailable(
  date: string,
  slot: TimeSlot,
  existingEvents: { start_time: string; end_time: string; user_id: string }[],
  closerId: string
): boolean {
  const slotStart = new Date(`${date}T${slot.startTime}:00`);
  const slotEnd = new Date(`${date}T${slot.endTime}:00`);
  
  // Filter events for this closer
  const closerEvents = existingEvents.filter(event => event.user_id === closerId);
  
  for (const event of closerEvents) {
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);
    
    // Check if same day
    if (eventStart.toDateString() !== slotStart.toDateString()) {
      continue;
    }
    
    // Check for overlap: slot overlaps if it starts before event ends AND ends after event starts
    if (slotStart < eventEnd && slotEnd > eventStart) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if a slot is in the past
 */
export function isSlotInPast(date: string, slot: TimeSlot): boolean {
  const now = new Date();
  const slotDateTime = new Date(`${date}T${slot.startTime}:00`);
  return slotDateTime < now;
}

/**
 * Get available slots for a specific closer on a specific date
 */
export function getAvailableSlots(
  date: string,
  existingEvents: { start_time: string; end_time: string; user_id: string }[],
  closerId: string
): TimeSlot[] {
  const allSlots = generateDaySlots();
  
  return allSlots.filter(slot => {
    // Remove past slots
    if (isSlotInPast(date, slot)) {
      return false;
    }
    
    // Check availability
    return isSlotAvailable(date, slot, existingEvents, closerId);
  });
}
