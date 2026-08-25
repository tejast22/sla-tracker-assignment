// backend/src/services/sla/sla.service.ts
import { Priority } from '@prisma/client';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { addMinutes, getDay, getHours, startOfDay, isSameDay } from 'date-fns';

// Default SLA policies as strictly defined by the assignment[cite: 1]
export const SLA_POLICIES: Record<Priority, { response: number; resolution: number }> = {
  URGENT: { response: 1, resolution: 4 },
  HIGH: { response: 4, resolution: 24 },
  MEDIUM: { response: 8, resolution: 48 },
  LOW: { response: 24, resolution: 72 },
};

export class SlaService {
  private timeZone: string;
  private startHour = 9;
  private endHour = 18;

  constructor() {
    // Configurable timezone per requirements[cite: 1]
    this.timeZone = process.env.BUSINESS_TIMEZONE || 'Asia/Kolkata';
  }

  /**
   * Calculates the SLA state based on consumed budget.
   */
  public calculateSlaState(elapsedMinutes: number, totalAllocatedMinutes: number): 'ON_TRACK' | 'AT_RISK' | 'BREACHED' {
    if (elapsedMinutes >= totalAllocatedMinutes) return 'BREACHED';
    
    const consumedRatio = elapsedMinutes / totalAllocatedMinutes;
    // AT_RISK when >75% of SLA budget is consumed[cite: 1]
    if (consumedRatio > 0.75) return 'AT_RISK';
    
    return 'ON_TRACK';
  }

  /**
   * Calculates the exact due date by stepping through valid business minutes.
   * Skips weekends, non-business hours, and configured holidays[cite: 1].
   */
  public calculateDueDate(createdAt: Date, allocatedHours: number, holidays: Date[] = []): Date {
    let remainingMinutes = allocatedHours * 60;
    
    // Convert the UTC database date to our business timezone for calculation[cite: 1]
    let currentDate = toZonedTime(createdAt, this.timeZone);

    while (remainingMinutes > 0) {
      // 0 = Sunday, 6 = Saturday
      const dayOfWeek = getDay(currentDate);
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Check if current day is a holiday
      const isHoliday = holidays.some(h => isSameDay(toZonedTime(h, this.timeZone), currentDate));

      if (isWeekend || isHoliday) {
        // Skip entirely to the next day at 09:00
        currentDate = addMinutes(startOfDay(currentDate), 24 * 60 + this.startHour * 60);
        continue;
      }

      const currentHour = getHours(currentDate);

      // If before 09:00, jump forward to 09:00[cite: 1]
      if (currentHour < this.startHour) {
        currentDate = addMinutes(startOfDay(currentDate), this.startHour * 60);
        continue;
      }

      // If at or after 18:00, jump to the next day at 09:00[cite: 1]
      if (currentHour >= this.endHour) {
        currentDate = addMinutes(startOfDay(currentDate), 24 * 60 + this.startHour * 60);
        continue;
      }

      // If we are in valid business hours, advance by 1 minute and deduct from budget
      currentDate = addMinutes(currentDate, 1);
      remainingMinutes -= 1;
    }

    // Convert back to UTC for database storage[cite: 1]
    return fromZonedTime(currentDate, this.timeZone);
  }
}