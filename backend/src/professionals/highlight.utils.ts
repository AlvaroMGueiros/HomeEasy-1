import { BadRequestException } from '@nestjs/common';
import { ProfessionalPhoto } from './professionalPhoto';
import { ProfessionalHighlight } from './professional-highlight.entity';

export function assertHighlightPhotos(mediaIds: string[], portfolioPhotos: ProfessionalPhoto[]) {
  const ownedPhotoIds = new Set(portfolioPhotos.map(photo => photo.mediaId));
  if (!mediaIds.length || mediaIds.length > 3 || new Set(mediaIds).size !== mediaIds.length || mediaIds.some(mediaId => !ownedPhotoIds.has(mediaId))) {
    throw new BadRequestException('Escolha de uma a três fotos diferentes do seu próprio portfólio.');
  }
}

export function isHighlightSponsored(highlight: Pick<ProfessionalHighlight, 'sponsorshipConfirmedAt' | 'sponsoredUntil'>, now = Date.now()) {
  return Boolean(highlight.sponsorshipConfirmedAt && highlight.sponsoredUntil &&
    highlight.sponsorshipConfirmedAt.getTime() <= now && highlight.sponsoredUntil.getTime() > now);
}

export function toHighlightSummary(highlight: ProfessionalHighlight) {
  return { id: highlight.id, professionalId: highlight.professionalId, serviceId: highlight.serviceId,
    serviceName: highlight.service?.name, title: highlight.title, description: highlight.description,
    mediaIds: highlight.mediaIds, status: highlight.status, createdAt: highlight.createdAt,
    isSponsored: isHighlightSponsored(highlight) };
}
