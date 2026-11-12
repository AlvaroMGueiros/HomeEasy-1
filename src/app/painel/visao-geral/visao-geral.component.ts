import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ServiceRequestService } from '../../Servicos/service-request.service';
import { ServicoPedidoService } from '../../Servicos/servico-pedido.service';
import { FavoriteProfessional, FavoritesService } from '../../Servicos/favorites.service';
import { LoginServiceService } from '../../Servicos/login-service.service';
import { OrderStatus } from '../../Usuarios/pedido';
import { MarketplaceOrder } from '../../shared/models/order-detail';
import { OwnProposal, ServiceProposalStatus, ServiceRequest } from '../../shared/models/service-request';
import { getCurrentUser } from '../../shared/utils/session-user.utils';

interface StatusSegment { key: string; label: string; count: number; tone: string; }
interface AgendaDay { key: string; day: string; weekday: string; count: number; }

const ACTIVE_ORDER_STATUSES = [OrderStatus.Accepted, OrderStatus.Scheduled, OrderStatus.InProgress];
const OPEN_REQUEST_STATUSES = [OrderStatus.Requested, OrderStatus.ProposalReceived];

@Component({
  standalone: false,
  selector: 'app-visao-geral',
  templateUrl: './visao-geral.component.html',
  styleUrls: ['./visao-geral.component.css']
})
export class VisaoGeralComponent implements OnInit {
  readonly user = getCurrentUser();
  readonly userId = this.user?.id || this.user?.uid || '';
  readonly today = new Date();

  isLoading = true;
  requests: ServiceRequest[] = [];
  orders: MarketplaceOrder[] = [];
  favorites: FavoriteProfessional[] = [];
  proposals: OwnProposal[] = [];

  segments: StatusSegment[] = [];
  activeCount = 0;
  completedCount = 0;
  revenue = 0;
  ordersTotal = 0;
  cancelledCount = 0;
  requestsOpen = 0;
  requestsClosed = 0;
  proposalsPending = 0;
  proposalsAccepted = 0;
  proposalsLost = 0;
  conversionRate: number | null = null;
  upcoming: MarketplaceOrder[] = [];
  agendaDays: AgendaDay[] = [];
  selectedDay = '';
  openRequests: ServiceRequest[] = [];
  requestsWithProposals = 0;
  favoriteIndex = 0;

  readonly quickServices = ['Eletricista', 'Encanador', 'Diarista', 'Pintor', 'Montador de móveis'];

  constructor(
    private requestService: ServiceRequestService,
    private orderService: ServicoPedidoService,
    private favoritesService: FavoritesService,
    private loginService: LoginServiceService,
    private router: Router
  ) {}

  ngOnInit() { void this.load(); }

