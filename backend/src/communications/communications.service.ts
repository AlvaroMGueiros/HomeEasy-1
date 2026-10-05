import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Order } from '../marketplace/order.entity';
import { OrderStatus } from '../marketplace/marketplace.enums';
import { MediaPurpose } from '../storage/media-purpose.enum';
import { StorageService } from '../storage/storage.service';
import { SendMessageDto } from './dto/send-message.dto';
import { RegisterPushDeviceDto } from './dto/register-push-device.dto';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { MessageType, NotificationType } from './communication.enums';
import { isConversationWritable, validateMessage } from './communication.utils';
import { ContactMessage } from './contact-message.entity';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { Notification } from './notification.entity';
import { createNotification } from './notification.utils';
import { PushNotificationService } from './push-notification.service';
import { UserBlock } from './user-block.entity';
import { UserPresence } from './user-presence.entity';

const onlineThresholdMilliseconds = 2 * 60 * 1000;
const typingLifetimeMilliseconds = 8 * 1000;

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Conversation)
    private readonly conversationsRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    @InjectRepository(UserBlock)
    private readonly blocksRepository: Repository<UserBlock>,
    @InjectRepository(UserPresence)
    private readonly presenceRepository: Repository<UserPresence>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(ContactMessage)
    private readonly contactMessagesRepository: Repository<ContactMessage>,
    private readonly storageService: StorageService,
    private readonly pushNotificationService: PushNotificationService
  ) {}

  async createFromOrder(orderId: string, userId: string) {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado.');
    }
    this.assertParticipant(order.clientId, order.professionalId, userId);
    const existingConversation = await this.conversationsRepository.findOne({ where: { orderId } });
    if (existingConversation) {
      return existingConversation;
    }
    return this.conversationsRepository.save(
      this.conversationsRepository.create({
        orderId,
        clientId: order.clientId,
        professionalId: order.professionalId,
        lastMessageAt: null
      })
    );
  }

  async findConversations(userId: string) {
    const result = await this.conversationsRepository
      .createQueryBuilder('conversation')
      .innerJoinAndSelect('conversation.client', 'client')
      .leftJoinAndSelect('client.profile', 'clientProfile')
      .innerJoinAndSelect('conversation.professional', 'professional')
      .leftJoinAndSelect('professional.profile', 'professionalProfile')
      .innerJoinAndSelect('conversation.order', 'order')
      .innerJoinAndSelect('order.request', 'request')
      .innerJoinAndSelect('request.service', 'service')
      .addSelect(
        `(SELECT COUNT(*) FROM messages unread
          WHERE unread.conversation_id = conversation.id
          AND unread.sender_id <> :userId
          AND unread.read_at IS NULL)`,
        'unread_count'
      )
      .where('conversation.clientId = :userId OR conversation.professionalId = :userId', { userId })
      .orderBy('conversation.lastMessageAt', 'DESC', 'NULLS LAST')
      .addOrderBy('conversation.createdAt', 'DESC')
      .getRawAndEntities();

    return result.entities.map((conversation) => {
      const raw = result.raw.find((row: Record<string, unknown>) => row.conversation_id === conversation.id);
      const otherUser = conversation.clientId === userId ? conversation.professional : conversation.client;
      return {
        id: conversation.id,
        orderId: conversation.orderId,
        service: { id: conversation.order.request.service.id, name: conversation.order.request.service.name },
        orderStatus: conversation.order.status,
        isWritable: isConversationWritable(conversation.order.status),
        otherUser: {
          id: otherUser.id,
          name: otherUser.name,
          profilePhotoMediaId: otherUser.profile?.profilePhotoMediaId || null
        },
        unreadCount: Number(raw?.unread_count || 0),
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt
      };
    });
  }

  async findMessages(conversationId: string, userId: string, before?: string) {
    await this.findAccessibleConversation(conversationId, userId);
    const query = this.messagesRepository
      .createQueryBuilder('message')
      .where('message.conversationId = :conversationId', { conversationId })
      .orderBy('message.createdAt', 'DESC')
      .take(50);
    if (before) {
      const beforeDate = new Date(before);
      if (Number.isNaN(beforeDate.getTime())) {
        throw new ConflictException('O cursor de mensagens é inválido.');
      }
      query.andWhere('message.createdAt < :beforeDate', { beforeDate });
    }
    const messages = await query.getMany();
    return messages.reverse();
  }

  async sendMessage(conversationId: string, senderId: string, dto: SendMessageDto) {
    validateMessage(dto);
    return this.dataSource.transaction(async (manager) => {
      const conversation = await manager.findOne(Conversation, {
        where: { id: conversationId },
        lock: { mode: 'pessimistic_write' }
      });
      if (!conversation) {
        throw new NotFoundException('Conversa não encontrada.');
      }
      this.assertParticipant(conversation.clientId, conversation.professionalId, senderId);
      const order = await manager.findOne(Order, {
        where: { id: conversation.orderId },
        lock: { mode: 'pessimistic_read' }
      });
      if (!order) {
        throw new NotFoundException('Pedido associado à conversa não encontrado.');
      }
      if (!isConversationWritable(order.status)) {
        throw new ConflictException(
          order.status === OrderStatus.Completed
            ? 'Este serviço foi concluído. A conversa está disponível somente para consulta.'
            : 'Este serviço foi encerrado. A conversa está disponível somente para consulta.'
        );
      }
      const recipientId =
        conversation.clientId === senderId ? conversation.professionalId : conversation.clientId;
      const blockExists = await manager
        .createQueryBuilder(UserBlock, 'block')
        .where(
          '(block.blockerId = :senderId AND block.blockedId = :recipientId) OR (block.blockerId = :recipientId AND block.blockedId = :senderId)',
          { senderId, recipientId }
        )
        .getExists();
      if (blockExists) {
        throw new ForbiddenException('Não é possível enviar mensagens nesta conversa.');
      }

      let attachment = null;
      if (dto.type === MessageType.Image && dto.mediaId) {
        const media = await this.storageService.attachToContext(
          dto.mediaId,
          senderId,
          MediaPurpose.ChatAttachment,
          conversationId,
          manager
        );
        attachment = {
          mediaId: media.id,
          objectKey: media.objectKey,
          fileName: media.fileName,
          contentType: media.contentType,
          size: media.size
        };
      }
      const message = manager.create(Message, {
        conversationId,
        senderId,
        type: dto.type,
        content: dto.content?.trim() || null,
        attachment,
        budgetAmount: dto.budgetAmount === undefined ? null : dto.budgetAmount.toFixed(2),
        readAt: null
      });
      const savedMessage = await manager.save(message);
      conversation.lastMessageAt = savedMessage.createdAt;
      await manager.save(conversation);
      await createNotification(manager, {
        userId: recipientId,
        type: NotificationType.NewMessage,
        title: 'Nova mensagem',
        body:
          dto.type === MessageType.Budget
            ? 'Você recebeu um novo orçamento.'
            : 'Você recebeu uma nova mensagem.',
        actionUrl: '/conversas'
      });
      return savedMessage;
    });
  }

  async markConversationRead(conversationId: string, userId: string) {
    await this.findAccessibleConversation(conversationId, userId);
    const readAt = new Date();
    await this.messagesRepository
      .createQueryBuilder()
      .update(Message)
      .set({ readAt })
      .where('conversation_id = :conversationId', { conversationId })
      .andWhere('sender_id <> :userId', { userId })
      .andWhere('read_at IS NULL')
      .execute();
    return { readAt };
  }

  async updatePresence(userId: string, conversationId: string | null, isTyping: boolean) {
    if (conversationId) {
      await this.findAccessibleConversation(conversationId, userId);
    }
    const now = new Date();
    await this.presenceRepository.upsert(
      {
        userId,
        typingConversationId: isTyping ? conversationId : null,
        typingExpiresAt: isTyping ? new Date(now.getTime() + typingLifetimeMilliseconds) : null,
        lastSeenAt: now
      },
      ['userId']
    );
    return { lastSeenAt: now };
  }

  async updateHeartbeat(userId: string) {
    const now = new Date();
    await this.presenceRepository.upsert(
      {
        userId,
        typingConversationId: null,
        typingExpiresAt: null,
        lastSeenAt: now
      },
      ['userId']
    );
    return { lastSeenAt: now };
  }

  async findPresence(conversationId: string, userId: string) {
    const conversation = await this.findAccessibleConversation(conversationId, userId);
    const otherUserId =
      conversation.clientId === userId ? conversation.professionalId : conversation.clientId;
    const presence = await this.presenceRepository.findOne({ where: { userId: otherUserId } });
    const now = Date.now();
    return {
      isOnline: Boolean(presence && now - presence.lastSeenAt.getTime() <= onlineThresholdMilliseconds),
      isTyping: Boolean(
        presence?.typingConversationId === conversationId &&
        presence.typingExpiresAt &&
        presence.typingExpiresAt.getTime() > now
      ),
      lastSeenAt: presence?.lastSeenAt || null
    };
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new ConflictException('Você não pode bloquear a própria conta.');
    }
    await this.blocksRepository.upsert({ blockerId, blockedId }, ['blockerId', 'blockedId']);
    return { isBlocked: true };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await this.blocksRepository.delete({ blockerId, blockedId });
    return { isBlocked: false };
  }

  findNotifications(userId: string) {
    return this.notificationsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50
    });
  }

  registerPushDevice(userId: string, dto: RegisterPushDeviceDto) {
    return this.pushNotificationService.registerDevice(userId, dto.token, dto.platform);
  }

  unregisterPushDevice(userId: string, token: string) {
    return this.pushNotificationService.unregisterDevice(userId, token);
  }

  async markNotificationRead(notificationId: string, userId: string) {
    const notification = await this.notificationsRepository.findOne({
      where: { id: notificationId, userId }
    });
    if (!notification) {
      throw new NotFoundException('Notificação não encontrada.');
    }
    notification.readAt = notification.readAt || new Date();
    return this.notificationsRepository.save(notification);
  }

  async createContactMessage(dto: CreateContactMessageDto) {
    const contactMessage = this.contactMessagesRepository.create({
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      phone: dto.phone.trim(),
      subject: dto.subject.trim(),
      message: dto.message.trim()
    });
    return this.contactMessagesRepository.save(contactMessage);
  }

  findContactMessages() {
    return this.contactMessagesRepository.find({
      order: { createdAt: 'DESC' },
      take: 100
    });
  }

  private async findAccessibleConversation(conversationId: string, userId: string) {
    const conversation = await this.conversationsRepository.findOne({ where: { id: conversationId } });
    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada.');
    }
    this.assertParticipant(conversation.clientId, conversation.professionalId, userId);
    return conversation;
  }

  private assertParticipant(clientId: string, professionalId: string, userId: string) {
    if (clientId !== userId && professionalId !== userId) {
      throw new ForbiddenException('Você não participa desta conversa.');
    }
  }
}
