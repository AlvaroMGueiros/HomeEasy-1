import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { Review } from '../engagement/review.entity';
import { ProfessionalProfile } from '../professionals/professional-profile.entity';
import { resolveCancellationReasonLabel } from '../mail/mail-event-labels.utils';
import { MailService, MarketplaceMailDetails } from '../mail/mail.service';
import { toPublicProfessionalProfile } from '../professionals/professional-profile.utils';
import { ProfessionalsService } from '../professionals/professionals.service';
import { NotificationType } from '../communications/communication.enums';
import { Conversation } from '../communications/conversation.entity';
import { createNotification } from '../communications/notification.utils';
import { ProfessionalService } from '../professionals/professional-service.entity';
import { Service } from '../services/service.entity';
import { MediaPurpose } from '../storage/media-purpose.enum';
import { StorageService } from '../storage/storage.service';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { CancellationReason, OrderStatus, ProposalStatus, ServiceRequestStatus } from './marketplace.enums';
import { Order } from './order.entity';
import { Proposal } from './proposal.entity';
import { calculateOpportunityRanking } from './opportunity-ranking.utils';
import { ServiceRequest } from './service-request.entity';
import {
  canServiceRequestAcceptProposal,
  canServiceRequestReceiveProposal,
  canTransitionOrder,
  validateServiceAnswers,
  resolveOrderStatusTimestamps,
  validateServiceRequest
} from './marketplace.utils';

