import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ServiceRequestService } from '../../Servicos/service-request.service';
import { ServicoPedidoService } from '../../Servicos/servico-pedido.service';
import { LoginServiceService } from '../../Servicos/login-service.service';
import { calculateProfessionalDashboard } from '../../shared/utils/professional-dashboard.utils';
import { getCurrentUser } from '../../shared/utils/session-user.utils';
import { resolveHttpErrorMessage } from '../../shared/utils/http-error.utils';
import { OwnProposal, ServiceProposalStatus } from '../../shared/models/service-request';

@Component({ standalone: false, selector: 'app-professional-dashboard', templateUrl: './professional-dashboard.component.html', styleUrls: ['./professional-dashboard.component.css'] })
export class ProfessionalDashboardComponent implements OnInit {
  userId = getCurrentUser()?.id || getCurrentUser()?.uid || '';
  proposals: OwnProposal[] = [];
  metrics: ReturnType<typeof calculateProfessionalDashboard>;
  isLoading = true; error = '';
  readonly proposalStatuses = ServiceProposalStatus;
  readonly statusLabels = { [ServiceProposalStatus.Sent]: 'Enviada', [ServiceProposalStatus.Accepted]: 'Aceita', [ServiceProposalStatus.Rejected]: 'Não escolhida', [ServiceProposalStatus.Withdrawn]: 'Retirada', [ServiceProposalStatus.Expired]: 'Expirada' };
  constructor(private requests: ServiceRequestService, private orders: ServicoPedidoService, private login: LoginServiceService, private router: Router) {}
  ngOnInit() { void this.load(); }
  async load() {
    this.isLoading = true; this.error = '';
    try { const [proposals, orders] = await Promise.all([firstValueFrom(this.requests.getOwnProposals()), firstValueFrom(this.orders.findOwnOrders())]); this.proposals = proposals; this.metrics = calculateProfessionalDashboard(proposals, orders, this.userId); }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível carregar seu painel profissional.'); }
    finally { this.isLoading = false; }
  }
  async logout() { await this.login.sair(); await this.router.navigate(['/home']); }
}
