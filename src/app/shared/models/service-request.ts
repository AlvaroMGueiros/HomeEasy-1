import { OrderStatus } from '../../Usuarios/pedido';
import { RequestAttachment, ServiceRequestAnswer } from './service-request-field';

export enum ServiceUrgency {
  Flexible = 'flexible',
  ThisWeek = 'this_week',
  Urgent = 'urgent'
}

export enum ServiceProposalStatus {
  Sent = 'sent',
  Accepted = 'accepted',
  Rejected = 'rejected',
  Withdrawn = 'withdrawn',
  Expired = 'expired'
}

export interface OwnProposal { id: string; requestId: string; price: number; status: ServiceProposalStatus; request: { service?: { name: string }; city: string; state: string }; }

export class ServiceRequest {
  id?: string;
  clientId?: string;
  serviceId?: string;
  preferredProfessionalId?: string;
  serviceName?: string;
  category?: string;
  description?: string;
  urgency?: ServiceUrgency;
  preferredDate?: string;
  preferredTime?: string;
  address?: string;
  city?: string;
  state?: string;
  budgetMinimum?: number;
  budgetMaximum?: number;
  answers?: ServiceRequestAnswer[];
  attachments?: RequestAttachment[];
  status?: OrderStatus;
  proposalCount?: number;
  maximumProposals?: number;
  hasSubmittedProposal?: boolean;
  selectedProposalId?: string;
  selectedProfessionalId?: string;
  agreedPrice?: number;
  createdAt?: any;
  updatedAt?: any;
  expiresAt?: any;
}

export class ServiceProposal {
  id?: string;
  requestId?: string;
  professionalId?: string;
  professionalName?: string;
  professionalVerified?: boolean;
  professionalRating?: number;
  professionalCompletedServices?: number;
  price?: number;
  message?: string;
  estimatedDuration?: string;
  estimatedDurationMinutes?: number;
  materialsIncluded?: boolean;
  travelFee?: number;
  paymentMethods?: string[];
  validUntil?: any;
  status?: ServiceProposalStatus;
  createdAt?: any;
  updatedAt?: any;
}
