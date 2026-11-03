import { MarketplaceOrder } from '../models/order-detail';
import { OrderStatus } from '../../Usuarios/pedido';
import { OwnProposal, ServiceProposalStatus } from '../models/service-request';
export function calculateProfessionalDashboard(proposals: OwnProposal[], orders: MarketplaceOrder[], professionalId: string) {
  let proposalsAccepted = 0; let completedOrders = 0; let activeOrders = 0; let grossRevenue = 0;
  const upcomingOrders: MarketplaceOrder[] = [];
  for (const proposal of proposals) if (proposal.status === ServiceProposalStatus.Accepted) proposalsAccepted += 1;
  for (const order of orders) {
    if (order.professionalId !== professionalId) continue;
    if (order.status === OrderStatus.Completed) { completedOrders += 1; grossRevenue += Number(order.agreedPrice); }
    else if ([OrderStatus.Accepted, OrderStatus.Scheduled, OrderStatus.InProgress].includes(order.status)) { activeOrders += 1; upcomingOrders.push(order); }
  }
  upcomingOrders.sort((left, right) => new Date(left.scheduledAt || '9999-01-01').getTime() - new Date(right.scheduledAt || '9999-01-01').getTime());
  return { proposalsSent: proposals.length, proposalsAccepted, completedOrders, activeOrders, grossRevenue, conversionRate: proposals.length ? proposalsAccepted / proposals.length * 100 : null, upcomingOrders };
}
