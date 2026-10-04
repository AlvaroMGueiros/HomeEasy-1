import 'reflect-metadata';
import { DataSource, Repository } from 'typeorm';

import { Order } from '../marketplace/order.entity';
import { OrderStatus } from '../marketplace/marketplace.enums';
import { Service } from '../services/service.entity';
import { StorageService } from '../storage/storage.service';
import { ProfessionalProfile } from './professional-profile.entity';
import { ProfessionalService } from './professional-service.entity';
import { ProfessionalPhotoKind } from './professionalPhoto';
import { ProfessionalsService } from './professionals.service';

describe('Completed order photos', () => {
  const userId = 'professional';
  const orderId = 'order';
  const photo = { mediaId: 'media', caption: '  Resultado final  ' };
  function createService(status: OrderStatus | null = OrderStatus.Completed, photoCount = 0) {
    const profile = {
      portfolioPhotos: Array.from({ length: photoCount }, (_, index) => ({
        mediaId: String(index),
        kind: ProfessionalPhotoKind.Offered,
        caption: ''
      }))
    };
    const manager = {
      findOne: jest.fn(async (entity: unknown) =>
        entity === Order ? status && { id: orderId, professionalId: userId, status } : profile
      ),
      save: jest.fn(async () => profile)
    };
    const storage = { attachToContext: jest.fn(async () => undefined) };
    const database = {
      transaction: jest.fn(async (work: (transactionManager: typeof manager) => Promise<void>) =>
        work(manager)
      )
    };
    const service = new ProfessionalsService(
      database as unknown as DataSource,
      storage as unknown as StorageService,
      {} as Repository<ProfessionalProfile>,
      {} as Repository<ProfessionalService>,
      {} as Repository<Service>
    );
    jest
      .spyOn(service, 'findOwn')
      .mockResolvedValue({} as Awaited<ReturnType<ProfessionalsService['findOwn']>>);
    return { service, manager, storage, profile };
  }
  it('rejects orders not belonging to the professional before attaching media', async () => {
    const { service, manager, storage } = createService(null);
    await expect(service.addCompletedOrderPhoto(userId, orderId, photo)).rejects.toThrow(
      'Pedido não encontrado'
    );
    expect(manager.findOne).toHaveBeenCalledWith(
      Order,
      expect.objectContaining({ where: { id: orderId, professionalId: userId } })
    );
    expect(storage.attachToContext).not.toHaveBeenCalled();
  });
  it.each([
    OrderStatus.Accepted,
    OrderStatus.InProgress,
    OrderStatus.CancelledByProfessional,
    OrderStatus.Disputed
  ])('rejects photos for status %s', async (status) => {
    const { service, storage } = createService(status);
    await expect(service.addCompletedOrderPhoto(userId, orderId, photo)).rejects.toThrow('Conclua o serviço');
    expect(storage.attachToContext).not.toHaveBeenCalled();
  });
  it('publishes a completed-service photo linked to the order', async () => {
    const { service, profile, manager, storage } = createService();
    await service.addCompletedOrderPhoto(userId, orderId, photo);
    expect(profile.portfolioPhotos).toEqual([
      { mediaId: photo.mediaId, caption: 'Resultado final', kind: ProfessionalPhotoKind.Completed, orderId }
    ]);
    expect(storage.attachToContext).toHaveBeenCalledWith(
      photo.mediaId,
      userId,
      'profile_photo',
      userId,
      manager
    );
    expect(manager.save).toHaveBeenCalledWith(ProfessionalProfile, profile);
  });
  it('rejects a full portfolio before attaching media', async () => {
    const { service, storage } = createService(OrderStatus.Completed, 30);
    await expect(service.addCompletedOrderPhoto(userId, orderId, photo)).rejects.toThrow('30 fotos');
    expect(storage.attachToContext).not.toHaveBeenCalled();
  });
});
