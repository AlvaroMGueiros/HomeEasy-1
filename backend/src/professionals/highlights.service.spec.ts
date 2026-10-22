import 'reflect-metadata';
import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ModerationStatus } from '../moderation/moderation.enums';
import { CreateHighlightDto } from './dto/create-highlight.dto';
import { HighlightsService } from './highlights.service';
import { ProfessionalHighlight } from './professional-highlight.entity';
import { ProfessionalsService } from './professionals.service';
import { ProfessionalPhotoKind } from './professionalPhoto';

describe('Highlight ownership and moderation', () => {
  const photoId = '319ce16e-e842-4b46-a3d3-3e28a6b3e53e';
  const publication = { serviceId: 'service', title: 'Serviço de montagem', description: 'Montagem de móveis realizada na região.', mediaIds: [photoId], hasPublicationConsent: true };
  function createService(activeCount = 0) {
    const manager = {
      findOne: jest.fn().mockResolvedValue({ userId: 'owner', isAvailable: true, portfolioPhotos: [{ mediaId: photoId, kind: ProfessionalPhotoKind.Offered, caption: '' }] }),
      exists: jest.fn().mockResolvedValue(true), count: jest.fn().mockResolvedValue(activeCount),
      create: jest.fn((_, attributes) => Object.assign(new ProfessionalHighlight(), attributes)), save: jest.fn(async entity => ({ ...entity, id: 'created' }))
    };
    const repository = { findOne: jest.fn(), update: jest.fn() };
    const dataSource = { transaction: jest.fn(handler => handler(manager)) };
    const service = new HighlightsService(dataSource as unknown as DataSource, repository as unknown as Repository<ProfessionalHighlight>, {} as ProfessionalsService);
    return { service, manager, repository };
  }
  it('creates only pending and unpaid posts owned by the authenticated user', async () => {
    const { service, manager } = createService();
    const result = await service.create('owner', { ...publication, professionalId: 'victim', status: ModerationStatus.Approved, isSponsored: true } as CreateHighlightDto);
    expect(result.professionalId).toBe('owner'); expect(result.status).toBe(ModerationStatus.Pending); expect(result.isSponsored).toBe(false);
    expect(manager.findOne.mock.calls[0][1].lock).toEqual({ mode: 'pessimistic_write' });
  });
  it('rejects the fifth active publication', async () => {
    const { service, manager } = createService(4);
    await expect(service.create('owner', publication)).rejects.toThrow('quatro publicações');
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('does not allow deletion by a different professional', async () => {
    const { service, repository } = createService();
    repository.findOne.mockResolvedValue({ id: 'post', professionalId: 'owner' });
    await expect(service.archive('post', 'attacker')).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.update).not.toHaveBeenCalled();
  });
  it('allows rejecting a post whose photos were removed, but does not approve it', async () => {
    const { service, repository } = createService();
    repository.findOne.mockResolvedValue({ id: 'post', mediaIds: [photoId], professional: { portfolioPhotos: [] } });
    await expect(service.review('post', 'admin', { status: ModerationStatus.Approved })).rejects.toThrow();
    await expect(service.review('post', 'admin', { status: ModerationStatus.Rejected })).resolves.toEqual({ reviewed: true });
  });
  it('rejects attempts to set approval or sponsorship in the HTTP payload', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
    for (const injected of [{ status: 'approved' }, { isSponsored: true }, { sponsoredUntil: '2030-01-01' }, { professionalId: photoId }]) {
      await expect(pipe.transform({ ...publication, ...injected }, { type: 'body', metatype: CreateHighlightDto })).rejects.toThrow();
    }
    await expect(pipe.transform({ ...publication, hasPublicationConsent: false }, { type: 'body', metatype: CreateHighlightDto })).rejects.toThrow();
  });
});

describe('Highlight public review preview', () => {
  it('loads published reviews in one batch and associates each with its professional', async () => {
    function queryBuilder() {
      const builder: Record<string, jest.Mock> = {};
      for (const method of ['innerJoinAndSelect', 'innerJoin', 'where', 'andWhere', 'orderBy', 'addOrderBy', 'skip', 'take', 'distinctOn', 'select', 'addSelect']) builder[method] = jest.fn().mockReturnValue(builder);
      return builder;
    }
    const feedQuery = queryBuilder();
    feedQuery.getMany = jest.fn().mockResolvedValue([{ id: 'post', professionalId: 'owner', mediaIds: ['photo'], professional: { portfolioPhotos: [{ mediaId: 'photo' }] } }]);
    const reviewQuery = queryBuilder();
    reviewQuery.getRawMany = jest.fn().mockResolvedValue([{ professionalId: 'owner', id: 'review', clientName: 'Cliente real', rating: 4, comment: 'Serviço bem executado.' }]);
    const getRepository = jest.fn().mockReturnValue({ createQueryBuilder: jest.fn().mockReturnValue(reviewQuery) });
    const service = new HighlightsService({ getRepository } as unknown as DataSource,
      { createQueryBuilder: jest.fn().mockReturnValue(feedQuery) } as unknown as Repository<ProfessionalHighlight>,
      { findPublicProfilesByIds: jest.fn().mockResolvedValue([{ id: 'owner' }]) } as unknown as ProfessionalsService);
    const response = await service.findFeed('viewer', { city: 'Recife', state: 'PE', page: 1, limit: 10, search: '100%_feito', category: 'Reformas' });
    expect(feedQuery.andWhere).toHaveBeenCalledWith('service.category = :category', { category: 'Reformas' });
    expect(feedQuery.andWhere).toHaveBeenCalledWith(expect.stringContaining('ILIKE :search'), { search: '%' + '100' + String.fromCharCode(92) + '%' + String.fromCharCode(92) + '_feito%' });
    expect(reviewQuery.where).toHaveBeenCalledWith('review.professionalId IN (:...professionalIds) AND review.isPublished = true', { professionalIds: ['owner'] });
    expect(getRepository).toHaveBeenCalledTimes(1);
    expect(response.highlights[0].latestReview).toEqual({ id: 'review', clientName: 'Cliente real', rating: 4, comment: 'Serviço bem executado.' });
  });
});
