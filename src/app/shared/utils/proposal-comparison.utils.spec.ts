import { ServiceProposal, ServiceProposalStatus } from '../models/service-request';
import { canAcceptProposal, compareProposals, proposalTotal, ProposalSort } from './proposal-comparison.utils';

describe('Proposal comparison', () => {
  it('includes travel fees when ranking the total and leaves the source list unchanged', () => {
    const proposals: ServiceProposal[] = [{ id: 'first', price: 80, travelFee: 50 }, { id: 'second', price: 100, travelFee: 0 }];
    expect(proposalTotal(proposals[0])).toBe(130);
    expect(compareProposals(proposals, ProposalSort.LowestTotal)[0].id).toBe('second');
    expect(proposals[0].id).toBe('first');
  });
  it('does not allow expired or already accepted proposals', () => {
    const proposal: ServiceProposal = { status: ServiceProposalStatus.Sent, validUntil: '2000-01-01T00:00:00Z' };
    expect(canAcceptProposal(proposal)).toBe(false);
    expect(canAcceptProposal({ ...proposal, status: ServiceProposalStatus.Accepted, validUntil: '2099-01-01T00:00:00Z' })).toBe(false);
    expect(canAcceptProposal({ ...proposal, validUntil: '2099-01-01T00:00:00Z' })).toBe(true);
  });
});
