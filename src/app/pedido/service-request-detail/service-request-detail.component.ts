import { getCurrentUser } from '../../shared/utils/session-user.utils';
import { resolveHttpErrorMessage } from '../../shared/utils/http-error.utils';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { LoginServiceService } from '../../Servicos/login-service.service';
import { ServiceRequestService } from '../../Servicos/service-request.service';
import { FeedbackType } from '../../shared/action-feedback/action-feedback.component';
import { ServiceProposal, ServiceProposalStatus, ServiceRequest } from '../../shared/models/service-request';
import { OrderStatus } from '../../Usuarios/pedido';
import { canAcceptProposal, compareProposals, proposalTotal, ProposalSort } from '../../shared/utils/proposal-comparison.utils';
import { ServicoPedidoService } from '../../Servicos/servico-pedido.service';
import { firstValueFrom } from 'rxjs';
import { getStatusClass, getStatusLabel } from '../../shared/utils/order-status.utils';
import {
  CancellationReason,
  clientCancellationReasons
} from '../../shared/models/cancellation-reason';

@Component({
  standalone: false,
  selector: 'app-service-request-detail',
  templateUrl: './service-request-detail.component.html',
  styleUrls: ['./service-request-detail.component.css']
})
export class ServiceRequestDetailComponent implements OnInit, OnDestroy {
  authenticated = false;
  userId: string;
  requestId: string;
  request: ServiceRequest = {};
  proposals = new Array<ServiceProposal>();
  selectedProposal: ServiceProposal;
  orderId = '';
  proposalSort = ProposalSort.LowestTotal;
  readonly proposalSortOptions = ProposalSort;
  readonly proposalTotal = proposalTotal;
  readonly canAcceptProposal = canAcceptProposal;
  sortedProposals: ServiceProposal[] = [];
  sortProposals() { this.sortedProposals = compareProposals(this.proposals, this.proposalSort); }
  isLoading = true;
  isSubmitting = false;
  isConfirmingProposal = false;
  isConfirmingCancellation = false;
  feedbackMessage = '';
  feedbackType: FeedbackType = 'error';
  cancellationReason = CancellationReason.ServiceNoLongerNeeded;
  cancellationDetails = '';
  readonly cancellationReasons = clientCancellationReasons;
  readonly sentProposalStatus = ServiceProposalStatus.Sent;
  readonly acceptedProposalStatus = ServiceProposalStatus.Accepted;
  private routeSubscription: Subscription;
  private requestSubscription: Subscription;
  private proposalsSubscription: Subscription;

  constructor(
    private activeRoute: ActivatedRoute,
    private loginService: LoginServiceService,
    private requestService: ServiceRequestService,
    private router: Router,
    private orders: ServicoPedidoService
  ) { }

  ngOnInit() {
    const currentUser = getCurrentUser();
    this.authenticated = currentUser != null;
    this.userId = currentUser ? currentUser.uid : '';
    this.routeSubscription = this.activeRoute.params.subscribe((params: Params) => {
      this.requestId = params['requestId'];
      this.loadRequest();
      this.loadProposals();
    });
  }

  ngOnDestroy() {
    this.unsubscribe(this.routeSubscription);
    this.unsubscribe(this.requestSubscription);
    this.unsubscribe(this.proposalsSubscription);
  }

  requestProposalAcceptance(proposal: ServiceProposal) {
    this.selectedProposal = proposal;
    this.isConfirmingProposal = true;
  }

  dismissProposalAcceptance() {
    this.isConfirmingProposal = false;
    this.selectedProposal = null;
  }

  async acceptProposal() {
    if (!this.selectedProposal || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    try {
      const order = await this.requestService.acceptProposal(this.requestId, this.selectedProposal.id, this.userId);
      await this.router.navigate(['/atendimentos', order.id]);
      this.feedbackType = 'success';
      this.feedbackMessage = 'Proposta aceita. O profissional foi informado e o pedido está confirmado.';
    } catch (error) {
      this.feedbackType = 'error';
      this.feedbackMessage = resolveHttpErrorMessage(error, 'Não foi possível aceitar a proposta.');
    } finally {
      this.isSubmitting = false;
      this.dismissProposalAcceptance();
    }
  }

  async cancelRequest() {
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    try {
      await this.requestService.cancelRequest(
        this.request,
        this.userId,
        this.cancellationReason,
        this.cancellationDetails
      );
      this.feedbackType = 'success';
      this.feedbackMessage = 'Solicitação cancelada e mantida no seu histórico.';
      this.loadRequest();
      this.loadProposals();
    } catch (error) {
      this.feedbackType = 'error';
      this.feedbackMessage = error && error.message ? error.message : 'Não foi possível cancelar a solicitação.';
    } finally {
      this.isSubmitting = false;
      this.isConfirmingCancellation = false;
    }
  }

  get statusLabel() {
    return getStatusLabel(this.request.status);
  }

  get statusClass() {
    return getStatusClass(this.request.status);
  }

  get canCancel() {
    return this.request.status === OrderStatus.Requested || this.request.status === OrderStatus.ProposalReceived;
  }

  async logout() {
    await this.loginService.sair();
    this.router.navigate(['/home']);
  }

  private loadRequest() {
    this.unsubscribe(this.requestSubscription);
    this.requestSubscription = this.requestService.getRequest(this.requestId).subscribe({ next: request => {
      this.request = request || {}; this.isLoading = false;
      if (request.status === OrderStatus.Accepted) void this.findAcceptedOrder();
    }, error: failure => {
      this.isLoading = false;
      this.feedbackMessage = resolveHttpErrorMessage(failure, 'Não foi possível carregar a solicitação.');
    }
    });
  }

  private loadProposals() {
    this.unsubscribe(this.proposalsSubscription);
    this.proposalsSubscription = this.requestService.getRequestProposals(this.requestId).subscribe({ next: proposals => {
      this.proposals = proposals;
      this.sortProposals();
    }, error: failure => {
      this.feedbackMessage = resolveHttpErrorMessage(failure, 'Não foi possível consultar as propostas.');
    }
    });
  }

  private async findAcceptedOrder() {
    try { const orders = await firstValueFrom(this.orders.findOwnOrders()); this.orderId = orders.find(order => order.requestId === this.requestId)?.id || ''; }
    catch (failure) { this.feedbackMessage = resolveHttpErrorMessage(failure, 'Não foi possível localizar o atendimento criado.'); }
  }

  private unsubscribe(subscription: Subscription) {
    if (subscription) {
      subscription.unsubscribe();
    }
  }
}
