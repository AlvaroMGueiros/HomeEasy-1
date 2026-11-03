import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { OrderStatus, Pedido } from '../Usuarios/pedido';
import { Servico } from '../Usuarios/servico';
import { Usuario } from '../Usuarios/usuario';
import { ServicoPedido } from '../Usuarios/serico-pedido';
import { ScheduleService } from './schedule.service';
import { ServicosService } from './servicos.service';
import { CancellationReason } from '../shared/models/cancellation-reason';
import { MarketplaceOrder, OrderDetail, OrderDispute } from '../shared/models/order-detail';
import { ProfessionalReview } from '../shared/models/professional-profile';

interface ApiOrder {
  id: string;
  clientId: string;
  professionalId: string;
  agreedPrice: string;
  scheduledAt?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  request: {
    serviceId: string;
    service: { name: string };
    address: string;
    city: string;
    state: string;
    preferredAt?: string;
  };
  proposal: { message: string; price: string };
}

@Injectable({ providedIn: 'root' })
export class ServicoPedidoService {
  findOrder(orderId: string) { return this.http.get<OrderDetail>(`${environment.apiUrl}/marketplace/orders/${orderId}`); }
  findOwnOrders() { return this.http.get<MarketplaceOrder[]>(`${environment.apiUrl}/marketplace/orders/me`); }
  changeStatus(orderId: string, status: OrderStatus) { return this.http.patch<MarketplaceOrder>(`${environment.apiUrl}/marketplace/orders/${orderId}/status`, { status }); }
  cancelOrder(orderId: string, reason: CancellationReason, details: string) { return this.http.post<MarketplaceOrder>(`${environment.apiUrl}/marketplace/orders/${orderId}/cancel`, { reason, details: details || undefined }); }
  findDispute(orderId: string) { return this.http.get<OrderDispute>(`${environment.apiUrl}/orders/${orderId}/dispute`); }
  reviewOrder(orderId: string, rating: number, comment: string) { return this.http.post<ProfessionalReview>(`${environment.apiUrl}/orders/${orderId}/reviews`, { rating, comment }); }
  constructor(
    private http: HttpClient,
    private scheduleService: ScheduleService,
    private servicosService: ServicosService
  ) {}

  async addServicoPedido(usuario: Usuario, servico: Servico, serviceDetails: ServicoPedido) {
    if (!servico.id) {
      throw new Error('Selecione um serviço válido.');
    }
    await this.servicosService.updateProfessionalServiceDetails(
      usuario,
      servico,
      Number(serviceDetails.preco || 0),
      serviceDetails.detalhe || '',
      Number(serviceDetails.serviceRadiusKm || 25)
    );
    await this.scheduleService.replaceWeeklySchedule(
      serviceDetails.availableWeekdays || [],
      serviceDetails.availableStartTime || '08:00',
      serviceDetails.availableEndTime || '18:00'
    );
    return serviceDetails;
  }

  getDetalheServico(userId: string, serviceId: string) {
    return this.http.get<unknown>(`${environment.apiUrl}/professionals/${userId}`).pipe(
      map(profile => {
        const professional = profile as {
          serviceRadiusKm?: number;
          services?: Array<{ id: string; description?: string; basePrice?: number }>;
        };
        const service = professional.services?.find(currentService => currentService.id === serviceId);
        return {
          detalhe: service?.description || '',
          preco: service?.basePrice || 0,
          serviceRadiusKm: professional.serviceRadiusKm || 25
        } as ServicoPedido;
      })
    );
  }

  addPedido(cliente: Usuario, servidor: Usuario, pedido: Pedido) {
    return Promise.reject(
      new Error('Crie uma solicitação e escolha uma proposta para contratar com segurança.')
    );
  }

  updateOrderStatus(
    order: Pedido,
    nextStatus: OrderStatus,
    actorId: string,
    cancellationReason?: CancellationReason,
    cancellationDetails?: string
  ) {
    if (nextStatus === OrderStatus.CancelledByClient || nextStatus === OrderStatus.DeclinedByProfessional) {
      return firstValueFrom(
        this.http.post(`${environment.apiUrl}/marketplace/orders/${order.id}/cancel`, {
          reason: cancellationReason || (
            actorId === order.idContratante
              ? CancellationReason.ServiceNoLongerNeeded
              : CancellationReason.ProfessionalUnavailable
          ),
          details: cancellationDetails || undefined
        })
      );
    }
    return firstValueFrom(
      this.http.patch(`${environment.apiUrl}/marketplace/orders/${order.id}/status`, { status: nextStatus })
    );
  }

  submitProposal(order: Pedido, proposalPrice: number, proposalMessage: string, actorId: string) {
    return Promise.reject(new Error('Envie propostas pela lista de oportunidades do marketplace.'));
  }

  getPedidosFeitos(userId: string) {
    return this.getOrders().pipe(map(orders => orders.filter(order => order.idContratante === userId)));
  }

  getPedidoFeito(clientId: string, orderId: string) {
    return this.getPedidosFeitos(clientId).pipe(map(orders => orders.find(order => order.id === orderId)));
  }

  getPedidosRecebidos(userId: string) {
    return this.getOrders().pipe(map(orders => orders.filter(order => order.idServidor === userId)));
  }

  getPedidoRecebido(professionalId: string, orderId: string) {
    return this.getPedidosRecebidos(professionalId).pipe(
      map(orders => orders.find(order => order.id === orderId))
    );
  }

  deletePedidoRecebido() {
    return Promise.reject(new Error('Pedidos não podem ser apagados; cancele o atendimento informando o motivo.'));
  }

  deletePedidoFeito() {
    return Promise.reject(new Error('Pedidos não podem ser apagados; cancele o atendimento informando o motivo.'));
  }

  private getOrders() {
    return this.http
      .get<ApiOrder[]>(`${environment.apiUrl}/marketplace/orders/me`)
      .pipe(map(orders => orders.map(order => this.toPedido(order))));
  }

  private toPedido(order: ApiOrder): Pedido {
    const scheduledAt = order.scheduledAt || order.request.preferredAt;
    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    return {
      id: order.id,
      nome: order.request.service?.name,
      idServico: order.request.serviceId,
      idContratante: order.clientId,
      idServidor: order.professionalId,
      data: scheduledDate ? scheduledDate.toISOString().slice(0, 10) : '',
      hora: scheduledDate ? scheduledDate.toTimeString().slice(0, 5) : '',
      local: order.request.address,
      cidade: order.request.city,
      estado: order.request.state,
      preco: Number(order.agreedPrice),
      status: order.status,
      proposalPrice: Number(order.proposal.price),
      proposalMessage: order.proposal.message,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };
  }
}
