// backend/src/services/sla/sla.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { SlaService } from './sla.service';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

describe('SlaService', () => {
  let slaService: SlaService;
  const tz = 'Asia/Kolkata'; 

  beforeEach(() => {
    // Ensuring the environment variable is set as required[cite: 1]
    process.env.BUSINESS_TIMEZONE = tz;
    slaService = new SlaService();
  });

  /**
   * Helper function to safely construct a UTC date from a timezone string,
   * completely bypassing the system's local clock.
   */
  const createLocalTime = (isoString: string) => fromZonedTime(isoString, tz);

  /**
   * Helper function to convert a resulting UTC date back to a local string 
   * for easy assertion, avoiding native Date.toISOString() timezone bugs.
   */
  const toLocalString = (date: Date) => formatInTimeZone(date, tz, "yyyy-MM-dd'T'HH:mm");

  it('calculates a normal weekday SLA (created Monday 10:00, 4 hours allocated)', () => {
    const createdAt = createLocalTime('2026-08-10T10:00:00'); // Monday
    const dueDate = slaService.calculateDueDate(createdAt, 4);
    
    expect(toLocalString(dueDate)).toBe('2026-08-10T14:00');
  });

  it('skips to next day 09:00 if created after business hours (Monday 20:00)[cite: 1]', () => {
    const createdAt = createLocalTime('2026-08-10T20:00:00'); // Monday
    const dueDate = slaService.calculateDueDate(createdAt, 2);
    
    // Starts counting at Tuesday 09:00 + 2 hours
    expect(toLocalString(dueDate)).toBe('2026-08-11T11:00');
  });

  it('jumps forward to 09:00 if created before business hours (Monday 07:00)[cite: 1]', () => {
    const createdAt = createLocalTime('2026-08-10T07:00:00'); // Monday
    const dueDate = slaService.calculateDueDate(createdAt, 1); // 1 hour for URGENT[cite: 1]
    
    // Starts counting at Monday 09:00 + 1 hour
    expect(toLocalString(dueDate)).toBe('2026-08-10T10:00');
  });

  it('handles Friday evening edge case correctly (Friday 17:59)[cite: 1]', () => {
    const createdAt = createLocalTime('2026-08-14T17:59:00'); // Friday
    const dueDate = slaService.calculateDueDate(createdAt, 1); // 1 hour allocation
    
    // 1 minute used on Friday. 59 minutes roll over to Monday at 09:00.
    expect(toLocalString(dueDate)).toBe('2026-08-17T09:59');
  });

  it('skips weekends entirely (created on Saturday)[cite: 1]', () => {
    const createdAt = createLocalTime('2026-08-15T12:00:00'); // Saturday
    const dueDate = slaService.calculateDueDate(createdAt, 4); 
    
    // Starts counting Monday 09:00 + 4 hours
    expect(toLocalString(dueDate)).toBe('2026-08-17T13:00');
  });

  it('skips configured public holidays[cite: 1]', () => {
    const createdAt = createLocalTime('2026-08-14T17:00:00'); // Friday
    
    // Let's pretend Monday, August 17th is a holiday
    const holidayDate = createLocalTime('2026-08-17T00:00:00');
    
    // 4 hours allocated. 1 hour used on Friday. 3 hours remain.
    // Skips Saturday, Sunday, AND Monday (holiday). Starts Tuesday 09:00.
    const dueDate = slaService.calculateDueDate(createdAt, 4, [holidayDate]);
    
    expect(toLocalString(dueDate)).toBe('2026-08-18T12:00');
  });

  it('evaluates SLA states correctly (ON_TRACK, AT_RISK, BREACHED)[cite: 1]', () => {
    const allocatedMins = 60; // 1 hour
    
    expect(slaService.calculateSlaState(10, allocatedMins)).toBe('ON_TRACK');
    expect(slaService.calculateSlaState(50, allocatedMins)).toBe('AT_RISK'); // >75%[cite: 1]
    expect(slaService.calculateSlaState(65, allocatedMins)).toBe('BREACHED');
  });
});