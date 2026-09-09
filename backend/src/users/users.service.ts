import { ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';

import { PasswordResetToken } from '../auth/password-reset-token.entity';
import { RefreshToken } from '../auth/refresh-token.entity';
import { Message } from '../communications/message.entity';
import { MessageType } from '../communications/communication.enums';
import { Notification } from '../communications/notification.entity';
import { UserBlock } from '../communications/user-block.entity';
import { UserPresence } from '../communications/user-presence.entity';
import { Favorite } from '../engagement/favorite.entity';
import { Review } from '../engagement/review.entity';
import { Proposal } from '../marketplace/proposal.entity';
import { ServiceRequest } from '../marketplace/service-request.entity';
import { VerificationDocument } from '../moderation/verification-document.entity';
import { ProfessionalProfile } from '../professionals/professional-profile.entity';
import { ProfessionalService } from '../professionals/professional-service.entity';
import { normalizeEmail } from '../shared/utils/email.utils';
import { assertAdultBirthDate } from '../shared/utils/birth-date.utils';
import { normalizePhone } from '../shared/utils/phone.utils';
import { normalizeDocument } from '../shared/utils/document.utils';
import { MediaPurpose } from '../storage/media-purpose.enum';
import { MediaObject } from '../storage/media-object.entity';
import { StorageService } from '../storage/storage.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UserProfile } from './user-profile.entity';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly storageService: StorageService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>
  ) {}

  findById(userId: string) {
    return this.usersRepository.findOne({ where: { id: userId, isActive: true } });
  }

  findByEmailWithPassword(email: string) {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: normalizeEmail(email) })
      .andWhere('user.isActive = true')
      .getOne();
  }

  findByGoogleSubject(googleSubject: string) {
    return this.usersRepository.findOne({ where: { googleSubject, isActive: true } });
  }

  async linkGoogleSubject(userId: string, googleSubject: string) {
    await this.usersRepository.update({ id: userId, isActive: true }, { googleSubject });
    return this.usersRepository.findOneOrFail({ where: { id: userId, isActive: true } });
  }

  create(
    name: string,
    email: string,
    passwordHash: string,
    birthDate: string,
    googleSubject: string | null = null
  ) {
    assertAdultBirthDate(birthDate);
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.save(
        manager.create(User, {
          name: name.trim(),
          email: normalizeEmail(email),
          passwordHash,
          googleSubject
        })
      );
      await manager.save(manager.create(UserProfile, { userId: user.id, birthDate }));
      return user;
    });
  }

  async findOwnProfile(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId, isActive: true } });
    if (!user) {
      return null;
    }
    const profile = await this.dataSource.getRepository(UserProfile).findOne({ where: { userId } });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      memberSince: user.createdAt,
      phone: profile?.phone || null,
      birthDate: profile?.birthDate || null,
      profilePhotoMediaId: profile?.profilePhotoMediaId || null,
      address: profile?.address || null,
      city: profile?.city || null,
      state: profile?.state || null,
      cpf: profile?.cpf || null,
      cnpj: profile?.cnpj || null,
      instagram: profile?.instagram || null,
      facebook: profile?.facebook || null,
      twitter: profile?.twitter || null,
      website: profile?.website || null,
      linkedin: profile?.linkedin || null
    };
  }

  async updateOwnProfile(userId: string, dto: UpdateUserProfileDto) {
    try {
      await this.dataSource.transaction(async (manager) => {
        if (dto.profilePhotoMediaId) {
          await this.storageService.attachToContext(
            dto.profilePhotoMediaId,
            userId,
            MediaPurpose.ProfilePhoto,
            userId,
            manager
          );
        }
        if (dto.name) {
          await manager.update(User, { id: userId }, { name: dto.name.trim() });
        }
        const existingProfile = await manager.findOne(UserProfile, { where: { userId } });
        const profile = existingProfile || manager.create(UserProfile, { userId });
        if (dto.phone !== undefined) {
          profile.phone = dto.phone ? normalizePhone(dto.phone) : null;
        }
        if (dto.birthDate !== undefined) {
          if (dto.birthDate) {
            assertAdultBirthDate(dto.birthDate);
          }
          profile.birthDate = dto.birthDate || null;
        }
        if (dto.profilePhotoMediaId !== undefined) {
          profile.profilePhotoMediaId = dto.profilePhotoMediaId || null;
        }
        if (dto.address !== undefined) {
          profile.address = dto.address?.trim() || null;
        }
        if (dto.city !== undefined) {
          profile.city = dto.city?.trim() || null;
        }
        if (dto.state !== undefined) {
          profile.state = dto.state?.toUpperCase() || null;
        }
        if (dto.cpf !== undefined) {
          profile.cpf = dto.cpf ? normalizeDocument(dto.cpf) : null;
          profile.cnpj = null;
        }
        if (dto.cnpj !== undefined) {
          profile.cnpj = dto.cnpj ? normalizeDocument(dto.cnpj) : null;
          profile.cpf = null;
        }
        if (dto.instagram !== undefined) {
          profile.instagram = dto.instagram?.trim() || null;
        }
        if (dto.facebook !== undefined) {
          profile.facebook = dto.facebook?.trim() || null;
        }
        if (dto.twitter !== undefined) {
          profile.twitter = dto.twitter?.trim() || null;
        }
        if (dto.website !== undefined) {
          profile.website = dto.website?.trim() || null;
        }
        if (dto.linkedin !== undefined) {
          profile.linkedin = dto.linkedin?.trim() || null;
        }
        await manager.save(profile);
      });
    } catch (error) {
      if (error instanceof QueryFailedError && (error.driverError as { code?: string }).code === '23505') {
        throw new ConflictException('O CPF ou CNPJ informado já pertence a outra conta.');
      }
      throw error;
    }
    return this.findOwnProfile(userId);
  }

  async deleteOwnAccount(userId: string) {
    try {
      await this.storageService.deleteOwnedObjects(userId);
    } catch {
      throw new ServiceUnavailableException(
        'Não foi possível remover os arquivos da conta. A conta permanece ativa; tente novamente.'
      );
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(VerificationDocument, { professionalId: userId });
      await manager.update(
        UserProfile,
        { userId },
        {
          phone: null,
          birthDate: null,
          profilePhotoMediaId: null,
          address: null,
          city: null,
          state: null,
          cpf: null,
          cnpj: null,
          instagram: null,
          facebook: null,
          twitter: null,
          website: null,
          linkedin: null
        }
      );
      await manager.update(
        ServiceRequest,
        { clientId: userId },
        {
          description: 'Conteúdo removido pelo titular da conta.',
          answers: {},
          attachments: [],
          address: '',
          city: '',
          state: '',
          location: null
        }
      );
      await manager.update(
        Message,
        { senderId: userId },
        {
          type: MessageType.Text,
          content: 'Mensagem removida pelo titular da conta.',
          attachment: null
        }
      );
      await manager.update(
        Proposal,
        { professionalId: userId },
        {
          message: 'Conteúdo removido pelo titular da conta.',
          paymentMethods: []
        }
      );
      await manager.update(
        ProfessionalService,
        { professionalId: userId },
        {
          description: null,
          isActive: false
        }
      );
      await manager.update(
        ProfessionalProfile,
        { userId },
        {
          bio: 'Conta excluída.',
          phone: '',
          city: '',
          state: '',
          location: { type: 'Point', coordinates: [0, 0] },
          isAvailable: false
        }
      );
      await manager
        .createQueryBuilder()
        .update(Review)
        .set({
          comment: 'Avaliação removida pelo titular da conta.',
          professionalResponse: null,
          isPublished: false
        })
        .where('client_id = :userId OR professional_id = :userId', { userId })
        .execute();
      await manager.delete(Favorite, [{ clientId: userId }, { professionalId: userId }]);
      await manager.delete(UserBlock, [{ blockerId: userId }, { blockedId: userId }]);
      await manager.delete(Notification, { userId });
      await manager.delete(UserPresence, { userId });
      await manager.delete(PasswordResetToken, { userId });
      await manager.delete(RefreshToken, { userId });
      await manager.delete(MediaObject, { ownerId: userId });
      await manager.update(
        User,
        { id: userId },
        {
          name: 'Conta excluída',
          email: `deleted+${userId}@deleted.homeeasy.invalid`,
          passwordHash: `deleted-${userId}`,
          googleSubject: null,
          isActive: false
        }
      );
    });
  }

  async findPublicIdentity(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId, isActive: true } });
    if (!user) {
      return null;
    }
    const profile = await this.dataSource.getRepository(UserProfile).findOne({ where: { userId } });
    return {
      id: user.id,
      name: user.name,
      memberSince: user.createdAt,
      profilePhotoMediaId: profile?.profilePhotoMediaId || null
    };
  }
}
