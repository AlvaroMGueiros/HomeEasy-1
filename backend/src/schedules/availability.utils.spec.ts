import { resolveAvailabilityParameters } from './availability.utils';

describe('Availability time boundaries', () => {
  const now = Date.parse('2026-10-20T12:00:00Z');
  it('uses Brasília date and weekday across a UTC date boundary', () => {
    expect(resolveAvailabilityParameters('2026-10-21T01:00:00Z', 60, now)).toEqual({
      availableAt: '2026-10-21T01:00:00.000Z', availableUntil: '2026-10-21T02:00:00.000Z', availableDate: '2026-10-20', availableWeekday: 2, availableStart: '22:00:00', availableEnd: '23:00:00'
    });
  });
  it.each(['invalid', '2026-10-20T11:00:00Z', '2027-03-01T12:00:00Z'])('rejects an invalid/out-of-range time %s', value => {
    expect(() => resolveAvailabilityParameters(value, 60, now)).toThrow('próximos 90 dias');
  });
  it('rejects intervals crossing midnight in Brasília', () => {
    expect(() => resolveAvailabilityParameters('2026-10-21T02:30:00Z', 60, now)).toThrow('mesmo dia');
  });
});
