import { BadRequestException } from '@nestjs/common';

export function resolveAvailabilityParameters(availableAt: string, durationMinutes = 60, now = Date.now()) {
  const start = new Date(availableAt);
  if (!Number.isFinite(start.getTime()) || start.getTime() <= now || start.getTime() > now + 90 * 86400000) {
    throw new BadRequestException('Escolha um horário futuro nos próximos 90 dias.');
  }
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const localStart = new Date(start.getTime() - 3 * 3600000).toISOString();
  const localEnd = new Date(end.getTime() - 3 * 3600000).toISOString();
  if (localStart.slice(0, 10) !== localEnd.slice(0, 10)) {
    throw new BadRequestException('A consulta deve terminar no mesmo dia, no horário de Brasília.');
  }
  return { availableAt: start.toISOString(), availableUntil: end.toISOString(), availableDate: localStart.slice(0, 10),
    availableWeekday: new Date(localStart).getUTCDay(), availableStart: localStart.slice(11, 19), availableEnd: localEnd.slice(11, 19) };
}

// Fixed SQL; every date, hour and user identifier is bound as a parameter.
export const professionalAvailabilitySql = `(
  EXISTS (SELECT 1 FROM availability_exceptions exception
    WHERE exception.professional_id = profile.user_id AND exception.date = CAST(:availableDate AS date)
      AND exception.is_unavailable = false AND exception.start_time <= CAST(:availableStart AS time)
      AND exception.end_time >= CAST(:availableEnd AS time))
  OR (NOT EXISTS (SELECT 1 FROM availability_exceptions exception
    WHERE exception.professional_id = profile.user_id AND exception.date = CAST(:availableDate AS date))
    AND EXISTS (SELECT 1 FROM availability_periods period
      WHERE period.professional_id = profile.user_id AND period.weekday = :availableWeekday
        AND period.start_time <= CAST(:availableStart AS time) AND period.end_time >= CAST(:availableEnd AS time)))
) AND NOT EXISTS (SELECT 1 FROM orders busy_order JOIN proposals busy_proposal ON busy_proposal.id = busy_order.proposal_id
  WHERE busy_order.professional_id = profile.user_id AND busy_order.status IN ('accepted', 'scheduled', 'in_progress')
    AND busy_order.scheduled_at < CAST(:availableUntil AS timestamptz)
    AND busy_order.scheduled_at + busy_proposal.estimated_duration_minutes * INTERVAL '1 minute' > CAST(:availableAt AS timestamptz))`;
