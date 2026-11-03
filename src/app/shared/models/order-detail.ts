import { OrderStatus } from '../../Usuarios/pedido';
import { ModerationStatus } from './moderation-status';
import { ProfessionalProfile, ProfessionalReview } from './professional-profile';

export interface MarketplaceOrder {
  id: string; requestId: string; clientId: string; professionalId: string;
  agreedPrice: number | string; status: OrderStatus; createdAt: string;
  scheduledAt?: string; startedAt?: string; completedAt?: string;
  cancellationReason?: string; cancellationDetails?: string;
  request: { serviceId: string; service?: { name: string }; description: string; address?: string; city: string; state: string; preferredAt?: string; };
  proposal: { price: number | string; message: string; travelFee: number | string; estimatedDurationMinutes: number; materialsIncluded: boolean; paymentMethods: string[]; };
}
export interface OrderDetail extends MarketplaceOrder {
  professional: ProfessionalProfile;
  client: { id: string; name: string; profilePhotoMediaId?: string; };
  review: Pick<ProfessionalReview, 'rating' | 'comment' | 'createdAt'> | null;
}
export enum DisputeReason {
  ServiceNotPerformed = 'service_not_performed', ServiceQuality = 'service_quality', PriceConflict = 'price_conflict',
  PropertyDamage = 'property_damage', Conduct = 'conduct', Other = 'other'
}
export interface OrderDispute { id: string; reason: DisputeReason; description: string; status: ModerationStatus; resolutionNotes?: string; }
