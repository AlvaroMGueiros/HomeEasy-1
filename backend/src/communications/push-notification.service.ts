import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Notification } from './notification.entity';
import { PushDevice } from './push-device.entity';
import { NotificationPreference } from './notification-preference.entity';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { allowsPushNotification, defaultNotificationPreferences } from './notification-preference.utils';

interface ExpoPushTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

@Injectable()
export class PushNotificationService {
  constructor(
    @InjectRepository(PushDevice)
    private readonly pushDevicesRepository: Repository<PushDevice>,
    @InjectRepository(NotificationPreference)
    private readonly preferencesRepository: Repository<NotificationPreference>
  ) {}

  async findPreferences(userId: string): Promise<UpdateNotificationPreferencesDto> {
    const savedPreferences = await this.preferencesRepository.findOne({ where: { userId } });
    if (!savedPreferences) return { ...defaultNotificationPreferences };
    const { pushEnabled, messages, quotes, serviceUpdates, reviews, opportunities } = savedPreferences;
    return { pushEnabled, messages, quotes, serviceUpdates, reviews, opportunities };
  }

  async updatePreferences(userId: string, preferences: UpdateNotificationPreferencesDto) {
    const { pushEnabled, messages, quotes, serviceUpdates, reviews, opportunities } = preferences;
    await this.preferencesRepository.upsert({ userId, pushEnabled, messages, quotes, serviceUpdates, reviews, opportunities }, ['userId']);
    return this.findPreferences(userId);
  }

  async registerDevice(userId: string, token: string, platform: string) {
    const existingDevice = await this.pushDevicesRepository.findOne({ where: { token } });
    const device = existingDevice || this.pushDevicesRepository.create({ token });
    device.userId = userId;
    device.platform = platform;
    device.isActive = true;
    await this.pushDevicesRepository.save(device);
    return { registered: true };
  }

  async unregisterDevice(userId: string, token: string) {
    await this.pushDevicesRepository.update({ userId, token }, { isActive: false });
    return { registered: false };
  }

  async sendNotification(notification: Notification): Promise<void> {
    const preferences = await this.findPreferences(notification.userId);
    if (!allowsPushNotification(preferences, notification.type)) return;
    const devices = await this.pushDevicesRepository.find({
      where: { userId: notification.userId, isActive: true }
    });
    if (!devices.length) return;

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(
        devices.map((device) => ({
          to: device.token,
          sound: 'default',
          channelId: 'default',
          title: notification.title,
          body: notification.body,
          data: { actionUrl: notification.actionUrl }
        }))
      )
    });
    if (!response.ok) return;

    const payload = (await response.json()) as { data?: ExpoPushTicket | ExpoPushTicket[] };
    const tickets = Array.isArray(payload.data) ? payload.data : payload.data ? [payload.data] : [];
    const invalidTokens = devices
      .filter((_, index) => tickets[index]?.details?.error === 'DeviceNotRegistered')
      .map((device) => device.token);
    if (invalidTokens.length) {
      await this.pushDevicesRepository
        .createQueryBuilder()
        .update(PushDevice)
        .set({ isActive: false })
        .where('token IN (:...invalidTokens)', { invalidTokens })
        .execute();
    }
  }
}
