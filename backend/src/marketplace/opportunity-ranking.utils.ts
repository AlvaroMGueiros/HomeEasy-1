import { ServiceUrgency } from './marketplace.enums';

interface OpportunityRankingInput {
  isDirectRequest: boolean;
  distanceKm: number | null;
  urgency: ServiceUrgency;
  proposalCount: number;
  maximumProposals: number;
  createdAt: Date;
}

export interface OpportunityRanking {
  matchScore: number;
  matchReasons: string[];
}

export function calculateOpportunityRanking(
  input: OpportunityRankingInput,
  now = new Date()
): OpportunityRanking {
  let matchScore = 40;
  const matchReasons = ['Compatível com seus serviços'];

  if (input.isDirectRequest) {
    matchScore += 25;
    matchReasons.push('Solicitação direcionada para você');
  }
  if (input.distanceKm !== null) {
    if (input.distanceKm <= 5) matchScore += 20;
    else if (input.distanceKm <= 15) matchScore += 15;
    else if (input.distanceKm <= 30) matchScore += 10;
    else matchScore += 5;
    matchReasons.push(`${input.distanceKm.toFixed(1)} km de distância`);
  } else {
    matchScore += 5;
    matchReasons.push('Na sua cidade de atendimento');
  }
  if (input.urgency === ServiceUrgency.Urgent) {
    matchScore += 10;
    matchReasons.push('Cliente precisa com urgência');
  }
  if (input.proposalCount === 0) {
    matchScore += 10;
    matchReasons.push('Ainda sem propostas');
  } else if (input.proposalCount < input.maximumProposals / 2) {
    matchScore += 5;
    matchReasons.push('Baixa concorrência');
  }
  const ageHours = (now.getTime() - input.createdAt.getTime()) / (60 * 60 * 1000);
  if (ageHours <= 6) {
    matchScore += 5;
    matchReasons.push('Oportunidade recente');
  }

  return { matchScore: Math.min(matchScore, 100), matchReasons };
}
