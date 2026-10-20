import 'reflect-metadata';
import { Repository } from 'typeorm';
import { NotificationType } from './communication.enums';
import { Notification } from './notification.entity';
import { NotificationPreference } from './notification-preference.entity';
import { defaultNotificationPreferences } from './notification-preference.utils';
import { PushDevice } from './push-device.entity';
import { PushNotificationService } from './push-notification.service';

describe('Push preference ownership and delivery', () => {
  afterEach(() => jest.restoreAllMocks());
  it('returns defaults without leaking entity fields', async () => {
    const preferences = { findOne: jest.fn().mockResolvedValue({ ...defaultNotificationPreferences, userId: 'user', user: { email: 'private' } }) };
    const service = new PushNotificationService({} as Repository<PushDevice>, preferences as unknown as Repository<NotificationPreference>);
    expect(await service.findPreferences('user')).toEqual(defaultNotificationPreferences);
    expect(preferences.findOne).toHaveBeenCalledWith({ where: { userId: 'user' } });
  });
  it('binds updates to the authenticated account and ignores an injected userId', async () => {
    const preferences = { findOne: jest.fn().mockResolvedValue(null), upsert: jest.fn() };
    const service = new PushNotificationService({} as Repository<PushDevice>, preferences as unknown as Repository<NotificationPreference>);
    await service.updatePreferences('owner', { ...defaultNotificationPreferences, userId: 'victim' } as typeof defaultNotificationPreferences);
    expect(preferences.upsert).toHaveBeenCalledWith({ ...defaultNotificationPreferences, userId: 'owner' }, ['userId']);
  });
  it('does not send or query devices for a muted message', async () => {
    const devices = { find: jest.fn() };
    const preferences = { findOne: jest.fn().mockResolvedValue({ ...defaultNotificationPreferences, messages: false }) };
    const fetchSpy = jest.spyOn(global, 'fetch');
    const service = new PushNotificationService(devices as unknown as Repository<PushDevice>, preferences as unknown as Repository<NotificationPreference>);
    await service.sendNotification({ userId: 'owner', type: NotificationType.NewMessage } as Notification);
    expect(devices.find).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
