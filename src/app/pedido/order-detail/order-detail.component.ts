import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';

import { ServicoPedidoService } from '../../Servicos/servico-pedido.service';
import { ChatService } from '../../Servicos/chat.service';
import { SafetyService } from '../../Servicos/safety.service';
import { LoginServiceService } from '../../Servicos/login-service.service';
import { OrderDetail, OrderDispute, DisputeReason } from '../../shared/models/order-detail';
import { CancellationReason } from '../../shared/models/cancellation-reason';
import { OrderStatus } from '../../Usuarios/pedido';
import { getCurrentUser } from '../../shared/utils/session-user.utils';
import { getStatusLabel } from '../../shared/utils/order-status.utils';
import { resolveHttpErrorMessage } from '../../shared/utils/http-error.utils';
import { getDisputeHeading, getModerationStatusLabel } from '../../shared/utils/moderation-status.utils';

@Component({ standalone: false, selector: 'app-order-detail', templateUrl: './order-detail.component.html', styleUrls: ['./order-detail.component.css'] })
export class OrderDetailComponent implements OnInit, OnDestroy {
  readonly getModerationStatusLabel = getModerationStatusLabel;
  readonly getDisputeHeading = getDisputeHeading;
  order: OrderDetail;
  dispute: OrderDispute;
  userId = getCurrentUser()?.id || getCurrentUser()?.uid || '';
  isLoading = true;
  isSubmitting = false;
  error = '';
  feedback = '';
  reviewRating = 5;
  reviewComment = '';
  disputeDescription = '';
  disputeReason = DisputeReason.ServiceQuality;
  showHelp = false;
  showCompletion = false;
  showCancellation = false;
  readonly statuses = OrderStatus;
  readonly disputeReasons = [
    { value: DisputeReason.ServiceNotPerformed, label: 'Atraso ou ausência' },
    { value: DisputeReason.ServiceQuality, label: 'Qualidade do serviço' },
    { value: DisputeReason.PriceConflict, label: 'Valor diferente' },
    { value: DisputeReason.PropertyDamage, label: 'Dano no imóvel' },
    { value: DisputeReason.Conduct, label: 'Comportamento inadequado' },
    { value: DisputeReason.Other, label: 'Outro problema' }
  ];
  private routeSubscription: Subscription;
  private loadVersion = 0;
  private refreshTimer: ReturnType<typeof setInterval>;

  constructor(private route: ActivatedRoute, private router: Router, private orders: ServicoPedidoService,
    private chat: ChatService, private safety: SafetyService, private login: LoginServiceService) {}

  ngOnInit() {
    this.routeSubscription = this.route.params.subscribe(() => { this.order = null; void this.load(); });
    this.refreshTimer = setInterval(() => {
      if (document.visibilityState !== 'visible' || this.isLoading || this.isSubmitting || !this.order) return;
      if ([OrderStatus.CancelledByClient, OrderStatus.DeclinedByProfessional].includes(this.order.status) || (this.order.status === OrderStatus.Completed && this.order.review)) return;
      void this.load(true);
    }, 30000);
  }
  ngOnDestroy() { this.routeSubscription?.unsubscribe(); clearInterval(this.refreshTimer); this.loadVersion += 1; }
  get isClient() { return this.order?.clientId === this.userId; }
  get isProfessional() { return this.order?.professionalId === this.userId; }
  get canStart() { return this.isProfessional && [OrderStatus.Accepted, OrderStatus.Scheduled].includes(this.order.status); }
  get canComplete() { return this.order?.status === OrderStatus.InProgress && (this.isClient || this.isProfessional); }
  get canCancel() { return this.order && [OrderStatus.Accepted, OrderStatus.Scheduled, OrderStatus.InProgress].includes(this.order.status); }
  get canDispute() { return this.order && ![OrderStatus.CancelledByClient, OrderStatus.DeclinedByProfessional, OrderStatus.Disputed].includes(this.order.status); }
  get statusLabel() {
    if (this.order?.status === OrderStatus.Disputed && this.dispute) return getDisputeHeading(this.dispute.status);
    return getStatusLabel(this.order?.status);
  }

  async load(silent = false) {
    const version = ++this.loadVersion;
    if (!silent) this.isLoading = true;
    this.error = '';
    try {
      const order = await firstValueFrom(this.orders.findOrder(this.route.snapshot.paramMap.get('orderId') || this.route.snapshot.paramMap.get('idd')));
      if (version !== this.loadVersion) return;
      this.order = order; this.dispute = null;
      if (order.status === OrderStatus.Disputed) {
        const dispute = await firstValueFrom(this.orders.findDispute(order.id));
        if (version === this.loadVersion) this.dispute = dispute;
      }
    } catch (failure) { if (version === this.loadVersion) this.error = resolveHttpErrorMessage(failure, 'Não foi possível carregar este atendimento.'); }
    finally { if (version === this.loadVersion) this.isLoading = false; }
  }

  async updateStatus(status: OrderStatus) {
    if (this.isSubmitting) return;
    this.isSubmitting = true; this.error = '';
    try { await firstValueFrom(this.orders.changeStatus(this.order.id, status)); await this.load(); }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível atualizar o andamento do serviço.'); }
    finally { this.isSubmitting = false; this.showCompletion = false; }
  }
  async cancel() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    try {
      const reason = this.isClient ? CancellationReason.ServiceNoLongerNeeded : CancellationReason.ProfessionalUnavailable;
      await firstValueFrom(this.orders.cancelOrder(this.order.id, reason, 'Cancelado pelo participante no site.'));
      await this.load();
    } catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível cancelar o atendimento.'); }
    finally { this.isSubmitting = false; this.showCancellation = false; }
  }
  async publishReview() {
    if (this.isSubmitting || !this.isClient || this.order.status !== OrderStatus.Completed || this.order.review) return;
    if (this.reviewComment.trim().length < 10) { this.error = 'Escreva uma avaliação com pelo menos 10 caracteres.'; return; }
    this.isSubmitting = true; this.error = '';
    try { this.order.review = await firstValueFrom(this.orders.reviewOrder(this.order.id, this.reviewRating, this.reviewComment.trim())); this.feedback = 'Avaliação publicada.'; }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível publicar a avaliação.'); }
    finally { this.isSubmitting = false; }
  }
  async reportProblem() {
    if (this.isSubmitting) return;
    if (this.disputeDescription.trim().length < 20) { this.error = 'Explique o problema usando pelo menos 20 caracteres.'; return; }
    this.isSubmitting = true; this.error = '';
    try { await firstValueFrom(this.safety.openDispute(this.order.id, this.disputeReason, this.disputeDescription.trim())); await this.load(); this.feedback = 'Relato enviado para análise.'; }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível registrar o problema.'); }
    finally { this.isSubmitting = false; }
  }
  async openConversation() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    try { const conversation = await firstValueFrom(this.chat.createFromOrder(this.order.id)); await this.router.navigate(['/chat', conversation.id]); }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível abrir a conversa do atendimento.'); }
    finally { this.isSubmitting = false; }
  }
  rehire() { void this.router.navigate(['/solicitar', this.order.request.serviceId, 'profissional', this.order.professionalId], { queryParams: { sourceOrderId: this.order.id } }); }
  async logout() { await this.login.sair(); await this.router.navigate(['/home']); }
}