  get monthLabel() {
    const label = this.today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(' de ', ' ');
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  get requestsWaiting() { return this.requestsOpen - this.requestsWithProposals; }

  get segmentTotal() { return this.segments.reduce((sum, segment) => sum + segment.count, 0); }

  get filteredUpcoming() {
    if (!this.selectedDay) return this.upcoming.slice(0, 6);
    return this.upcoming.filter(order => this.dayKey(order.scheduledAt) === this.selectedDay);
  }

  get requestsShare() {
    return this.requestsOpen ? Math.round(this.requestsWithProposals / this.requestsOpen * 100) : 0;
  }

  get visibleFavorites() { return this.favorites.slice(this.favoriteIndex, this.favoriteIndex + 2); }

  async load() {
    this.isLoading = true;
    const safe = <T>(source: any, fallback: T) => firstValueFrom<T>(source.pipe(catchError(() => of(fallback))));
    const [requests, orders, favorites, proposals] = await Promise.all([
      safe<ServiceRequest[]>(this.requestService.getClientRequests(this.userId), []),
      safe<MarketplaceOrder[]>(this.orderService.findOwnOrders(), []),
      safe<FavoriteProfessional[]>(this.favoritesService.findFavorites(), []),
      safe<OwnProposal[]>(this.requestService.getOwnProposals(), [])
    ]);
    this.requests = requests || [];
    this.orders = orders || [];
    this.favorites = favorites || [];
    this.proposals = proposals || [];
    this.compute();
    this.isLoading = false;
  }

  private compute() {
    // Provider-first: the overview is only shown to people who offer services.
    const proOrders = this.orders.filter(order => order.professionalId === this.userId);
    const count = (list: MarketplaceOrder[], statuses: OrderStatus[]) => list.filter(order => statuses.includes(order.status)).length;

    const scheduled = count(proOrders, [OrderStatus.Accepted, OrderStatus.Scheduled]);
    const inProgress = count(proOrders, [OrderStatus.InProgress]);
    const disputed = count(proOrders, [OrderStatus.Disputed]);
    this.completedCount = count(proOrders, [OrderStatus.Completed]);
    this.cancelledCount = count(proOrders, [OrderStatus.CancelledByClient, OrderStatus.DeclinedByProfessional, OrderStatus.Expired]);
    this.ordersTotal = proOrders.length;
    this.activeCount = scheduled + inProgress + disputed;
    this.revenue = proOrders
      .filter(order => order.status === OrderStatus.Completed)
      .reduce((sum, order) => sum + Number(order.agreedPrice || 0), 0);

    this.segments = [
      { key: 'scheduled', label: 'Agendados', count: scheduled, tone: '' },
      { key: 'progress', label: 'Em andamento', count: inProgress, tone: '' },
      { key: 'disputed', label: 'Em disputa', count: disputed, tone: '' },
      { key: 'done', label: 'Concluídos', count: this.completedCount, tone: '' }
    ];
    if (this.cancelledCount) this.segments.push({ key: 'cancelled', label: 'Cancelados', count: this.cancelledCount, tone: '' });

    this.upcoming = this.orders
      .filter(order => ACTIVE_ORDER_STATUSES.includes(order.status))
      .sort((a, b) => new Date(a.scheduledAt || '9999-01-01').getTime() - new Date(b.scheduledAt || '9999-01-01').getTime());
    this.agendaDays = this.buildAgendaDays();

    // Requests the user made as a client: only open ones can be waiting
    this.openRequests = [...this.requests]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 6);
    const open = this.requests.filter(request => OPEN_REQUEST_STATUSES.includes(request.status));
    this.requestsOpen = open.length;
    this.requestsWithProposals = open.filter(request => (request.proposalCount || 0) > 0).length;
    this.requestsClosed = this.requests.length - open.length;

    // Proposals sent as a professional
    this.proposalsPending = this.proposals.filter(proposal => proposal.status === ServiceProposalStatus.Sent).length;
    this.proposalsAccepted = this.proposals.filter(proposal => proposal.status === ServiceProposalStatus.Accepted).length;
    this.proposalsLost = this.proposals.length - this.proposalsPending - this.proposalsAccepted;
    const decided = this.proposals.length - this.proposalsPending;
    this.conversionRate = decided ? Math.round(this.proposalsAccepted / decided * 100) : null;
  }

  private buildAgendaDays(): AgendaDay[] {
    const counts = new Map<string, number>();
    for (const order of this.upcoming) {
      if (!order.scheduledAt) continue;
      const key = this.dayKey(order.scheduledAt);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const keys = [...counts.keys()].slice(0, 5);
    const cursor = new Date(this.today);
    while (keys.length < 5) {
      const key = this.dayKey(cursor.toISOString());
      if (!keys.includes(key)) keys.push(key);
      cursor.setDate(cursor.getDate() + 1);
    }
    return keys.sort().map(key => {
      const date = new Date(key + 'T12:00:00');
      return {
        key,
        day: String(date.getDate()).padStart(2, '0'),
        weekday: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        count: counts.get(key) || 0
      };
    });
  }

  dayKey(value?: string) {
    if (!value) return '';
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  dots(count: number) { return Array.from({ length: Math.min(count, 5) }); }

  selectDay(key: string) { this.selectedDay = this.selectedDay === key ? '' : key; }

  segmentWidth(segment: StatusSegment) {
    return this.segmentTotal ? (segment.count / this.segmentTotal * 100) : 0;
  }

  requestStatusLabel(request: ServiceRequest) {
    if ((request.proposalCount || 0) > 0) return `${request.proposalCount} ${request.proposalCount === 1 ? 'proposta' : 'propostas'}`;
    if (OPEN_REQUEST_STATUSES.includes(request.status)) return 'Aguardando';
    return 'Encerrado';
  }

  moveFavorites(step: number) {
    const max = Math.max(this.favorites.length - 2, 0);
    this.favoriteIndex = Math.min(Math.max(this.favoriteIndex + step, 0), max);
  }

  initials(name: string) {
    return (name || '?').split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  }

  searchService(service: string) {
    void this.router.navigate(['/feed'], { queryParams: { q: service } });
  }

  async logout() {
    await this.loginService.sair();
    await this.router.navigate(['/home']);
  }
}
