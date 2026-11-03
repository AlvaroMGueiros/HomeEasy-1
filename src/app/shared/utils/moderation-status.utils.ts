import { ModerationStatus } from '../models/moderation-status';

export function getModerationStatusLabel(status: ModerationStatus): string {
  switch (status) {
    case ModerationStatus.Pending: return 'Aguardando análise';
    case ModerationStatus.InReview: return 'Em análise';
    case ModerationStatus.Approved: return 'Aprovado';
    case ModerationStatus.Rejected: return 'Encerrado sem procedência';
    case ModerationStatus.Resolved: return 'Resolvido';
    default: return 'Situação indisponível';
  }
}

export function getDisputeHeading(status: ModerationStatus): string {
  if (status === ModerationStatus.Resolved) return 'Problema resolvido';
  if (status === ModerationStatus.Rejected) return 'Análise encerrada';
  return 'Problema em análise';
}
