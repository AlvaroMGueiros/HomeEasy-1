import { ServiceUrgency } from './marketplace.enums';
import { calculateOpportunityRanking } from './opportunity-ranking.utils';

describe('calculateOpportunityRanking', () => {
  const now = new Date('2026-09-18T12:00:00.000Z');

  it('prioritizes a recent direct and nearby opportunity', () => {
    const result = calculateOpportunityRanking({
      isDirectRequest: true,
      distanceKm: 3,
      urgency: ServiceUrgency.Urgent,
      proposalCount: 0,
      maximumProposals: 4,
      createdAt: new Date('2026-09-18T10:00:00.000Z')
    }, now);

    expect(result.matchScore).toBe(100);
    expect(result.matchReasons).toContain('Solicitação direcionada para você');
  });

  it('keeps a compatible city opportunity with a lower transparent score', () => {
    const result = calculateOpportunityRanking({
      isDirectRequest: false,
      distanceKm: null,
      urgency: ServiceUrgency.Flexible,
      proposalCount: 3,
      maximumProposals: 4,
      createdAt: new Date('2026-09-17T10:00:00.000Z')
    }, now);

    expect(result).toEqual({
      matchScore: 45,
      matchReasons: ['Compatível com seus serviços', 'Na sua cidade de atendimento']
    });
  });
});
