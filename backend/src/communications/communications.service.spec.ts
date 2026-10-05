import 'reflect-metadata';
import { DataSource, Repository } from 'typeorm';

import { Order } from '../marketplace/order.entity';
import { OrderStatus } from '../marketplace/marketplace.enums';
import { StorageService } from '../storage/storage.service';
import { CommunicationsService } from './communications.service';
import { ContactMessage } from './contact-message.entity';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { Notification } from './notification.entity';
import { PushNotificationService } from './push-notification.service';
import { UserBlock } from './user-block.entity';
import { UserPresence } from './user-presence.entity';

describe('Conversation profile photos', () => {
  function createService(hasPhoto = true) {
    const conversation = Object.assign(new Conversation(), {
      id: 'conversation',
      orderId: 'order',
      clientId: 'client',
      professionalId: 'professional',
      client: {
        id: 'client',
        name: 'Client',
        email: 'privateEmail',
        profile: hasPhoto ? { profilePhotoMediaId: 'clientPhoto', cpf: 'privateCpf' } : undefined
      },
      professional: {
        id: 'professional',
        name: 'Professional',
        email: 'privateEmail',
        profile: hasPhoto ? { profilePhotoMediaId: 'professionalPhoto', cpf: 'privateCpf' } : undefined
      },
      order: { status: OrderStatus.Accepted, request: { service: { id: 'service', name: 'Service' } } }
    });
    const queryBuilder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getRawAndEntities: jest.fn(async () => ({
        entities: [conversation],
        raw: [{ conversation_id: conversation.id, unread_count: '2' }]
      }))
    };
    const conversations = { createQueryBuilder: jest.fn(() => queryBuilder) };
    const service = new CommunicationsService(
      {} as DataSource,
      conversations as unknown as Repository<Conversation>,
      {} as Repository<Message>,
      {} as Repository<Notification>,
      {} as Repository<UserBlock>,
      {} as Repository<UserPresence>,
      {} as Repository<Order>,
      {} as Repository<ContactMessage>,
      {} as StorageService,
      {} as PushNotificationService
    );
    return { service, queryBuilder };
  }

  it.each([
    ['client', 'professional', 'Professional', 'professionalPhoto'],
    ['professional', 'client', 'Client', 'clientPhoto']
  ])(
    'returns only the other participant identity and photo for %s',
    async (userId, otherUserId, otherUserName, photoMediaId) => {
      const { service, queryBuilder } = createService();
      const conversations = await service.findConversations(userId);
      expect(conversations[0].otherUser).toEqual({
        id: otherUserId,
        name: otherUserName,
        profilePhotoMediaId: photoMediaId
      });
      expect(conversations[0].unreadCount).toBe(2);
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('client.profile', 'clientProfile');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'professional.profile',
        'professionalProfile'
      );
    }
  );

  it('keeps the conversation visible when the other participant has no profile photo', async () => {
    const { service } = createService(false);
    const conversations = await service.findConversations('client');
    expect(conversations[0].otherUser.profilePhotoMediaId).toBeNull();
  });
});
