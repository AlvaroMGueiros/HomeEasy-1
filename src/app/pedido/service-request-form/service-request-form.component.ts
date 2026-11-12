import { getCurrentUser } from '../../shared/utils/session-user.utils';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { ServicoPedidoService } from '../../Servicos/servico-pedido.service';

import { BrazilCity, BrazilLocationService, BrazilState } from '../../Servicos/brazil-location.service';
import { LoginServiceService } from '../../Servicos/login-service.service';
import { ServiceRequestService } from '../../Servicos/service-request.service';
import { ServicosService } from '../../Servicos/servicos.service';
import { UsuarioService } from '../../Servicos/usuario.service';
import { Servico } from '../../Usuarios/servico';
import { Usuario } from '../../Usuarios/usuario';
import { FeedbackType } from '../../shared/action-feedback/action-feedback.component';
import { ServiceRequest, ServiceUrgency } from '../../shared/models/service-request';
import { RequestAttachment, ServiceRequestAnswer, ServiceRequestField } from '../../shared/models/service-request-field';
import { normalizeBrazilStateCode } from '../../shared/utils/brazil-state.utils';
import { createCompressedImageAttachment } from '../../shared/utils/image-attachment.utils';
import { resolveHttpErrorMessage } from '../../shared/utils/http-error.utils';
import { NotificationService } from '../../shared/notification/notification.service';
import { getBrasiliaToday, getFutureScheduleInstant } from '../../shared/utils/availability-calendar.utils';

@Component({
  standalone: false,
  selector: 'app-service-request-form',
  templateUrl: './service-request-form.component.html',
  styleUrls: ['./service-request-form.component.css']
})
export class ServiceRequestFormComponent implements OnInit, OnDestroy {
  authenticated = false;
  userId: string;
  serviceId: string;
  professionalId: string;
  service: Servico = {};
  directedProfessional: Usuario = {};
  user: Usuario = {};
  request: ServiceRequest = { urgency: ServiceUrgency.Flexible };
  states = new Array<BrazilState>();
  cities = new Array<BrazilCity>();
  isLoading = true;
  isSubmitting = false;
  isLoadingCities = false;
  feedbackMessage = '';
  feedbackType: FeedbackType = 'error';
  specificFields = new Array<ServiceRequestField>();
  specificValues: { [key: string]: string | number } = {};
  attachments = new Array<RequestAttachment>();
  isProcessingAttachments = false;
  readonly urgencyOptions = [
    { value: ServiceUrgency.Flexible, label: 'Posso combinar' },
    { value: ServiceUrgency.ThisWeek, label: 'Ainda esta semana' },
    { value: ServiceUrgency.Urgent, label: 'Urgente' }
  ];
  readonly today = getBrasiliaToday();
  private routeSubscription: Subscription;
  private serviceSubscription: Subscription;
  private userSubscription: Subscription;
  private professionalSubscription: Subscription;
  private statesSubscription: Subscription;
  private citiesSubscription: Subscription;

  constructor(
    private activeRoute: ActivatedRoute,
    private router: Router,
    private locationService: BrazilLocationService,
    private loginService: LoginServiceService,
    private requestService: ServiceRequestService,
    private servicesService: ServicosService,
    private userService: UsuarioService,
    private notificationService: NotificationService,
    private orders: ServicoPedidoService
  ) { }

  ngOnInit() {
    const currentUser = getCurrentUser();
    this.authenticated = currentUser != null;
    this.userId = currentUser ? currentUser.uid : '';
    this.routeSubscription = this.activeRoute.params.subscribe((params: Params) => {
      this.serviceId = params['serviceId'];
      this.professionalId = params['professionalId'] || '';
      if (this.professionalId && this.professionalId === this.userId) {
        this.notificationService.showInfo(
          'Contratação indisponível',
          'Você não pode solicitar um orçamento para a própria conta.'
        );
        void this.router.navigate(['/usuario', this.userId]);
        return;
      }
      this.request.preferredProfessionalId = this.professionalId || undefined;
      const preferredDate = this.activeRoute.snapshot.queryParamMap.get('preferredDate') || '';
      const preferredTime = this.activeRoute.snapshot.queryParamMap.get('preferredTime') || '';
      if (getFutureScheduleInstant(preferredDate, preferredTime)) {
        this.request.preferredDate = preferredDate;
        this.request.preferredTime = preferredTime;
      }
      this.loadService();
      this.loadDirectedProfessional();
    });
    this.loadUser();
    this.loadStates();
  }

  ngOnDestroy() {
    this.unsubscribe(this.routeSubscription);
    this.unsubscribe(this.serviceSubscription);
    this.unsubscribe(this.userSubscription);
    this.unsubscribe(this.professionalSubscription);
    this.unsubscribe(this.statesSubscription);
    this.unsubscribe(this.citiesSubscription);
  }

  private async loadPreviousOrder() {
    const sourceOrderId = this.activeRoute.snapshot.queryParamMap.get('sourceOrderId');
    if (!sourceOrderId) return;
    try {
      const order = await firstValueFrom(this.orders.findOrder(sourceOrderId));
      if (order.clientId !== this.userId || order.request.serviceId !== this.serviceId || order.professionalId !== this.professionalId) {
        throw new Error('O atendimento anterior não corresponde ao serviço e profissional escolhidos.');
      }
      const previousRequest = await firstValueFrom(this.requestService.getRequest(order.requestId));
      this.request.description = previousRequest.description;
      this.request.address = previousRequest.address;
      this.request.city = previousRequest.city;
      this.request.state = previousRequest.state;
      this.request.budgetMinimum = previousRequest.budgetMinimum;
      this.request.budgetMaximum = previousRequest.budgetMaximum;
      this.specificValues = {};
      for (const answer of previousRequest.answers || []) this.specificValues[answer.key] = answer.value as string | number;
      this.loadCitiesPreservingSelection(this.request.state, this.request.city);
      this.feedbackType = 'info';
      this.feedbackMessage = 'Revise os dados do serviço anterior e escolha uma nova data.';
    } catch (failure) {
      this.feedbackType = 'error'; this.feedbackMessage = resolveHttpErrorMessage(failure, 'Não foi possível recuperar os dados do serviço anterior.');
    }
  }

