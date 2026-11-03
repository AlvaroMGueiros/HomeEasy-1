import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ServicoPedidoService } from '../../Servicos/servico-pedido.service';
import { LoginServiceService } from '../../Servicos/login-service.service';
import { MarketplaceOrder } from '../../shared/models/order-detail';
import { OrderStatus } from '../../Usuarios/pedido';
import { getStatusLabel } from '../../shared/utils/order-status.utils';
import { getCurrentUser } from '../../shared/utils/session-user.utils';
import { resolveHttpErrorMessage } from '../../shared/utils/http-error.utils';

@Component({ standalone: false, selector: 'app-orders', templateUrl: './orders.component.html', styleUrls: ['./orders.component.css'] })
export class OrdersComponent implements OnInit, OnDestroy {
  userId = getCurrentUser()?.id || getCurrentUser()?.uid || '';
  orders: MarketplaceOrder[] = [];
  isProfessionalView = false;
  isLoading = true;
  error = '';
  private active = true;
  readonly getStatusLabel = getStatusLabel;
  constructor(private service: ServicoPedidoService, private login: LoginServiceService, private router: Router) {}
  ngOnInit() { void this.load(); }
  ngOnDestroy() { this.active = false; }
  get visibleOrders() { return this.orders.filter(order => this.isProfessionalView ? order.professionalId === this.userId : order.clientId === this.userId); }
  async load() {
    this.isLoading = true; this.error = '';
    try { const orders = await firstValueFrom(this.service.findOwnOrders()); if (this.active) this.orders = orders; }
    catch (failure) { if (this.active) this.error = resolveHttpErrorMessage(failure, 'Não foi possível carregar seus atendimentos.'); }
    finally { if (this.active) this.isLoading = false; }
  }
  isCompleted(order: MarketplaceOrder) { return order.status === OrderStatus.Completed; }
  async logout() { await this.login.sair(); await this.router.navigate(['/home']); }
}
