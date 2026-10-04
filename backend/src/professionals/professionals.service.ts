import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { Order } from '../marketplace/order.entity';
import { OrderStatus } from '../marketplace/marketplace.enums';
import { AddCompletedOrderPhotoDto } from './dto/add-completed-order-photo.dto';
import { ProfessionalPhotoKind } from './professionalPhoto';
import { validatePortfolioPhotoChanges } from './professionalPhoto.utils';
import { StorageService } from '../storage/storage.service';
import { MediaPurpose } from '../storage/media-purpose.enum';
import { UpdateProfessionalPresentationDto } from './dto/update-professional-presentation.dto';
import { Service } from '../services/service.entity';
import { normalizePhone } from '../shared/utils/phone.utils';
import { FindProfessionalsQueryDto } from './dto/find-professionals-query.dto';
import { ReplaceProfessionalServicesDto } from './dto/replace-professional-services.dto';
import { UpdateProfessionalProfileDto } from './dto/update-professional-profile.dto';
import { ProfessionalProfile } from './professional-profile.entity';
import { ProfessionalService } from './professional-service.entity';
import {
  ProfessionalMetrics,
  toPrivateProfessionalProfile,
  toPublicProfessionalProfile
} from './professional-profile.utils';

@Injectable()
export class ProfessionalsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly storageService: StorageService,
    @InjectRepository(ProfessionalProfile)
    private readonly profilesRepository: Repository<ProfessionalProfile>,
    @InjectRepository(ProfessionalService)
    private readonly professionalServicesRepository: Repository<ProfessionalService>,
    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>
  ) {}

  async findPublic(query: FindProfessionalsQueryDto) {
    this.validateLocationQuery(query);

    const queryBuilder = this.createProfileQuery(true)
      .where('profile.isAvailable = true')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.serviceId) {
      queryBuilder.andWhere('professionalService.serviceId = :serviceId', { serviceId: query.serviceId });
    }
    if (query.city) {
      queryBuilder.andWhere('LOWER(profile.city) = LOWER(:city)', { city: query.city.trim() });
    }
    if (query.state) {
      queryBuilder.andWhere('profile.state = :state', { state: query.state.toUpperCase() });
    }

    const hasCoordinates = query.latitude !== undefined && query.longitude !== undefined;
    if (hasCoordinates) {
      const radiusKm = query.radiusKm || 50;
      const locationExpression = this.createLocationExpression();
      queryBuilder
        .addSelect(`ST_Distance(profile.location, ${locationExpression})`, 'distance_meters')
        .andWhere(`ST_DWithin(profile.location, ${locationExpression}, :radiusMeters)`)
        .setParameters({
          latitude: query.latitude,
          longitude: query.longitude,
          radiusMeters: radiusKm * 1000
        })
        .orderBy('distance_meters', 'ASC');
    } else {
      queryBuilder.orderBy('profile.updatedAt', 'DESC');
    }

    const [result, total] = await Promise.all([queryBuilder.getRawAndEntities(), queryBuilder.getCount()]);
    const metrics = await this.findMetrics(result.entities.map((profile) => profile.userId));
    const professionals = result.entities.map((profile) => {
      const matchingRow = result.raw.find(
        (row: Record<string, unknown>) => row.profile_user_id === profile.userId
      );
      const distanceMeters = matchingRow?.distance_meters;
      return toPublicProfessionalProfile(
        profile,
        distanceMeters === undefined ? undefined : Number(distanceMeters),
        metrics.get(profile.userId)
      );
    });

    return { professionals, page: query.page, limit: query.limit, total };
  }

  async findPublicById(professionalId: string) {
    const profile = await this.createProfileQuery(true)
      .where('profile.userId = :professionalId', { professionalId })
      .andWhere('profile.isAvailable = true')
      .getOne();
    if (!profile) {
      throw new NotFoundException('Perfil profissional não encontrado.');
    }

    const metrics = await this.findMetrics([professionalId]);
    return toPublicProfessionalProfile(profile, undefined, metrics.get(professionalId));
  }

  async findOwn(userId: string) {
    const profile = await this.createProfileQuery(false)
      .where('profile.userId = :userId', { userId })
      .getOne();
    if (!profile) {
      throw new NotFoundException('Perfil profissional não encontrado.');
    }

    const metrics = await this.findMetrics([userId]);
    return toPrivateProfessionalProfile(profile, metrics.get(userId));
  }

  async updateOwn(userId: string, dto: UpdateProfessionalProfileDto) {
    const existingProfile = await this.profilesRepository.findOne({ where: { userId } });
    const profile = existingProfile || this.profilesRepository.create({ userId });

    this.profilesRepository.merge(profile, {
      bio: dto.bio.trim(),
      phone: normalizePhone(dto.phone),
      city: dto.city.trim(),
      state: dto.state.toUpperCase(),
      location: { type: 'Point', coordinates: [dto.longitude, dto.latitude] },
      serviceRadiusKm: dto.serviceRadiusKm,
      yearsOfExperience: dto.yearsOfExperience,
      isAvailable: dto.isAvailable
    });
    await this.profilesRepository.save(profile);

    return this.findOwn(userId);
  }

  async updateOwnPresentation(userId: string, dto: UpdateProfessionalPresentationDto) {
    await this.dataSource.transaction(async (manager) => {
      const profile = await manager.findOne(ProfessionalProfile, {
        where: { userId },
        lock: { mode: 'pessimistic_write' }
      });
      if (!profile)
        throw new NotFoundException('Crie o perfil profissional antes de editar sua apresentação.');
      if (dto.portfolioPhotos !== undefined)
        validatePortfolioPhotoChanges(profile.portfolioPhotos || [], dto.portfolioPhotos);
      const mediaIds = new Set<string>();
      if (dto.coverPhotoMediaId) mediaIds.add(dto.coverPhotoMediaId);
      for (const photo of dto.portfolioPhotos || []) mediaIds.add(photo.mediaId);
      for (const mediaId of mediaIds) {
        await this.storageService.attachToContext(
          mediaId,
          userId,
          MediaPurpose.ProfilePhoto,
          userId,
          manager
        );
      }
      if (dto.bio !== undefined) {
        const bio = dto.bio.trim();
        if (bio.length < 40)
          throw new BadRequestException(
            'O sobre deve conter pelo menos 40 caracteres sem espaços nas extremidades.'
          );
        profile.bio = bio;
      }
      if (dto.coverPhotoMediaId !== undefined) profile.coverPhotoMediaId = dto.coverPhotoMediaId;
      if (dto.portfolioPhotos !== undefined)
        profile.portfolioPhotos = dto.portfolioPhotos.map((photo) => ({
          ...photo,
          caption: photo.caption.trim()
        }));
      await manager.save(ProfessionalProfile, profile);
    });
    return this.findOwn(userId);
  }

  async addCompletedOrderPhoto(userId: string, orderId: string, dto: AddCompletedOrderPhotoDto) {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId, professionalId: userId },
        lock: { mode: 'pessimistic_write' }
      });
      if (!order) throw new NotFoundException('Pedido não encontrado para este profissional.');
      if (order.status !== OrderStatus.Completed)
        throw new BadRequestException('Conclua o serviço antes de publicar fotos do resultado.');
      const profile = await manager.findOne(ProfessionalProfile, {
        where: { userId },
        lock: { mode: 'pessimistic_write' }
      });
      if (!profile) throw new NotFoundException('Perfil profissional não encontrado.');
      const photos = profile.portfolioPhotos || [];
      if (photos.length >= 30)
        throw new BadRequestException(
          'Seu portfólio já possui 30 fotos. Remova uma foto antes de publicar outra.'
        );
      if (photos.some((photo) => photo.mediaId === dto.mediaId))
        throw new BadRequestException('Esta foto já foi publicada no seu portfólio.');
      await this.storageService.attachToContext(
        dto.mediaId,
        userId,
        MediaPurpose.ProfilePhoto,
        userId,
        manager
      );
      profile.portfolioPhotos = [
        ...photos,
        { mediaId: dto.mediaId, caption: dto.caption.trim(), kind: ProfessionalPhotoKind.Completed, orderId }
      ];
      await manager.save(ProfessionalProfile, profile);
    });
    return this.findOwn(userId);
  }

  async replaceOwnServices(userId: string, dto: ReplaceProfessionalServicesDto) {
    const profileExists = await this.profilesRepository.exists({ where: { userId } });
    if (!profileExists) {
      throw new NotFoundException('Crie o perfil profissional antes de adicionar serviços.');
    }

    const serviceIds = dto.services.map((professionalService) => professionalService.serviceId);
    if (new Set(serviceIds).size !== serviceIds.length) {
      throw new BadRequestException('A lista contém serviços duplicados.');
    }

    const activeServices = serviceIds.length
      ? await this.servicesRepository.findBy({ id: In(serviceIds), isActive: true })
      : [];
    if (activeServices.length !== serviceIds.length) {
      throw new BadRequestException('Um ou mais serviços informados não existem ou estão inativos.');
    }

    await this.professionalServicesRepository.manager.transaction(async (manager) => {
      await manager.delete(ProfessionalService, { professionalId: userId });
      if (!dto.services.length) {
        return;
      }

      const professionalServices = dto.services.map((serviceDto) =>
        manager.create(ProfessionalService, {
          professionalId: userId,
          serviceId: serviceDto.serviceId,
          basePrice: serviceDto.basePrice === undefined ? null : serviceDto.basePrice.toFixed(2),
          description: serviceDto.description?.trim() || null,
          isActive: serviceDto.isActive
        })
      );
      await manager.save(ProfessionalService, professionalServices);
    });

    return this.findOwn(userId);
  }

  async findMetrics(professionalIds: string[]) {
    const metrics = new Map<string, ProfessionalMetrics>();
    const uniqueProfessionalIds = [...new Set(professionalIds)];
    if (!uniqueProfessionalIds.length) {
      return metrics;
    }
    const rows = await this.dataSource.query<
      Array<{
        professional_id: string;
        completed_services: string;
        cancelled_orders: string;
        total_orders: string;
        average_response_minutes: string | null;
        direct_requests: string;
        direct_responses: string;
        average_rating: string | null;
        verified_review_count: string;
      }>
    >(
      `SELECT professional_id,
        (SELECT COUNT(*) FROM orders WHERE professional_id = ids.professional_id AND status = 'completed') AS completed_services,
        (SELECT COUNT(*) FROM orders WHERE professional_id = ids.professional_id AND status IN ('cancelled_by_client', 'cancelled_by_professional')) AS cancelled_orders,
        (SELECT COUNT(*) FROM orders WHERE professional_id = ids.professional_id) AS total_orders,
        (SELECT AVG(EXTRACT(EPOCH FROM (proposal.created_at - request.created_at)) / 60)
          FROM proposals proposal
          JOIN service_requests request ON request.id = proposal.request_id
          WHERE proposal.professional_id = ids.professional_id) AS average_response_minutes,
        (SELECT COUNT(*) FROM service_requests WHERE preferred_professional_id = ids.professional_id) AS direct_requests,
        (SELECT COUNT(*) FROM proposals proposal
          JOIN service_requests request ON request.id = proposal.request_id
          WHERE proposal.professional_id = ids.professional_id
          AND request.preferred_professional_id = ids.professional_id) AS direct_responses,
        (SELECT AVG(rating) FROM reviews WHERE professional_id = ids.professional_id AND is_published = true) AS average_rating,
        (SELECT COUNT(*) FROM reviews WHERE professional_id = ids.professional_id AND is_published = true) AS verified_review_count
      FROM unnest($1::uuid[]) AS ids(professional_id)`,
      [uniqueProfessionalIds]
    );
    for (const row of rows) {
      const totalOrders = Number(row.total_orders);
      const directRequests = Number(row.direct_requests);
      metrics.set(row.professional_id, {
        completedServices: Number(row.completed_services),
        cancellationRate: totalOrders
          ? Math.round((Number(row.cancelled_orders) / totalOrders) * 1000) / 10
          : null,
        averageResponseMinutes:
          row.average_response_minutes === null ? null : Math.round(Number(row.average_response_minutes)),
        responseRate: directRequests
          ? Math.round((Number(row.direct_responses) / directRequests) * 1000) / 10
          : null,
        averageRating: row.average_rating === null ? null : Math.round(Number(row.average_rating) * 10) / 10,
        verifiedReviewCount: Number(row.verified_review_count)
      });
    }
    return metrics;
  }

  private createProfileQuery(onlyActiveServices: boolean) {
    const professionalServiceCondition = onlyActiveServices
      ? 'professionalService.isActive = true'
      : undefined;
    const serviceCondition = onlyActiveServices ? 'service.isActive = true' : undefined;

    return this.profilesRepository
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user', 'user.isActive = true')
      .leftJoinAndSelect('user.profile', 'userProfile')
      .leftJoinAndSelect('profile.services', 'professionalService', professionalServiceCondition)
      .leftJoinAndSelect('professionalService.service', 'service', serviceCondition);
  }

  private createLocationExpression() {
    return 'ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography';
  }

  private validateLocationQuery(query: FindProfessionalsQueryDto) {
    const hasLatitude = query.latitude !== undefined;
    const hasLongitude = query.longitude !== undefined;
    if (hasLatitude !== hasLongitude) {
      throw new BadRequestException('latitude e longitude devem ser informadas juntas.');
    }
    if (query.radiusKm !== undefined && !hasLatitude) {
      throw new BadRequestException('radiusKm exige latitude e longitude.');
    }
  }
}
