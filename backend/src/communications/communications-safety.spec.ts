import 'reflect-metadata';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Order } from '../marketplace/order.entity';
import { OrderStatus } from '../marketplace/marketplace.enums';
import { StorageService } from '../storage/storage.service';
import { CommunicationsService } from './communications.service';
import { ContactMessage } from './contact-message.entity';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { MessageType } from './communication.enums';
import { Notification } from './notification.entity';
import { PushNotificationService } from './push-notification.service';
import { UserBlock } from './user-block.entity';
import { UserPresence } from './user-presence.entity';

describe('User blocking', () => {
  function createService(blocks: Array<{ blockerId: string; blockedId: string }> = []) {
    const conversation = {
      id: 'conversation',
      clientId: 'client',
      professionalId: 'professional',
      orderId: 'order'
    };
    const blockRepository = { find: jest.fn(async () => blocks), upsert: jest.fn(), delete: jest.fn() };
    const presenceRepository = { findOne: jest.fn(), upsert: jest.fn() };
    const targetExists = jest.fn(async () => true);
    const manager = {
      findOne: jest.fn(async (entity: unknown) =>
        entity === Conversation ? conversation : { id: 'order', status: OrderStatus.Accepted }
      ),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        getExists: jest.fn(async () => blocks.length > 0)
      })),
      save: jest.fn()
    };
    const datasource = {
      getRepository: jest.fn(() => ({ exists: targetExists })),
      transaction: jest.fn(async (callback: (transactionManager: unknown) => Promise<unknown>) =>
        callback(manager)
      )
    };
    const service = new CommunicationsService(
      datasource as unknown as DataSource,
      { findOne: jest.fn(async () => conversation) } as unknown as Repository<Conversation>,
      {} as Repository<Message>,
      {} as Repository<Notification>,
      blockRepository as unknown as Repository<UserBlock>,
      presenceRepository as unknown as Repository<UserPresence>,
      {} as Repository<Order>,
      {} as Repository<ContactMessage>,
      {} as StorageService,
      {} as PushNotificationService
    );
    return { service, blockRepository, presenceRepository, targetExists, manager };
  }

  it.each([
    [[], { isBlocked: false, canMessage: true }],
    [[{ blockerId: 'client', blockedId: 'professional' }], { isBlocked: true, canMessage: false }],
    [[{ blockerId: 'professional', blockedId: 'client' }], { isBlocked: false, canMessage: false }]
  ])('returns own block status without identifying who else blocked', async (blocks, expected) => {
    const { service } = createService(blocks as Array<{ blockerId: string; blockedId: string }>);
    expect(await service.findBlockStatus('client', 'professional')).toEqual(expected);
  });

  it('rejects blocking yourself and unknown accounts', async () => {
    const { service, targetExists, blockRepository } = createService();
    await expect(service.blockUser('client', 'client')).rejects.toBeInstanceOf(ConflictException);
    targetExists.mockResolvedValue(false);
    await expect(service.blockUser('client', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(blockRepository.upsert).not.toHaveBeenCalled();
  });

  it('unblocks only the caller direction and retains another person block', async () => {
    const { service, blockRepository } = createService([{ blockerId: 'professional', blockedId: 'client' }]);
    await service.unblockUser('client', 'professional');
    expect(blockRepository.delete).toHaveBeenCalledWith({ blockerId: 'client', blockedId: 'professional' });
    expect((await service.findBlockStatus('client', 'professional')).canMessage).toBe(false);
  });

  it('hides presence and prevents typing on blocked conversations', async () => {
    const { service, presenceRepository } = createService([
      { blockerId: 'client', blockedId: 'professional' }
    ]);
    expect(await service.findPresence('conversation', 'client')).toEqual({
      isOnline: false,
      isTyping: false,
      lastSeenAt: null
    });
    expect(presenceRepository.findOne).not.toHaveBeenCalled();
    await expect(service.updatePresence('client', 'conversation', true)).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(presenceRepository.upsert).not.toHaveBeenCalled();
  });

  it.each(['client', 'professional'])(
    'prevents messages and notifications in both directions: %s',
    async (senderId) => {
      const { service, manager } = createService([{ blockerId: 'client', blockedId: 'professional' }]);
      await expect(
        service.sendMessage('conversation', senderId, { type: MessageType.Text, content: 'Teste' })
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(manager.save).not.toHaveBeenCalled();
    }
  );

  it('rejects presence access by non-participants', async () => {
    const { service } = createService();
    await expect(service.findPresence('conversation', 'stranger')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
