import type { ProfessionalSchedule } from '../../Servicos/schedule.service';

export interface CalendarDay { date: string; weekday: string; number: string; }

export function getBrasiliaToday(now = new Date()) {
  return new Date(now.getTime() - 3 * 3600000).toISOString().slice(0, 10);
}

export function getCalendarDays(offset: number, now = new Date()): CalendarDay[] {
  const start = new Date(getBrasiliaToday(now) + 'T12:00:00Z');
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start.getTime() + (offset + index) * 86400000);
    return { date: date.toISOString().slice(0, 10), weekday: date.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }), number: String(date.getUTCDate()) };
  });
}

export function getFutureScheduleInstant(date: string, time: string, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const instant = new Date(`${date}T${time}:00-03:00`);
  const localDate = new Date(instant.getTime() - 3 * 3600000);
  if (!Number.isFinite(instant.getTime()) || localDate.toISOString().slice(0, 10) !== date || instant.getTime() <= now || instant.getTime() > now + 90 * 86400000) return null;
  return instant.toISOString();
}

export function getScheduledTimes(schedule: ProfessionalSchedule, date: string, now = Date.now()): string[] {
  const weekday = new Date(date + 'T12:00:00Z').getUTCDay();
  const exceptions = schedule.exceptions.filter(exception => exception.date.slice(0, 10) === date);
  if (exceptions.some(exception => exception.isUnavailable)) return [];
  const periods = exceptions.length ? exceptions : schedule.periods.filter(period => period.weekday === weekday);
  const times = new Set<string>();
  for (const period of periods) {
    if (!period.startTime || !period.endTime) continue;
    const start = Number(period.startTime.slice(0, 2)) * 60 + Number(period.startTime.slice(3, 5));
    const end = Number(period.endTime.slice(0, 2)) * 60 + Number(period.endTime.slice(3, 5));
    for (let minutes = start; minutes + 60 <= end && minutes + 60 < 1440; minutes += 60) {
      const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
      if (getFutureScheduleInstant(date, time, now)) times.add(time);
    }
  }
  return [...times].sort();
}
