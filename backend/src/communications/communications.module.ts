import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminGuard } from '../auth/admin.guard';
import { Order } from '../marketplace/order.entity';
import { StorageModule } from '../storage/storage.module';
import { CommunicationsController } from './communications.controller';
import { CommunicationsService } from './communications.service';
import { ContactMessage } from './contact-message.entity';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { Notification } from './notification.entity';
import { NotificationPreference } from './notification-preference.entity';
import { NotificationSubscriber } from './notification.subscriber';
import { PushDevice } from './push-device.entity';
import { PushNotificationService } from './push-notification.service';
import { UserBlock } from './user-block.entity';
import { UserPresence } from './user-presence.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      Message,
      Notification,
      NotificationPreference,
      PushDevice,
      UserBlock,
      UserPresence,
      Order,
      ContactMessage
    ]),
    StorageModule
  ],
  controllers: [CommunicationsController],
  providers: [CommunicationsService, PushNotificationService, NotificationSubscriber, AdminGuard]
})
export class CommunicationsModule {}
