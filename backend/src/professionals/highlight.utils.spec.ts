import { ModerationStatus } from '../moderation/moderation.enums';
import { ProfessionalHighlight } from './professional-highlight.entity';
import { ProfessionalPhotoKind } from './professionalPhoto';
import { assertHighlightPhotos, isHighlightSponsored, toHighlightSummary } from './highlight.utils';

describe('Highlights privacy and sponsorship', () => {
  const photos = [{ mediaId: 'owned', kind: ProfessionalPhotoKind.Offered, caption: '' }];
  it('accepts an existing portfolio photo and rejects unowned, empty and repeated selections', () => {
    expect(() => assertHighlightPhotos(['owned'], photos)).not.toThrow();
    for (const mediaIds of [[], ['privateRequestPhoto'], ['owned', 'owned']]) {
      expect(() => assertHighlightPhotos(mediaIds, photos)).toThrow('próprio portfólio');
    }
  });
  it('rejects more than three owned photos', () => {
    const portfolio = ['a', 'b', 'c', 'd'].map(mediaId => ({ mediaId, kind: ProfessionalPhotoKind.Offered, caption: '' }));
    expect(() => assertHighlightPhotos(['a', 'b', 'c', 'd'], portfolio)).toThrow();
  });
  it('requires confirmed sponsorship and a current period', () => {
    const now = Date.parse('2026-10-21T12:00:00Z');
    const past = new Date(now - 1000); const future = new Date(now + 1000);
    expect(isHighlightSponsored({ sponsorshipConfirmedAt: null, sponsoredUntil: future }, now)).toBe(false);
    expect(isHighlightSponsored({ sponsorshipConfirmedAt: past, sponsoredUntil: future }, now)).toBe(true);
    expect(isHighlightSponsored({ sponsorshipConfirmedAt: future, sponsoredUntil: future }, now)).toBe(false);
    expect(isHighlightSponsored({ sponsorshipConfirmedAt: past, sponsoredUntil: past }, now)).toBe(false);
  });
  it('does not expose moderator information, payment dates or private profile fields', () => {
    const highlight = Object.assign(new ProfessionalHighlight(), { id: 'publication', professionalId: 'owner', serviceId: 'service', mediaIds: ['owned'], title: 'Title', description: 'Description', status: ModerationStatus.Pending, reviewedBy: 'admin', reviewNotes: 'internal', professional: { phone: 'private' }, sponsorshipConfirmedAt: null, sponsoredUntil: null });
    const response = toHighlightSummary(highlight);
    expect(response.isSponsored).toBe(false);
    expect(response).not.toHaveProperty('reviewedBy');
    expect(response).not.toHaveProperty('reviewNotes');
    expect(response).not.toHaveProperty('professional');
    expect(response).not.toHaveProperty('sponsorshipConfirmedAt');
  });
});
