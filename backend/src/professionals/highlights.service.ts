import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';

import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ProfessionalSubscription } from '../subscriptions/professional-subscription.entity';
import { toSubscriptionStatus } from '../subscriptions/subscription.utils';
import { ModerationStatus } from '../moderation/moderation.enums';
import { ReviewModerationDto } from '../moderation/dto/review-moderation.dto';
import { CreateHighlightDto } from './dto/create-highlight.dto';
import { FindHighlightsQueryDto } from './dto/find-highlights-query.dto';
import { assertHighlightPhotos, toHighlightSummary } from './highlight.utils';
import { ProfessionalHighlight } from './professional-highlight.entity';
import { ProfessionalService } from './professional-service.entity';
import { ProfessionalProfile } from './professional-profile.entity';
import { ProfessionalsService } from './professionals.service';

@Injectable()
export class HighlightsService {
  constructor(private readonly dataSource: DataSource,
    @InjectRepository(ProfessionalHighlight) private readonly highlightsRepository: Repository<ProfessionalHighlight>,
    private readonly professionalsService: ProfessionalsService,
    private readonly subscriptionsService: SubscriptionsService) {}

  async findFeed(userId: string, query: FindHighlightsQueryDto) {
    const feedQuery = this.highlightsRepository.createQueryBuilder('highlight')
      .innerJoinAndSelect('highlight.professional', 'profile')
      .innerJoin('profile.user', 'user')
      .innerJoinAndSelect('highlight.service', 'service')
      .innerJoin('profile.services', 'offeredService', 'offeredService.serviceId = highlight.serviceId AND offeredService.isActive = true')
      .where('highlight.status = :status AND highlight.archivedAt IS NULL', { status: ModerationStatus.Approved })
      .andWhere('profile.isAvailable = true AND user.isActive = true AND service.isActive = true')
      .andWhere('LOWER(profile.city) = LOWER(:city) AND profile.state = :state', { city: query.city.trim(), state: query.state.toUpperCase() })
      .andWhere(`NOT EXISTS (SELECT 1 FROM user_blocks block WHERE
        (block.blocker_id = :userId AND block.blocked_id = highlight.professional_id)
        OR (block.blocked_id = :userId AND block.blocker_id = highlight.professional_id))`, { userId })
      .orderBy('highlight.createdAt', 'DESC').addOrderBy('highlight.id', 'DESC')
      .skip((query.page - 1) * query.limit).take(query.limit + 1);
    if (query.serviceId) feedQuery.andWhere('highlight.serviceId = :serviceId', { serviceId: query.serviceId });
    const highlights = await feedQuery.getMany();
    const hasMore = highlights.length > query.limit;
    const pageHighlights = highlights.slice(0, query.limit);
    const professionals = await this.professionalsService.findPublicProfilesByIds([...new Set(pageHighlights.map(highlight => highlight.professionalId))]);
    const profilesById = new Map(professionals.map(professional => [professional.id, professional]));
    const visibleHighlights = pageHighlights.flatMap(highlight => {
      const professional = profilesById.get(highlight.professionalId);
      if (!professional) return [];
      const currentPhotoIds = new Set((highlight.professional.portfolioPhotos || []).map(photo => photo.mediaId));
      const mediaIds = highlight.mediaIds.filter(mediaId => currentPhotoIds.has(mediaId));
      if (!mediaIds.length) return [];
      return [{ ...toHighlightSummary(highlight), mediaIds, professional }];
    });
    return { highlights: visibleHighlights, page: query.page, hasMore };
  }

  async findOwn(userId: string) {
    const highlights = await this.highlightsRepository.find({ where: { professionalId: userId, archivedAt: IsNull() }, relations: { service: true }, order: { createdAt: 'DESC' }, take: 50 });
    return highlights.map(highlight => ({ ...toHighlightSummary(highlight), reviewNotes: highlight.reviewNotes }));
  }

  async create(userId: string, dto: CreateHighlightDto) {
    if (this.subscriptionsService.enabled) await this.subscriptionsService.findOwn(userId);
    return this.dataSource.transaction(async manager => {
      const profile = await manager.findOne(ProfessionalProfile, { where: { userId }, lock: { mode: 'pessimistic_write' } });
      if (!profile) throw new NotFoundException('Cadastre seu perfil profissional antes de publicar.');
      if (!profile.isAvailable) throw new ConflictException('Ative seu perfil profissional antes de publicar.');
      if (!await manager.exists(ProfessionalService, { where: { professionalId: userId, serviceId: dto.serviceId, isActive: true, service: { isActive: true } } })) throw new BadRequestException('Escolha um serviço ativo do seu perfil.');
      assertHighlightPhotos(dto.mediaIds, profile.portfolioPhotos || []);
      if (!dto.hasPublicationConsent) throw new BadRequestException('Confirme a autorização para publicar as fotos.');
      if (dto.title.trim().length < 5 || dto.description.trim().length < 20) throw new BadRequestException('Informe um título com 5 caracteres e uma descrição com pelo menos 20.');
      const subscription = this.subscriptionsService.enabled ? await manager.findOne(ProfessionalSubscription, { where: { userId } }) : null;
      const { publicationLimit } = toSubscriptionStatus(subscription);
      const activeCount = await manager.count(ProfessionalHighlight, { where: { professionalId: userId, archivedAt: IsNull() } });
      if (activeCount >= publicationLimit) throw new ConflictException(`Seu plano permite até ${publicationLimit} publicações. Remova uma antes de criar outra.`);
      return toHighlightSummary(await manager.save(manager.create(ProfessionalHighlight, { professionalId: userId, serviceId: dto.serviceId,
        title: dto.title.trim(), description: dto.description.trim(), mediaIds: dto.mediaIds, status: ModerationStatus.Pending,
        sponsorshipConfirmedAt: null, sponsoredUntil: null, archivedAt: null, reviewNotes: null, reviewedBy: null })));
    });
  }

  async archive(highlightId: string, userId: string) {
    const highlight = await this.highlightsRepository.findOne({ where: { id: highlightId } });
    if (!highlight) throw new NotFoundException('Publicação não encontrada.');
    if (highlight.professionalId !== userId) throw new ForbiddenException('Você não pode remover a publicação de outro profissional.');
    await this.highlightsRepository.update({ id: highlightId, professionalId: userId }, { archivedAt: new Date() });
    return { removed: true };
  }

  async findModeration() {
    const highlights = await this.highlightsRepository.find({ where: { status: ModerationStatus.Pending, archivedAt: IsNull() }, relations: { service: true, professional: { user: true } }, order: { createdAt: 'ASC' }, take: 50 });
    return highlights.map(highlight => ({ ...toHighlightSummary(highlight), professionalName: highlight.professional.user.name }));
  }

  async review(highlightId: string, adminId: string, dto: ReviewModerationDto) {
    if (dto.status !== ModerationStatus.Approved && dto.status !== ModerationStatus.Rejected) throw new BadRequestException('Aprove ou rejeite esta publicação.');
    const highlight = await this.highlightsRepository.findOne({ where: { id: highlightId, archivedAt: IsNull() }, relations: { professional: true } });
    if (!highlight) throw new NotFoundException('Publicação não encontrada.');
    if (dto.status === ModerationStatus.Approved) assertHighlightPhotos(highlight.mediaIds, highlight.professional.portfolioPhotos || []);
    await this.highlightsRepository.update({ id: highlightId }, { status: dto.status, reviewedBy: adminId, reviewNotes: dto.notes?.trim() || null });
    return { reviewed: true };
  }
}
