import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';

import { ProfessionalSubscription } from './professional-subscription.entity';
import { SubscriptionsService } from './subscriptions.service';

describe('Subscription provider boundary', () => {
  const userId = '319ce16e-e842-4b46-a3d3-3e28a6b3e53e';
  function setup(enabled = true) {
    const config = new ConfigService({ HOME_EASY_PLUS_ENABLED: String(enabled), REVENUECAT_SECRET_KEY: 'testSecret', REVENUECAT_WEBHOOK_AUTH: 'testWebhook' });
    const manager = { findOne: jest.fn().mockResolvedValue({ id: userId }), upsert: jest.fn() };
    const repository = { findOneBy: jest.fn().mockResolvedValue(null) };
    const service = new SubscriptionsService(config, { transaction: jest.fn(work => work(manager)) } as unknown as DataSource, repository as unknown as Repository<ProfessionalSubscription>);
    return { service, manager, repository };
  }
  afterEach(() => jest.restoreAllMocks());
  it('does not touch provider or database while the feature is disabled', async () => {
    const { service, repository } = setup(false);
    expect(await service.findOwn(userId)).toMatchObject({ enabled: false, active: false });
    expect(repository.findOneBy).not.toHaveBeenCalled();
    await expect(service.reconcile(userId)).rejects.toThrow('ainda não está disponível');
  });
  it('rejects forged webhooks before trusting their status', async () => {
    const { service, manager } = setup();
    await expect(service.receiveWebhook('forged', { event: { app_user_id: userId, expiration_at_ms: 9999999999999 } })).rejects.toThrow('Autorização');
    expect(manager.upsert).not.toHaveBeenCalled();
  });
  it('requeries provider state for repeated or out-of-order events and transferred accounts', async () => {
    const { service } = setup();
    const reconcile = jest.spyOn(service, 'reconcile').mockResolvedValue({ enabled: true, active: false, expiresAt: null, willRenew: false, publicationLimit: 4, portfolioLimit: 30 });
    await service.receiveWebhook('testWebhook', { event: { type: 'TRANSFER', transferred_from: [userId], transferred_to: [userId] } });
    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(reconcile).toHaveBeenCalledWith(userId);
  });
  it('never grants access based on a malformed provider response', async () => {
    const { service, manager } = setup();
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({}) } as Response);
    await expect(service.reconcile(userId)).rejects.toThrow('não contém o cadastro');
    expect(manager.upsert).not.toHaveBeenCalled();
  });
});
