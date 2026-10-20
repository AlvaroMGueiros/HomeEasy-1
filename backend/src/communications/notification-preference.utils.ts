import { NotificationType } from './communication.enums';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

export const defaultNotificationPreferences: UpdateNotificationPreferencesDto = {
  pushEnabled: true, messages: true, quotes: true, serviceUpdates: true, reviews: true, opportunities: true
};

export function allowsPushNotification(preferences: UpdateNotificationPreferencesDto, type: NotificationType) {
  if (!preferences.pushEnabled) return false;
  switch (type) {
    case NotificationType.NewMessage: return preferences.messages;
    case NotificationType.NewProposal: return preferences.quotes;
    case NotificationType.NewServiceRequest: return preferences.opportunities;
    case NotificationType.ReviewReceived: return preferences.reviews;
    default: return preferences.serviceUpdates;
  }
}