const requestLifetimeMilliseconds = 48 * 60 * 60 * 1000;
const proposalLifetimeMilliseconds = 24 * 60 * 60 * 1000;
const maximumProposals = 4;

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ServiceRequest)
    private readonly requestsRepository: Repository<ServiceRequest>,
    @InjectRepository(Proposal)
    private readonly proposalsRepository: Repository<Proposal>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>,
    @InjectRepository(ProfessionalProfile)
    private readonly profilesRepository: Repository<ProfessionalProfile>,
    private readonly storageService: StorageService,
    private readonly professionalsService: ProfessionalsService,
    private readonly mailService: MailService
  ) {}

  async createRequest(clientId: string, dto: CreateServiceRequestDto) {
    validateServiceRequest(dto);
    const service = await this.servicesRepository.findOne({ where: { id: dto.serviceId, isActive: true } });
    if (!service) {
      throw new BadRequestException('O serviço selecionado não existe ou está indisponível.');
    }
    validateServiceAnswers(service.requestForm, dto.answers);

    return this.dataSource.transaction(async (manager) => {
      if (dto.preferredProfessionalId) {
        if (dto.preferredProfessionalId === clientId) {
          throw new BadRequestException('Você não pode solicitar um orçamento para si mesmo.');
        }
        const professionalService = await manager.findOne(ProfessionalService, {
          where: {
            professionalId: dto.preferredProfessionalId,
            serviceId: dto.serviceId,
            isActive: true
          },
          relations: { professional: true }
        });
        if (!professionalService?.professional.isAvailable) {
          throw new BadRequestException('Este profissional não está disponível para o serviço selecionado.');
        }
      }

      const request = manager.create(ServiceRequest, {
        clientId,
        serviceId: dto.serviceId,
        description: dto.description.trim(),
        urgency: dto.urgency,
        answers: dto.answers,
        attachments: [],
        address: dto.address.trim(),
        city: dto.city.trim(),
        state: dto.state.toUpperCase(),
        location:
          dto.latitude === undefined || dto.longitude === undefined
            ? null
            : { type: 'Point', coordinates: [dto.longitude, dto.latitude] },
        budgetMinimum: dto.budgetMinimum === undefined ? null : dto.budgetMinimum.toFixed(2),
        budgetMaximum: dto.budgetMaximum === undefined ? null : dto.budgetMaximum.toFixed(2),
        preferredAt: dto.preferredAt ? new Date(dto.preferredAt) : null,
        status: ServiceRequestStatus.Requested,
        proposalCount: 0,
        maximumProposals: dto.preferredProfessionalId ? 1 : maximumProposals,
        preferredProfessionalId: dto.preferredProfessionalId || null,
        expiresAt: new Date(Date.now() + requestLifetimeMilliseconds)
      });
      const savedRequest = await manager.save(request);
      if (dto.preferredProfessionalId) {
        await createNotification(manager, {
          userId: dto.preferredProfessionalId,
          type: NotificationType.NewServiceRequest,
          title: 'Nova solicitação de orçamento',
          body: `Um cliente solicitou diretamente seu serviço de ${service.name}.`,
          actionUrl: `/oportunidades/${savedRequest.id}`
        });
      }
      return savedRequest;
    });
  }

  async findOwnRequests(clientId: string) {
    await this.expireOpenRecords();
    return this.requestsRepository.find({
      where: { clientId },
      relations: { service: true },
      order: { createdAt: 'DESC' }
    });
  }

  async findRequestById(requestId: string, userId: string) {
    await this.expireOpenRecords();
    const request = await this.requestsRepository.findOne({
      where: { id: requestId },
      relations: { service: true }
    });
    if (!request) {
      throw new NotFoundException('Solicitação não encontrada.');
    }
    if (request.clientId === userId) {
      return this.withProposalState(request, userId);
    }
    const professionalService = await this.dataSource.getRepository(ProfessionalService).findOne({
      where: { professionalId: userId, serviceId: request.serviceId, isActive: true },
      relations: { professional: true }
    });
    if (!professionalService || !professionalService.professional.isAvailable) {
      throw new ForbiddenException('Esta solicitação não pertence aos seus serviços ativos.');
    }
    if (request.preferredProfessionalId) {
      if (request.preferredProfessionalId !== userId) {
        throw new ForbiddenException('Esta solicitação foi direcionada a outro profissional.');
      }
      return this.withProposalState(request, userId);
    }
    const profile = professionalService.professional;
    const isSameRegion =
      profile.state === request.state && profile.city.toLowerCase() === request.city.toLowerCase();
    if (!request.location && !isSameRegion) {
      throw new ForbiddenException('Esta solicitação está fora da sua região de atendimento.');
    }
    if (request.location) {
      const result = await this.dataSource.query<Array<{ allowed: boolean }>>(
        `SELECT ST_DWithin(ST_GeomFromGeoJSON($1)::geography, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4) AS allowed`,
        [
          JSON.stringify(request.location),
          profile.location.coordinates[0],
          profile.location.coordinates[1],
          profile.serviceRadiusKm * 1000
        ]
      );
      if (!result[0]?.allowed) {
        throw new ForbiddenException('Esta solicitação está fora do seu raio de atendimento.');
      }
    }
    return this.withProposalState(request, userId);
  }

  async attachRequestMedia(requestId: string, mediaId: string, clientId: string) {
    return this.dataSource.transaction(async (manager) => {
      const request = await manager.findOne(ServiceRequest, {
        where: { id: requestId },
        lock: { mode: 'pessimistic_write' }
      });
      if (!request) {
        throw new NotFoundException('Solicitação não encontrada.');
      }
      if (request.clientId !== clientId) {
        throw new ForbiddenException('Somente o cliente pode anexar imagens à solicitação.');
      }
      if (request.attachments.length >= 8) {
        throw new ConflictException('A solicitação já atingiu o limite de oito imagens.');
      }
      if (request.attachments.some((attachment) => attachment.mediaId === mediaId)) {
        return request;
      }
      const media = await this.storageService.attachToContext(
        mediaId,
        clientId,
        MediaPurpose.RequestAttachment,
        requestId,
        manager
      );
      request.attachments.push({
        mediaId: media.id,
        objectKey: media.objectKey,
        fileName: media.fileName,
        contentType: media.contentType
      });
      return manager.save(request);
    });
  }

  async findOpportunities(professionalId: string) {
    await this.expireOpenRecords();
    const profile = await this.profilesRepository.findOne({
      where: { userId: professionalId, isAvailable: true }
    });
    if (!profile) {
      throw new NotFoundException('Ative seu perfil profissional para consultar oportunidades.');
    }

    const locationExpression = 'ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography';
    const query = this.requestsRepository
      .createQueryBuilder('request')
      .innerJoinAndSelect('request.service', 'service')
      .addSelect(`ST_Distance(request.location, ${locationExpression})`, 'distance_meters')
      .innerJoin(
        ProfessionalService,
        'professionalService',
        'professionalService.professionalId = :professionalId AND professionalService.serviceId = request.serviceId AND professionalService.isActive = true',
        { professionalId }
      )
      .where('request.clientId <> :professionalId', { professionalId })
      .andWhere('request.status IN (:...statuses)', {
        statuses: [ServiceRequestStatus.Requested, ServiceRequestStatus.ProposalReceived]
      })
      .andWhere('request.expiresAt > now()')
      .andWhere('request.proposalCount < request.maximumProposals')
      .andWhere(
        `NOT EXISTS(
          SELECT 1 FROM proposals submitted_proposal
          WHERE submitted_proposal.request_id = request.id
            AND submitted_proposal.professional_id = :professionalId
        )`
      )
      .andWhere(
        '(request.preferredProfessionalId IS NULL OR request.preferredProfessionalId = :professionalId)'
      )
      .andWhere(
        `request.preferredProfessionalId = :professionalId OR (
          request.preferredProfessionalId IS NULL AND (
            (request.location IS NOT NULL AND ST_DWithin(request.location, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography, :radiusMeters))
            OR (request.location IS NULL AND request.state = :state AND LOWER(request.city) = LOWER(:city))
          )
        )`
      )
      .setParameters({
        longitude: profile.location.coordinates[0],
        latitude: profile.location.coordinates[1],
        radiusMeters: profile.serviceRadiusKm * 1000,
        state: profile.state,
        city: profile.city
      })
      .orderBy('CASE WHEN request.preferredProfessionalId = :professionalId THEN 0 ELSE 1 END', 'ASC')
      .addOrderBy("CASE request.urgency WHEN 'urgent' THEN 0 WHEN 'this_week' THEN 1 ELSE 2 END", 'ASC')
      .addOrderBy('distance_meters', 'ASC', 'NULLS LAST')
      .addOrderBy('request.proposalCount', 'ASC')
      .addOrderBy('request.createdAt', 'DESC');

    const result = await query.getRawAndEntities();
    return result.entities.map((request) => {
      const raw = result.raw.find((row: Record<string, unknown>) => row.request_id === request.id);
      const distanceMeters = raw?.distance_meters;
      const distanceKm =
        distanceMeters === null || distanceMeters === undefined
          ? null
          : Math.round(Number(distanceMeters) / 100) / 10;
      return Object.assign(request, {
        distanceKm,
        ...calculateOpportunityRanking({
          isDirectRequest: request.preferredProfessionalId === professionalId,
          distanceKm,
          urgency: request.urgency,
          proposalCount: request.proposalCount,
          maximumProposals: request.maximumProposals,
          createdAt: request.createdAt
        })
      });
    });
  }

  async submitProposal(requestId: string, professionalId: string, dto: CreateProposalDto) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const request = await manager.findOne(ServiceRequest, {
          where: { id: requestId },
          lock: { mode: 'pessimistic_write' }
        });
        if (!request) {
          throw new NotFoundException('Solicitação não encontrada.');
        }
        const professionalService = await manager.findOne(ProfessionalService, {
          where: { professionalId, serviceId: request.serviceId, isActive: true }
        });
        if (!professionalService) {
          throw new ForbiddenException('Cadastre e ative este serviço antes de enviar uma proposta.');
        }
        if (request.clientId === professionalId) {
          throw new ForbiddenException('Você não pode enviar uma proposta para a própria solicitação.');
        }
        if (request.preferredProfessionalId && request.preferredProfessionalId !== professionalId) {
          throw new ForbiddenException('Esta solicitação foi direcionada a outro profissional.');
        }
        if (!canServiceRequestReceiveProposal(request)) {
          throw new ConflictException('Esta solicitação não aceita mais propostas.');
        }

        const proposal = manager.create(Proposal, {
          requestId,
          professionalId,
          price: dto.price.toFixed(2),
          message: dto.message.trim(),
          estimatedDurationMinutes: dto.estimatedDurationMinutes,
          materialsIncluded: dto.materialsIncluded,
          travelFee: (dto.travelFee || 0).toFixed(2),
          paymentMethods: dto.paymentMethods,
          status: ProposalStatus.Sent,
          validUntil: new Date(Date.now() + proposalLifetimeMilliseconds)
        });
        await manager.save(proposal);
        request.proposalCount += 1;
        request.status = ServiceRequestStatus.ProposalReceived;
        await manager.save(request);
        await createNotification(manager, {
          userId: request.clientId,
          type: NotificationType.NewProposal,
          title: 'Nova proposta recebida',
          body: 'Um profissional enviou uma proposta para sua solicitação.',
          actionUrl: `/solicitacoes/${request.id}`
        });
        return proposal;
      });
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) {
        throw new ConflictException('Você já enviou uma proposta para esta solicitação.');
      }
      throw error;
    }
  }

  async findRequestProposals(requestId: string, clientId: string) {
    await this.assertRequestOwner(requestId, clientId);
    await this.expireOpenRecords();
    const proposals = await this.proposalsRepository
      .createQueryBuilder('proposal')
      .innerJoinAndSelect('proposal.professional', 'profile')
      .innerJoinAndSelect('profile.user', 'user')
      .where('proposal.requestId = :requestId', { requestId })
      .orderBy('proposal.price + proposal.travelFee', 'ASC')
      .addOrderBy('proposal.createdAt', 'ASC')
      .getMany();
    const metrics = await this.professionalsService.findMetrics(
      proposals.map((proposal) => proposal.professionalId)
    );
    return proposals.map((proposal) => ({
      id: proposal.id,
      requestId: proposal.requestId,
      price: Number(proposal.price),
      message: proposal.message,
      estimatedDurationMinutes: proposal.estimatedDurationMinutes,
      materialsIncluded: proposal.materialsIncluded,
      travelFee: Number(proposal.travelFee),
      paymentMethods: proposal.paymentMethods,
      status: proposal.status,
      validUntil: proposal.validUntil,
      createdAt: proposal.createdAt,
      professional: toPublicProfessionalProfile(
        proposal.professional,
        undefined,
        metrics.get(proposal.professionalId)
      )
    }));
  }

  async findOwnProposals(professionalId: string) {
    await this.expireOpenRecords();
    const proposals = await this.proposalsRepository.find({
      where: { professionalId },
      relations: { request: { service: true } },
      order: { createdAt: 'DESC' },
      take: 100
    });
    return proposals.map((proposal) => ({
      id: proposal.id,
      requestId: proposal.requestId,
      price: Number(proposal.price),
      message: proposal.message,
      estimatedDurationMinutes: proposal.estimatedDurationMinutes,
      materialsIncluded: proposal.materialsIncluded,
      travelFee: Number(proposal.travelFee),
      paymentMethods: proposal.paymentMethods,
      status: proposal.status,
      validUntil: proposal.validUntil,
      createdAt: proposal.createdAt,
      request: proposal.request
    }));
  }

  async acceptProposal(requestId: string, proposalId: string, clientId: string) {
    const savedOrder = await this.dataSource.transaction(async (manager) => {
      const request = await manager.findOne(ServiceRequest, {
        where: { id: requestId },
        lock: { mode: 'pessimistic_write' }
      });
      if (!request) {
        throw new NotFoundException('Solicitação não encontrada.');
      }
      if (request.clientId !== clientId) {
        throw new ForbiddenException('Somente o cliente da solicitação pode aceitar uma proposta.');
      }
      const proposal = await manager.findOne(Proposal, {
        where: { id: proposalId, requestId },
        lock: { mode: 'pessimistic_write' }
      });
      if (!proposal) {
        throw new NotFoundException('Proposta não encontrada para esta solicitação.');
      }
      if (proposal.status === ProposalStatus.Accepted) {
        const existingOrder = await manager.findOne(Order, { where: { proposalId } });
        if (existingOrder) {
          return existingOrder;
        }
      }
      if (
        !canServiceRequestAcceptProposal(request) ||
        proposal.status !== ProposalStatus.Sent ||
        proposal.validUntil <= new Date()
      ) {
        throw new ConflictException('A proposta não está mais disponível.');
      }

      await manager.update(Proposal, { requestId }, { status: ProposalStatus.Rejected });
      proposal.status = ProposalStatus.Accepted;
      await manager.save(proposal);
      request.status = ServiceRequestStatus.Accepted;
      await manager.save(request);

      const totalPrice = Number(proposal.price) + Number(proposal.travelFee);
      const order = manager.create(Order, {
        requestId,
        proposalId,
        clientId,
        professionalId: proposal.professionalId,
        agreedPrice: totalPrice.toFixed(2),
        scheduledAt: request.preferredAt,
        status: request.preferredAt ? OrderStatus.Scheduled : OrderStatus.Accepted,
        ...resolveOrderStatusTimestamps(request.preferredAt ? OrderStatus.Scheduled : OrderStatus.Accepted),
        cancellationReason: null,
        cancellationDetails: null,
        cancelledBy: null
      });
      const savedOrder = await manager.save(order);
      await manager.save(
        manager.create(Conversation, {
          orderId: savedOrder.id,
          clientId,
          professionalId: proposal.professionalId,
          lastMessageAt: null
        })
      );
      await createNotification(manager, {
        userId: proposal.professionalId,
        type: NotificationType.ProposalAccepted,
        title: 'Proposta aceita',
        body: 'O cliente aceitou sua proposta. Combine os detalhes pela conversa.',
        actionUrl: '/conversas'
      });
      return savedOrder;
    });
    await this.sendMarketplaceEmail(savedOrder.id, 'accepted');
    return savedOrder;
  }

  async findOwnOrders(userId: string) {
    return this.ordersRepository
      .createQueryBuilder('order')
      .innerJoinAndSelect('order.request', 'request')
      .innerJoinAndSelect('request.service', 'service')
      .innerJoinAndSelect('order.proposal', 'proposal')
      .where('order.clientId = :userId OR order.professionalId = :userId', { userId })
      .orderBy('order.createdAt', 'DESC')
      .getMany();
  }

  async findOwnOrder(orderId: string, userId: string) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: {
        request: { service: true },
        proposal: true,
        professional: { user: { profile: true }, services: { service: true } },
        client: { profile: true }
      }
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    this.assertOrderParticipant(order, userId);
    const [metrics, review] = await Promise.all([
      this.professionalsService.findMetrics([order.professionalId]),
      this.dataSource.getRepository(Review).findOne({ where: { orderId } })
    ]);
    const { professional, client, ...orderDetails } = order;
    return {
      ...orderDetails,
      professional: toPublicProfessionalProfile(professional, undefined, metrics.get(order.professionalId)),
      client: {
        id: client.id,
        name: client.name,
        profilePhotoMediaId: client.profile?.profilePhotoMediaId || null
      },
      review: review ? { rating: review.rating, comment: review.comment, createdAt: review.createdAt } : null
    };
  }

  async rehire(orderId: string, clientId: string) {
    const previousOrder = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: { request: true }
    });
    if (!previousOrder) {
      throw new NotFoundException('Pedido anterior não encontrado.');
    }
    if (previousOrder.clientId !== clientId) {
      throw new ForbiddenException('Somente o cliente do pedido pode solicitar uma recontratação.');
    }
    if (previousOrder.status !== OrderStatus.Completed) {
      throw new ConflictException('A recontratação está disponível apenas para serviços concluídos.');
    }

    const previousRequest = previousOrder.request;
    const request = this.requestsRepository.create({
      clientId,
      serviceId: previousRequest.serviceId,
      description: previousRequest.description,
      urgency: previousRequest.urgency,
      answers: previousRequest.answers,
      attachments: [],
      address: previousRequest.address,
      city: previousRequest.city,
      state: previousRequest.state,
      location: previousRequest.location,
      budgetMinimum: previousRequest.budgetMinimum,
      budgetMaximum: previousRequest.budgetMaximum,
      preferredAt: null,
      status: ServiceRequestStatus.Requested,
      proposalCount: 0,
      maximumProposals: 1,
      preferredProfessionalId: previousOrder.professionalId,
      expiresAt: new Date(Date.now() + requestLifetimeMilliseconds)
    });
    const savedRequest = await this.requestsRepository.save(request);
    return savedRequest;
  }

  async updateOrderStatus(orderId: string, actorId: string, nextStatus: OrderStatus) {
    const savedOrder = await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' }
      });
      if (!order) {
        throw new NotFoundException('Pedido não encontrado.');
      }
      this.assertOrderParticipant(order, actorId);
      if (!canTransitionOrder(order, actorId, nextStatus)) {
        throw new ConflictException('Esta mudança de status não é permitida para o pedido atual.');
      }
      order.status = nextStatus;
      Object.assign(order, resolveOrderStatusTimestamps(nextStatus));
      const savedOrder = await manager.save(order);
      await this.notifyOrderParticipant(manager, savedOrder, actorId, 'O status do pedido foi atualizado.');
      return savedOrder;
    });
    if (nextStatus === OrderStatus.Completed) {
      await this.sendMarketplaceEmail(savedOrder.id, 'completed');
    }
    return savedOrder;
  }

  async cancelOrder(orderId: string, actorId: string, dto: CancelOrderDto) {
    const savedOrder = await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' }
      });
      if (!order) {
        throw new NotFoundException('Pedido não encontrado.');
      }
      this.assertOrderParticipant(order, actorId);
      if (
        [
          OrderStatus.Completed,
          OrderStatus.Disputed,
          OrderStatus.CancelledByClient,
          OrderStatus.CancelledByProfessional
        ].includes(order.status)
      ) {
        throw new ConflictException('Este pedido não pode mais ser cancelado.');
      }
      if (order.status === OrderStatus.InProgress && dto.reason !== CancellationReason.Other) {
        throw new BadRequestException(
          'Após o início, informe detalhes do cancelamento usando o motivo “outro”.'
        );
      }
      if (dto.reason === CancellationReason.Other && !dto.details) {
        throw new BadRequestException('Descreva o motivo do cancelamento.');
      }

      order.status =
        actorId === order.clientId ? OrderStatus.CancelledByClient : OrderStatus.CancelledByProfessional;
      order.cancellationReason = dto.reason;
      order.cancellationDetails = dto.details?.trim() || null;
      order.cancelledBy = actorId;
      const savedOrder = await manager.save(order);
      await this.notifyOrderParticipant(manager, savedOrder, actorId, 'O pedido foi cancelado.');
      return savedOrder;
    });
    await this.sendOrderCancelledEmail(savedOrder.id, actorId, dto);
    return savedOrder;
  }

  async cancelRequest(requestId: string, clientId: string, dto: CancelOrderDto) {
    const request = await this.requestsRepository.findOne({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('Solicitação não encontrada.');
    }
    if (request.clientId !== clientId) {
      throw new ForbiddenException('Somente o cliente pode cancelar a solicitação.');
    }
    if (![ServiceRequestStatus.Requested, ServiceRequestStatus.ProposalReceived].includes(request.status)) {
      throw new ConflictException('Esta solicitação não pode mais ser cancelada.');
    }
    if (dto.reason === CancellationReason.Other && !dto.details) {
      throw new BadRequestException('Descreva o motivo do cancelamento.');
    }
    request.status = ServiceRequestStatus.Cancelled;
    return this.requestsRepository.save(request);
  }

  private async assertRequestOwner(requestId: string, clientId: string) {
    const isOwner = await this.requestsRepository.exists({ where: { id: requestId, clientId } });
    if (!isOwner) {
      throw new ForbiddenException('Somente o cliente pode consultar as propostas desta solicitação.');
    }
  }

  private async withProposalState(request: ServiceRequest, userId: string) {
    if (request.clientId === userId) {
      return Object.assign(request, { hasSubmittedProposal: false });
    }
    const hasSubmittedProposal = await this.proposalsRepository.exists({
      where: { requestId: request.id, professionalId: userId }
    });
    return Object.assign(request, { hasSubmittedProposal });
  }

  private assertOrderParticipant(order: Order, actorId: string) {
    if (order.clientId !== actorId && order.professionalId !== actorId) {
      throw new ForbiddenException('Você não participa deste pedido.');
    }
  }

  async expireOpenRecords() {
    await Promise.all([
      this.requestsRepository
        .createQueryBuilder()
        .update(ServiceRequest)
        .set({ status: ServiceRequestStatus.Expired })
        .where('status IN (:...statuses)', {
          statuses: [ServiceRequestStatus.Requested, ServiceRequestStatus.ProposalReceived]
        })
        .andWhere('expires_at <= now()')
        .execute(),
      this.proposalsRepository
        .createQueryBuilder()
        .update(Proposal)
        .set({ status: ProposalStatus.Expired })
        .where('status = :status', { status: ProposalStatus.Sent })
        .andWhere('valid_until <= now()')
        .execute()
    ]);
  }

  private async notifyOrderParticipant(manager: EntityManager, order: Order, actorId: string, body: string) {
    const recipientId = actorId === order.clientId ? order.professionalId : order.clientId;
    const actionUrl =
      recipientId === order.clientId
        ? `/usuario/${recipientId}/pedidos-feitos/${order.id}`
        : `/usuario/${recipientId}/pedidos-recebidos/${order.id}`;
    await createNotification(manager, {
      userId: recipientId,
      type: NotificationType.OrderUpdated,
      title: 'Pedido atualizado',
      body,
      actionUrl
    });
  }

  private isUniqueConstraintViolation(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
  }

  private async sendMarketplaceEmail(orderId: string, event: 'accepted' | 'completed') {
    try {
      const details = await this.findMarketplaceMailDetails(orderId);
      if (event === 'accepted') {
        await this.mailService.sendProposalAccepted(details);
        return;
      }
      await this.mailService.sendServiceCompleted(details);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Falha desconhecida no serviço SMTP.';
      this.logger.error(`Não foi possível enviar o e-mail do pedido ${orderId}: ${reason}`);
    }
  }

  private async sendOrderCancelledEmail(orderId: string, actorId: string, dto: CancelOrderDto) {
    try {
      const details = await this.findMarketplaceMailDetails(orderId);
      const cancelledByName = actorId === details.client.id ? details.client.name : details.professional.name;
      await this.mailService.sendOrderCancelled({
        ...details,
        cancelledByName,
        cancellationReason: resolveCancellationReasonLabel(dto.reason),
        cancellationDetails: dto.details?.trim() || null
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Falha desconhecida no serviço SMTP.';
      this.logger.error(`Não foi possível enviar o e-mail de cancelamento do pedido ${orderId}: ${reason}`);
    }
  }

  async sendDisputeOpenedEmail(
    orderId: string,
    openedBy: string,
    disputeReason: string,
    disputeDescription: string
  ) {
    try {
      const details = await this.findMarketplaceMailDetails(orderId);
      const openedByName = openedBy === details.client.id ? details.client.name : details.professional.name;
      await this.mailService.sendDisputeOpened({
        ...details,
        openedByName,
        disputeReason,
        disputeDescription
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Falha desconhecida no serviço SMTP.';
      this.logger.error(`Não foi possível enviar o e-mail da disputa do pedido ${orderId}: ${reason}`);
    }
  }

  private async findMarketplaceMailDetails(orderId: string): Promise<MarketplaceMailDetails> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: { client: true, professional: { user: true }, request: { service: true } }
    });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado para envio do e-mail.');
    }
    return {
      orderId: order.id,
      serviceName: order.request.service.name,
      client: { id: order.client.id, name: order.client.name, email: order.client.email },
      professional: {
        id: order.professional.user.id,
        name: order.professional.user.name,
        email: order.professional.user.email
      },
      agreedPrice: Number(order.agreedPrice),
      scheduledAt: order.scheduledAt,
      address: order.request.address,
      city: order.request.city,
      state: order.request.state
    };
  }
}
