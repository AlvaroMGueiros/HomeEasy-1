import { NotificationType } from './communication.enums';
import { allowsPushNotification, defaultNotificationPreferences } from './notification-preference.utils';

describe('Notification preferences', () => {
  it.each(Object.values(NotificationType))('enables %s by default and respects the master switch', type => {
    expect(allowsPushNotification(defaultNotificationPreferences, type)).toBe(true);
    expect(allowsPushNotification({ ...defaultNotificationPreferences, pushEnabled: false }, type)).toBe(false);
  });
  it.each([
    ['messages', NotificationType.NewMessage], ['quotes', NotificationType.NewProposal],
    ['opportunities', NotificationType.NewServiceRequest], ['reviews', NotificationType.ReviewReceived],
    ['serviceUpdates', NotificationType.DisputeUpdated], ['serviceUpdates', NotificationType.ProposalAccepted], ['serviceUpdates', NotificationType.OrderUpdated]
  ] as const)('disables only the selected category %s for %s', (category, type) => {
    expect(allowsPushNotification({ ...defaultNotificationPreferences, [category]: false }, type)).toBe(false);
    if (category !== 'messages') expect(allowsPushNotification({ ...defaultNotificationPreferences, [category]: false }, NotificationType.NewMessage)).toBe(true);
  });
});
