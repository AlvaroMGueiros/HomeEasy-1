import { resolveNotificationRoute } from './notification-route.utils';
describe('Notification routing', () => {
  it('maps existing backend routes to the appropriate web pages', () => {
    expect(resolveNotificationRoute('/usuario/user/pedidos-feitos/order')).toBe('/atendimentos/order');
    expect(resolveNotificationRoute('/solicitacoes/request')).toBe('/solicitacoes/request');
    expect(resolveNotificationRoute('/conversas')).toBe('/conversas');
  });
  it('never navigates to an external or unrecognized address', () => {
    expect(resolveNotificationRoute('https://example.com')).toBe('/meus-servicos');
    expect(resolveNotificationRoute('//example.com')).toBe('/meus-servicos');
    expect(resolveNotificationRoute('javascript:alert(1)')).toBe('/meus-servicos');
  });
});
