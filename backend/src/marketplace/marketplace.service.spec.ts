import 'reflect-metadata';
import { DataSource, Repository } from 'typeorm';

import { Review } from '../engagement/review.entity';
import { MailService } from '../mail/mail.service';
import { ProfessionalProfile } from '../professionals/professional-profile.entity';
import { ProfessionalsService } from '../professionals/professionals.service';
import { Service } from '../services/service.entity';
import { StorageService } from '../storage/storage.service';
import { MarketplaceService } from './marketplace.service';
import { Order } from './order.entity';
import { OrderStatus } from './marketplace.enums';
import { Proposal } from './proposal.entity';
import { ServiceRequest } from './service-request.entity';

describe('private order details', () => {
  function createService(missingOrder = false) {
    const order = Object.assign(new Order(), {
      id: 'order',
      clientId: 'client',
      professionalId: 'professional',
      status: OrderStatus.Completed,
      professional: {
        userId: 'professional',
        bio: 'Professional presentation',
        phone: 'privatePhone',
        location: { coordinates: [0, 0] },
        services: [],
        user: {
          name: 'Professional',
          passwordHash: 'privatePassword',
          profile: { profilePhotoMediaId: 'photo' }
        }
      },
      client: {
        id: 'client',
        name: 'Client',
        email: 'privateEmail',
        passwordHash: 'privatePassword',
        profile: { profilePhotoMediaId: 'clientPhoto' }
      }
    });
    const orders = { findOne: jest.fn(async () => (missingOrder ? null : order)) };
    const reviews = {
      findOne: jest.fn(async () => ({
        rating: 5,
        comment: 'Atendimento excelente.',
        createdAt: new Date('2026-10-03T13:00:00Z'),
        clientId: 'privateClientId'
      }))
    };
    const database = { getRepository: jest.fn(() => reviews) };
    const professionals = { findMetrics: jest.fn(async () => new Map()) };
    const service = new MarketplaceService(
      database as unknown as DataSource,
      {} as Repository<ServiceRequest>,
      {} as Repository<Proposal>,
      orders as unknown as Repository<Order>,
      {} as Repository<Service>,
      {} as Repository<ProfessionalProfile>,
      {} as StorageService,
      professionals as unknown as ProfessionalsService,
      {} as MailService
    );
    return { service, database, orders, professionals };
  }
  it.each(['client', 'professional'])('returns progress and review details to %s', async (actorId) => {
    const { service, database } = createService();
    const details = await service.findOwnOrder('order', actorId);
    expect(details.status).toBe(OrderStatus.Completed);
    expect(details.review?.rating).toBe(5);
    expect(details.client).toEqual({ id: 'client', name: 'Client', profilePhotoMediaId: 'clientPhoto' });
    expect(database.getRepository).toHaveBeenCalledWith(Review);
    expect(JSON.stringify(details)).not.toMatch(/privatePhone|privatePassword|privateEmail|privateClientId/);
    expect(details.professional).not.toHaveProperty('location');
  });
  it('rejects users outside the order before reading metrics or reviews', async () => {
    const { service, database, professionals } = createService();
    await expect(service.findOwnOrder('order', 'outsider')).rejects.toThrow();
    expect(database.getRepository).not.toHaveBeenCalled();
    expect(professionals.findMetrics).not.toHaveBeenCalled();
  });
  it('returns a specific error for a missing order', async () => {
    const { service } = createService(true);
    await expect(service.findOwnOrder('missing', 'client')).rejects.toThrow('Pedido não encontrado.');
  });
});
