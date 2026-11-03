import { MarketplaceOrder } from '../models/order-detail';
import { OrderStatus } from '../../Usuarios/pedido';
import { calculateProfessionalDashboard } from './professional-dashboard.utils';
describe('Professional dashboard', () => {
  it('only counts completed work performed by the current professional as revenue', () => {
    const orders = [
      { professionalId: 'own', status: OrderStatus.Completed, agreedPrice: '120.50' },
      { professionalId: 'other', status: OrderStatus.Completed, agreedPrice: '500' },
      { professionalId: 'own', status: OrderStatus.Scheduled, agreedPrice: '300' }
    ] as MarketplaceOrder[];
    const dashboard = calculateProfessionalDashboard([], orders, 'own');
    expect(dashboard.grossRevenue).toBe(120.5);
    expect(dashboard.completedOrders).toBe(1);
    expect(dashboard.activeOrders).toBe(1);
    expect(dashboard.conversionRate).toBeNull();
  });
});