  onStateChange() {
    this.request.city = '';
    this.cities = [];
    this.unsubscribe(this.citiesSubscription);

    if (!this.request.state) {
      return;
    }

    this.isLoadingCities = true;
    this.citiesSubscription = this.locationService.getCities(this.request.state).subscribe(
      cities => {
        this.cities = cities;
        this.isLoadingCities = false;
      },
      () => {
        this.isLoadingCities = false;
        this.feedbackType = 'error';
        this.feedbackMessage = 'Não foi possível carregar as cidades deste estado.';
      }
    );
  }

  async submitRequest() {
    if (this.isSubmitting) {
      return;
    }

    this.feedbackMessage = '';
    this.isSubmitting = true;
    this.request.serviceId = this.serviceId;
    this.request.serviceName = this.service.nome;
    this.request.category = this.service.tipo;
    this.request.answers = this.createAnswers();
    this.request.attachments = this.attachments;

    try {
      const requestId = await this.requestService.createRequest(this.request, this.userId);
      this.router.navigate(['/solicitacoes', requestId]);
    } catch (error) {
      this.feedbackType = 'error';
      this.feedbackMessage = resolveHttpErrorMessage(
        error,
        'Não foi possível criar sua solicitação.'
      );
    } finally {
      this.isSubmitting = false;
    }
  }

  async logout() {
    await this.loginService.sair();
    this.router.navigate(['/home']);
  }

  get hasInvalidBudget() {
    return Boolean(this.request.budgetMinimum && this.request.budgetMaximum &&
      Number(this.request.budgetMinimum) > Number(this.request.budgetMaximum));
  }

  get isDirectedRequest() {
    return Boolean(this.professionalId);
  }

  get submitButtonLabel() {
    if (this.isSubmitting) {
      return 'Enviando...';
    }
    if (this.isDirectedRequest) {
      return `Enviar para ${this.directedProfessional.nome || 'o profissional'}`;
    }
    return 'Receber propostas';
  }

  get hasInvalidSpecificFields() {
    return this.specificFields.some(field => field.required && !this.specificValues[field.key]);
  }

  async onAttachmentSelection(event: Event) {
    const input = event.target as HTMLInputElement;
    const selectedFiles = input.files ? Array.from(input.files) : [];
    const remainingSlots = 3 - this.attachments.length;

    if (!remainingSlots || !selectedFiles.length) {
      input.value = '';
      return;
    }

    this.isProcessingAttachments = true;
    this.feedbackMessage = '';
    try {
      const newAttachments = await Promise.all(selectedFiles.slice(0, remainingSlots).map(createCompressedImageAttachment));
      this.attachments = this.attachments.concat(newAttachments);
    } catch (error) {
      this.feedbackType = 'error';
      this.feedbackMessage = error && error.message ? error.message : 'Não foi possível preparar as imagens.';
    } finally {
      this.isProcessingAttachments = false;
      input.value = '';
    }
  }

  removeAttachment(index: number) {
    this.attachments = this.attachments.filter((attachment, attachmentIndex) => attachmentIndex !== index);
  }

  private loadService() {
    this.unsubscribe(this.serviceSubscription);
    this.serviceSubscription = this.servicesService.getServico(this.serviceId).subscribe(service => {
      this.service = service || {};
      this.specificFields = this.service.requestForm || [];
      this.isLoading = false;
    });
  }

  private loadDirectedProfessional() {
    this.unsubscribe(this.professionalSubscription);
    this.directedProfessional = {};
    if (!this.professionalId) {
      return;
    }
    this.professionalSubscription = this.userService
      .getPublicUsuario(this.professionalId)
      .subscribe(professional => this.directedProfessional = professional || {});
  }

  private createAnswers(): ServiceRequestAnswer[] {
    return this.specificFields.reduce((answers, field) => {
      const value = this.specificValues[field.key];
      if (value !== undefined && value !== '') {
        answers.push({ key: field.key, label: field.label, value, unit: field.unit });
      }
      return answers;
    }, new Array<ServiceRequestAnswer>());
  }

  private loadUser() {
    if (!this.userId) {
      return;
    }

    this.userSubscription = this.userService.getUsuario(this.userId).subscribe(user => {
      this.user = user || {};
      this.request.address = this.user.endereco || '';
      this.request.state = normalizeBrazilStateCode(this.user.estado);
      this.request.city = this.user.cidade || '';
        void this.loadPreviousOrder();

      if (this.request.state) {
        this.loadCitiesPreservingSelection(this.request.state, this.request.city);
      }
    });
  }

  private loadStates() {
    this.statesSubscription = this.locationService.getStates().subscribe(
      states => this.states = states,
      () => {
        this.feedbackType = 'error';
        this.feedbackMessage = 'Não foi possível carregar os estados brasileiros.';
      }
    );
  }

  private loadCitiesPreservingSelection(stateCode: string, selectedCity: string) {
    this.isLoadingCities = true;
    this.citiesSubscription = this.locationService.getCities(stateCode).subscribe(
      cities => {
        this.cities = cities;
        this.request.city = selectedCity;
        this.isLoadingCities = false;
      },
      () => this.isLoadingCities = false
    );
  }

  private unsubscribe(subscription: Subscription) {
    if (subscription) {
      subscription.unsubscribe();
    }
  }
}
