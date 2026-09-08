import { ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Client } from 'minio';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { UserRole } from '../users/user-role.enum';
import { CreateUploadDto } from './dto/create-upload.dto';
import { MediaObject } from './media-object.entity';
import { MediaPurpose } from './media-purpose.enum';
import { sanitizeFileName, validateMediaType } from './storage.utils';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly bucket: string;
  private readonly client: Client;

  constructor(
    configService: ConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(MediaObject)
    private readonly mediaRepository: Repository<MediaObject>
  ) {
    this.bucket = configService.getOrThrow<string>('MINIO_BUCKET');
    this.client = new Client({
      endPoint: configService.getOrThrow<string>('MINIO_ENDPOINT'),
      port: configService.getOrThrow<number>('MINIO_PORT'),
      useSSL: configService.getOrThrow<boolean>('MINIO_USE_SSL'),
      accessKey: configService.getOrThrow<string>('MINIO_ACCESS_KEY'),
      secretKey: configService.getOrThrow<string>('MINIO_SECRET_KEY')
    });
  }

  async onModuleInit() {
    const bucketExists = await this.client.bucketExists(this.bucket);
    if (!bucketExists) {
      await this.client.makeBucket(this.bucket);
    }
  }

  async createUpload(ownerId: string, dto: CreateUploadDto) {
    validateMediaType(dto.purpose, dto.contentType);
    const fileName = sanitizeFileName(dto.fileName);
    const objectKey = `${dto.purpose}/${ownerId}/${randomUUID()}-${fileName}`;
    const media = await this.mediaRepository.save(
      this.mediaRepository.create({
        ownerId,
        purpose: dto.purpose,
        objectKey,
        fileName,
        contentType: dto.contentType.toLowerCase(),
        size: dto.size,
        contextId: null,
        uploadedAt: null
      })
    );
    const uploadUrl = await this.client.presignedPutObject(this.bucket, objectKey, 15 * 60);
    return { mediaId: media.id, uploadUrl, expiresInSeconds: 900 };
  }

  async completeUpload(mediaId: string, ownerId: string) {
    const media = await this.findOwnedMedia(mediaId, ownerId);
    const object = await this.client.statObject(this.bucket, media.objectKey);
    if (object.size !== media.size) {
      await this.client.removeObject(this.bucket, media.objectKey);
      throw new ForbiddenException('O tamanho enviado não corresponde ao arquivo autorizado.');
    }
    media.uploadedAt = new Date();
    return this.mediaRepository.save(media);
  }

  async uploadContent(
    mediaId: string,
    ownerId: string,
    file: { buffer: Buffer; mimetype: string; size: number }
  ) {
    const media = await this.findOwnedMedia(mediaId, ownerId);
    if (file.size !== media.size || file.mimetype.toLowerCase() !== media.contentType) {
      throw new ForbiddenException('O arquivo enviado não corresponde ao arquivo autorizado.');
    }
    await this.client.putObject(this.bucket, media.objectKey, file.buffer, file.size, {
      'Content-Type': media.contentType
    });
    media.uploadedAt = new Date();
    return this.mediaRepository.save(media);
  }

  async createDownloadUrl(mediaId: string, userId: string, role: UserRole) {
    const media = await this.mediaRepository.findOne({ where: { id: mediaId } });
    if (!media || !media.uploadedAt) {
      throw new NotFoundException('Arquivo não encontrado ou envio ainda não concluído.');
    }
    const hasContextAccess = await this.hasContextAccess(media, userId);
    if (media.ownerId !== userId && role !== UserRole.Admin && !hasContextAccess) {
      throw new ForbiddenException('Você não possui acesso a este arquivo privado.');
    }
    const downloadUrl = await this.client.presignedGetObject(this.bucket, media.objectKey, 5 * 60);
    return { downloadUrl, expiresInSeconds: 300 };
  }

  async deleteOwnedObjects(ownerId: string) {
    const ownedMedia = await this.mediaRepository.find({ where: { ownerId }, select: { objectKey: true } });
    for (const media of ownedMedia) {
      await this.client.removeObject(this.bucket, media.objectKey);
    }
  }

  async openPublicProfilePhoto(mediaId: string) {
    const media = await this.mediaRepository.findOne({ where: { id: mediaId } });
    if (
      !media ||
      !media.uploadedAt ||
      media.purpose !== MediaPurpose.ProfilePhoto ||
      media.contextId !== media.ownerId
    ) {
      throw new NotFoundException('Foto de perfil não encontrada.');
    }
    return {
      contentType: media.contentType,
      stream: await this.client.getObject(this.bucket, media.objectKey)
    };
  }

  async attachToContext(
    mediaId: string,
    ownerId: string,
    purpose: MediaPurpose,
    contextId: string,
    manager?: EntityManager
  ) {
    const repository = manager ? manager.getRepository(MediaObject) : this.mediaRepository;
    const media = await repository.findOne({ where: { id: mediaId, ownerId } });
    if (!media) {
      throw new NotFoundException('Arquivo não encontrado para esta conta.');
    }
    if (!media.uploadedAt) {
      throw new ForbiddenException('Conclua o envio do arquivo antes de anexá-lo.');
    }
    if (media.purpose !== purpose) {
      throw new ForbiddenException('O arquivo foi enviado para outra finalidade.');
    }
    if (media.contextId && media.contextId !== contextId) {
      throw new ForbiddenException('Este arquivo já está associado a outro registro.');
    }
    media.contextId = contextId;
    return repository.save(media);
  }

  private async hasContextAccess(media: MediaObject, userId: string) {
    if (!media.contextId || media.purpose === MediaPurpose.VerificationDocument) {
      return false;
    }
    if (media.purpose === MediaPurpose.ChatAttachment) {
      const rows = await this.dataSource.query<Array<{ allowed: boolean }>>(
        'SELECT EXISTS(SELECT 1 FROM conversations WHERE id = $1 AND (client_id = $2 OR professional_id = $2)) AS allowed',
        [media.contextId, userId]
      );
      return rows[0]?.allowed === true;
    }
    const rows = await this.dataSource.query<Array<{ allowed: boolean }>>(
      `SELECT EXISTS(
        SELECT 1 FROM service_requests request
        WHERE request.id = $1 AND (
          request.client_id = $2 OR
          request.preferred_professional_id = $2 OR EXISTS(
            SELECT 1 FROM proposals proposal
            WHERE proposal.request_id = request.id AND proposal.professional_id = $2
          ) OR EXISTS(
            SELECT 1
            FROM professional_services professional_service
            INNER JOIN professional_profiles professional_profile
              ON professional_profile.user_id = professional_service.professional_id
            WHERE professional_service.professional_id = $2
              AND professional_service.service_id = request.service_id
              AND professional_service.is_active = true
              AND professional_profile.is_available = true
              AND request.preferred_professional_id IS NULL
              AND (
                (
                  request.location IS NOT NULL AND
                  ST_DWithin(
                    request.location,
                    professional_profile.location,
                    professional_profile.service_radius_km * 1000
                  )
                ) OR (
                  request.location IS NULL AND
                  request.state = professional_profile.state AND
                  LOWER(request.city) = LOWER(professional_profile.city)
                )
              )
          )
        )
      ) AS allowed`,
      [media.contextId, userId]
    );
    return rows[0]?.allowed === true;
  }

  private async findOwnedMedia(mediaId: string, ownerId: string) {
    const media = await this.mediaRepository.findOne({ where: { id: mediaId, ownerId } });
    if (!media) {
      throw new NotFoundException('Arquivo não encontrado para esta conta.');
    }
    return media;
  }
}
