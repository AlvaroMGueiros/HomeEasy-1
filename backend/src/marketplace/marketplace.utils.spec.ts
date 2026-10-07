import { BadRequestException } from '@nestjs/common';

import { ServiceRequestFieldType } from '../services/service-request-field.types';
import { OrderStatus, ServiceRequestStatus, ServiceUrgency } from './marketplace.enums';
import {
  canServiceRequestAcceptProposal,
  canServiceRequestReceiveProposal,
  canTransitionOrder,
  validateServiceAnswers,
  resolveOrderStatusTimestamps,
  validateServiceRequest
} from './marketplace.utils';
import { Order } from './order.entity';
import { ServiceRequest } from './service-request.entity';

describe('marketplace rules', () => {
  it('accepts a future time today but rejects past and current times', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-07T19:25:00Z'));
    const request = {
      serviceId: 'cleaning', description: 'Preciso de uma limpeza residencial completa.',
      urgency: ServiceUrgency.Flexible, answers: {}, address: 'Rua de exemplo, 10', city: 'Recife', state: 'PE'
    };
    try {
      expect(() => validateServiceRequest({ ...request, preferredAt: '2026-10-07T17:00:00-03:00' })).not.toThrow();
      expect(() => validateServiceRequest({ ...request, preferredAt: '2026-10-07T16:24:00-03:00' })).toThrow(BadRequestException);
      expect(() => validateServiceRequest({ ...request, preferredAt: '2026-10-07T16:25:00-03:00' })).toThrow(BadRequestException);
    } finally {
      jest.useRealTimers();
    }
  });

  it('rejects an inverted budget range', () => {
    expect(() =>
      validateServiceRequest({
        serviceId: 'cleaning',
        description: 'Preciso de uma limpeza residencial completa.',
        urgency: ServiceUrgency.Flexible,
        answers: {},
        address: 'Rua de exemplo, 10',
        city: 'Recife',
        state: 'PE',
        budgetMinimum: 300,
        budgetMaximum: 100
      })
    ).toThrow(BadRequestException);
  });

  it('stops proposals after the configured limit', () => {
    const request = {
      status: ServiceRequestStatus.ProposalReceived,
      expiresAt: new Date(Date.now() + 60_000),
      proposalCount: 4,
      maximumProposals: 4
    } as ServiceRequest;
    expect(canServiceRequestReceiveProposal(request)).toBe(false);
    expect(canServiceRequestAcceptProposal(request)).toBe(true);
  });

  it('allows either participant to confirm an in-progress order as completed', () => {
    const order = {
      clientId: 'client-id',
      professionalId: 'professional-id',
      status: OrderStatus.InProgress
    } as Order;
    expect(canTransitionOrder(order, 'client-id', OrderStatus.Completed)).toBe(true);
    expect(canTransitionOrder(order, 'professional-id', OrderStatus.Completed)).toBe(true);
  });

  it('requires the configured service-specific answers', () => {
    const requestForm = [
      {
        key: 'propertySize',
        label: 'Metragem do imóvel',
        type: ServiceRequestFieldType.Number,
        required: true,
        minimum: 1
      }
    ];
    expect(() => validateServiceAnswers(requestForm, {})).toThrow(BadRequestException);
    expect(() => validateServiceAnswers(requestForm, { propertySize: 80 })).not.toThrow();
  });
});

describe('order stage timestamps', () => {
  const timestamp = new Date('2026-10-03T12:00:00.000Z');
  it.each([
    [OrderStatus.Scheduled, 'scheduleConfirmedAt'],
    [OrderStatus.InProgress, 'startedAt'],
    [OrderStatus.Completed, 'completedAt']
  ])('records the actual transition to %s', (status, property) => {
    expect(resolveOrderStatusTimestamps(status as OrderStatus, timestamp)).toEqual({ [property]: timestamp });
  });
  it('does not invent stage dates for acceptance or interruptions', () => {
    expect(resolveOrderStatusTimestamps(OrderStatus.Accepted, timestamp)).toEqual({});
    expect(resolveOrderStatusTimestamps(OrderStatus.Disputed, timestamp)).toEqual({});
    expect(resolveOrderStatusTimestamps(OrderStatus.CancelledByClient, timestamp)).toEqual({});
  });
});
