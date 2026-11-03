import { ServiceProposal, ServiceProposalStatus } from '../models/service-request';
export enum ProposalSort { LowestTotal = 'lowestTotal', BestRated = 'bestRated' }
export function proposalTotal(proposal: ServiceProposal) { return Number(proposal.price || 0) + Number(proposal.travelFee || 0); }
export function canAcceptProposal(proposal: ServiceProposal) {
  return proposal.status === ServiceProposalStatus.Sent && Boolean(proposal.validUntil) && new Date(proposal.validUntil).getTime() > Date.now();
}
export function compareProposals(proposals: ServiceProposal[], sort: ProposalSort) {
  return [...proposals].sort((left, right) => {
    if (sort === ProposalSort.BestRated) return Number(right.professionalRating || 0) - Number(left.professionalRating || 0);
    return proposalTotal(left) - proposalTotal(right);
  });
}
