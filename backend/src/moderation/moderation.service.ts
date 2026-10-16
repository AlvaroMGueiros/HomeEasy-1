import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { NotificationType } from '../communications/communication.enums';
import { Conversation } from '../communications/conversation.entity';
import { Message } from '../communications/message.entity';
import { createNotification } from '../communications/notification.utils';
import { resolveDisputeReasonLabel } from '../mail/mail-event-labels.utils';
import { MarketplaceService } from '../marketplace/marketplace.service';
import { OrderStatus } from '../marketplace/marketplace.enums';
import { Order } from '../marketplace/order.entity';
import { ProfessionalProfile } from '../professionals/professional-profile.entity';
import { ProfessionalVerificationStatus } from '../professionals/professional-verification-status.enum';
import { MediaPurpose } from '../storage/media-purpose.enum';
import { StorageService } from '../storage/storage.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { SubmitDocumentDto } from './dto/submit-document.dto';
import { Dispute } from './dispute.entity';
import { ModerationStatus, VerificationDocumentType } from './moderation.enums';
import { Report } from './report.entity';
import { VerificationDocument } from './verification-document.entity';

@Injectable()
export class ModerationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly storageService: StorageService,
    private readonly marketplaceService: MarketplaceService,
    @InjectRepository(VerificationDocument)
    private readonly documentsRepository: Repository<VerificationDocument>,
    @InjectRepository(Report)
    private readonly reportsRepository: Repository<Report>,
    @InjectRepository(Dispute)
    private readonly disputesRepository: Repository<Dispute>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(ProfessionalProfile)
    private readonly profilesRepository: Repository<ProfessionalProfile>
  ) {}

  async submitDocument(professionalId: string, dto: SubmitDocumentDto) {
    return this.dataSource.transaction(async (manager) => {
      const profile = await manager.findOne(ProfessionalProfile, { where: { userId: professionalId } });
      if (!profile) {
        throw new NotFoundException('Crie o perfil profissional antes de enviar documentos.');
      }
      const pendingTypeExists = await manager.exists(VerificationDocument, {
        where: { professionalId, type: dto.type, status: ModerationStatus.Pending }
      });
      if (pendingTypeExists) {
        throw new ConflictException('Já existe um documento deste tipo aguardando análise.');
      }
      const document = await manager.save(
        manager.create(VerificationDocument, {
          professionalId,
          mediaId: dto.mediaId,
          type: dto.type,
          status: ModerationStatus.Pending,
          reviewNotes: null,
          reviewedBy: null,
          reviewedAt: null
        })
      );
      await this.storageService.attachToContext(
        dto.mediaId,
        professionalId,
        MediaPurpose.VerificationDocument,
        document.id,
        manager
      );
      profile.verificationStatus = ProfessionalVerificationStatus.Pending;
      await manager.save(profile);
      return document;
    });
  }

  findOwnDocuments(professionalId: string) {
    return this.documentsRepository.find({
      where: { professionalId },
      order: { createdAt: 'DESC' }
    });
  }

  async createReport(reporterId: string, dto: CreateReportDto) {
    if (!dto.targetUserId && !dto.orderId && !dto.conversationId && !dto.reviewId) {
      throw new BadRequestException('Informe o perfil, pedido, conversa ou avaliação denunciada.');
    }
    if (dto.targetUserId === reporterId) {
      throw new BadRequestException('Você não pode denunciar a própria conta.');
    }
    let description = dto.description.trim();
    if (dto.messageId && !dto.conversationId) {
      throw new BadRequestException('Informe a conversa da mensagem denunciada.');
    }
    if (dto.conversationId) {
      const conversation = await this.dataSource
        .getRepository(Conversation)
        .findOne({ where: { id: dto.conversationId } });
      if (!conversation) throw new NotFoundException('Conversa denunciada não encontrada.');
      if (conversation.clientId !== reporterId && conversation.professionalId !== reporterId) {
        throw new ForbiddenException('Você não participa da conversa denunciada.');
      }
      const otherUserId =
        conversation.clientId === reporterId ? conversation.professionalId : conversation.clientId;
      if (dto.targetUserId && dto.targetUserId !== otherUserId) {
        throw new BadRequestException(
          'A pessoa denunciada não corresponde ao outro participante da conversa.'
        );
      }
      if (dto.messageId) {
        const message = await this.dataSource
          .getRepository(Message)
          .findOne({ where: { id: dto.messageId, conversationId: dto.conversationId } });
        if (!message || message.senderId !== otherUserId)
          throw new BadRequestException(
            'A mensagem denunciada não foi enviada por esta pessoa nesta conversa.'
          );
        const evidence =
          message.content?.slice(0, 1000) || 'Anexo: ' + (message.attachment?.mediaId || message.type);
        description =
          'Mensagem denunciada: ' + message.id + '\nConteúdo: ' + evidence + '\n\nRelato: ' + description;
      }
    }
    return this.reportsRepository.save(
      this.reportsRepository.create({
        reporterId,
        targetUserId: dto.targetUserId || null,
        orderId: dto.orderId || null,
        conversationId: dto.conversationId || null,
        reviewId: dto.reviewId || null,
        category: dto.category,
        description,
        status: ModerationStatus.Pending,
        resolutionNotes: null,
        reviewedBy: null
      })
    );
  }

  async createDispute(orderId: string, userId: string, dto: CreateDisputeDto) {
    const dispute = await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' }
      });
      if (!order) {
        throw new NotFoundException('Pedido não encontrado.');
      }
      if (order.clientId !== userId && order.professionalId !== userId) {
        throw new ForbiddenException('Você não participa deste pedido.');
      }
      if ([OrderStatus.CancelledByClient, OrderStatus.CancelledByProfessional].includes(order.status)) {
        throw new ConflictException('Pedidos cancelados não podem abrir uma disputa de execução.');
      }
      const disputeExists = await manager.exists(Dispute, { where: { orderId } });
      if (disputeExists) {
        throw new ConflictException('Este pedido já possui uma disputa.');
      }
      const dispute = await manager.save(
        manager.create(Dispute, {
          orderId,
          openedBy: userId,
          reason: dto.reason,
          description: dto.description.trim(),
          status: ModerationStatus.Pending,
          resolutionNotes: null,
          reviewedBy: null
        })
      );
      order.status = OrderStatus.Disputed;
      await manager.save(order);
      const recipientId = userId === order.clientId ? order.professionalId : order.clientId;
      const actionUrl =
        recipientId === order.clientId
          ? `/usuario/${recipientId}/pedidos-feitos/${order.id}`
          : `/usuario/${recipientId}/pedidos-recebidos/${order.id}`;
      await createNotification(manager, {
        userId: recipientId,
        type: NotificationType.DisputeUpdated,
        title: 'Disputa aberta',
        body: 'Uma disputa foi aberta para o pedido.',
        actionUrl
      });
      return dispute;
    });
    await this.marketplaceService.sendDisputeOpenedEmail(
      orderId,
      userId,
      resolveDisputeReasonLabel(dto.reason),
      dto.description.trim()
    );
    return dispute;
  }

  async findDispute(orderId: string, userId: string) {
    const dispute = await this.disputesRepository.findOne({
      where: { orderId },
      relations: { order: true }
    });
    if (!dispute) {
      throw new NotFoundException('Este pedido não possui uma disputa.');
    }
    if (dispute.order.clientId !== userId && dispute.order.professionalId !== userId) {
      throw new ForbiddenException('Você não participa deste pedido.');
    }
    return dispute;
  }

  async findAdminQueue() {
    const [documents, reports, disputes] = await Promise.all([
      this.documentsRepository.find({
        where: { status: ModerationStatus.Pending },
        relations: { professional: true, media: true },
        order: { createdAt: 'ASC' }
      }),
      this.reportsRepository.find({
        where: { status: ModerationStatus.Pending },
        order: { createdAt: 'ASC' }
      }),
      this.disputesRepository.find({
        where: { status: ModerationStatus.Pending },
        relations: {
          opener: true,
          order: {
            client: true,
            professional: { user: true },
            request: { service: true }
          }
        },
        order: { createdAt: 'ASC' }
      })
    ]);
    return {
      documents: documents.map((document) => ({
        id: document.id,
        type: document.type,
        mediaId: document.mediaId,
        createdAt: document.createdAt,
        professional: {
          name: document.professional.name,
          email: document.professional.email
        },
        media: {
          fileName: document.media.fileName,
          contentType: document.media.contentType
        }
      })),
      reports: reports.map((report) => ({
        id: report.id,
        category: report.category,
        description: report.description
      })),
      disputes: disputes.map((dispute) => ({
        id: dispute.id,
        reason: dispute.reason,
        description: dispute.description,
        createdAt: dispute.createdAt,
        opener: {
          name: dispute.opener.name,
          email: dispute.opener.email
        },
        order: {
          client: { name: dispute.order.client.name },
          professional: { user: { name: dispute.order.professional.user.name } },
          request: { service: { name: dispute.order.request.service.name } }
        }
      }))
    };
  }

  async findAdminMetrics() {
    const rows = await this.dataSource.query<
      Array<{
        total_requests: string;
        open_requests: string;
        hired_requests: string;
        pending_verifications: string;
        proposal_total: string;
      }>
    >(`SELECT
      (SELECT COUNT(*) FROM service_requests) AS total_requests,
      (SELECT COUNT(*) FROM service_requests WHERE status IN ('requested', 'proposal_received')) AS open_requests,
      (SELECT COUNT(*) FROM service_requests WHERE status = 'accepted') AS hired_requests,
      (SELECT COUNT(*) FROM verification_documents WHERE status = 'pending') AS pending_verifications,
      (SELECT COALESCE(SUM(proposal_count), 0) FROM service_requests) AS proposal_total`);
    const row = rows[0];
    const totalRequests = Number(row.total_requests);
    const hiredRequests = Number(row.hired_requests);
    return {
      totalRequests,
      openRequests: Number(row.open_requests),
      hiredRequests,
      pendingVerifications: Number(row.pending_verifications),
      conversionRate: totalRequests ? Math.round((hiredRequests / totalRequests) * 100) : 0,
      averageProposals: totalRequests ? Math.round((Number(row.proposal_total) / totalRequests) * 10) / 10 : 0
    };
  }

  async reviewDocument(documentId: string, adminId: string, status: ModerationStatus, notes?: string) {
    if (![ModerationStatus.Approved, ModerationStatus.Rejected].includes(status)) {
      throw new BadRequestException('A análise deve aprovar ou rejeitar o documento.');
    }
    return this.dataSource.transaction(async (manager) => {
      const document = await manager.findOne(VerificationDocument, { where: { id: documentId } });
      if (!document) {
        throw new NotFoundException('Documento não encontrado.');
      }
      if (document.status !== ModerationStatus.Pending) {
        throw new ConflictException('Este documento já foi analisado.');
      }
      document.status = status;
      document.reviewNotes = notes?.trim() || null;
      document.reviewedBy = adminId;
      document.reviewedAt = new Date();
      await manager.save(document);
      await this.updateVerificationLevel(manager, document.professionalId);
      return document;
    });
  }

  async reviewReport(reportId: string, adminId: string, status: ModerationStatus, notes?: string) {
    if (![ModerationStatus.InReview, ModerationStatus.Rejected, ModerationStatus.Resolved].includes(status)) {
      throw new BadRequestException('O status informado não é válido para uma denúncia.');
    }
    const report = await this.reportsRepository.findOne({ where: { id: reportId } });
    if (!report) {
      throw new NotFoundException('Denúncia não encontrada.');
    }
    report.status = status;
    report.resolutionNotes = notes?.trim() || null;
    report.reviewedBy = adminId;
    return this.reportsRepository.save(report);
  }

  async reviewDispute(disputeId: string, adminId: string, status: ModerationStatus, notes?: string) {
    if (![ModerationStatus.InReview, ModerationStatus.Rejected, ModerationStatus.Resolved].includes(status)) {
      throw new BadRequestException('O status informado não é válido para uma disputa.');
    }
    return this.dataSource.transaction(async (manager) => {
      const dispute = await manager.findOne(Dispute, {
        where: { id: disputeId },
        relations: { order: true }
      });
      if (!dispute) {
        throw new NotFoundException('Disputa não encontrada.');
      }
      dispute.status = status;
      dispute.resolutionNotes = notes?.trim() || null;
      dispute.reviewedBy = adminId;
      const savedDispute = await manager.save(dispute);
      for (const userId of [dispute.order.clientId, dispute.order.professionalId]) {
        const actionUrl =
          userId === dispute.order.clientId
            ? `/usuario/${userId}/pedidos-feitos/${dispute.orderId}`
            : `/usuario/${userId}/pedidos-recebidos/${dispute.orderId}`;
        await createNotification(manager, {
          userId,
          type: NotificationType.DisputeUpdated,
          title: 'Disputa atualizada',
          body: 'A moderação atualizou sua disputa.',
          actionUrl
        });
      }
      return savedDispute;
    });
  }

  async setVerificationStatus(professionalId: string, status: ProfessionalVerificationStatus) {
    const profile = await this.profilesRepository.findOne({ where: { userId: professionalId } });
    if (!profile) {
      throw new NotFoundException('Perfil profissional não encontrado.');
    }
    profile.verificationStatus = status;
    return this.profilesRepository.save(profile);
  }

  private async updateVerificationLevel(manager: EntityManager, professionalId: string) {
    const approvedDocuments = await manager.find(VerificationDocument, {
      where: { professionalId, status: ModerationStatus.Approved }
    });
    const approvedTypes = new Set(approvedDocuments.map((document) => document.type));
    let verificationStatus = ProfessionalVerificationStatus.Pending;
    if (approvedTypes.has(VerificationDocumentType.Identity)) {
      verificationStatus = ProfessionalVerificationStatus.IdentityVerified;
    }
    if (
      approvedTypes.has(VerificationDocumentType.Identity) &&
      approvedTypes.has(VerificationDocumentType.ProfessionalCertificate)
    ) {
      verificationStatus = ProfessionalVerificationStatus.ProfessionalVerified;
    }
    await manager.update(ProfessionalProfile, { userId: professionalId }, { verificationStatus });
  }
}
