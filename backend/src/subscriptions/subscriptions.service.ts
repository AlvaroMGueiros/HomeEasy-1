import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { timingSafeEqual } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';

import { User } from '../users/user.entity';
import { ProfessionalSubscription } from './professional-subscription.entity';
import { resolveVerifiedSubscription, RevenueCatSubscriber, toSubscriptionStatus } from './subscription.utils';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly config: ConfigService, private readonly dataSource: DataSource,
    @InjectRepository(ProfessionalSubscription) private readonly subscriptions: Repository<ProfessionalSubscription>) {}

  get enabled() { return this.config.get<string>('HOME_EASY_PLUS_ENABLED') === 'true' && Boolean(this.config.get<string>('REVENUECAT_SECRET_KEY')); }

  async findOwn(userId: string) {
    if (!this.enabled) return toSubscriptionStatus(null, false);
    const subscription = await this.subscriptions.findOneBy({ userId });
    if (subscription && Date.now() - subscription.verifiedAt.getTime() > 15 * 60 * 1000) return this.reconcile(userId);
    return toSubscriptionStatus(subscription);
  }

  async reconcile(userId: string) {
    if (!this.enabled) throw new ServiceUnavailableException('A assinatura HomeEasy+ ainda não está disponível.');
    // A per-user transaction lock serializes provider reads and writes, including delayed webhook deliveries.
    await this.dataSource.transaction(async manager => {
      const user = await manager.findOne(User, { where: { id: userId, isActive: true }, lock: { mode: 'pessimistic_write' } });
      if (!user) return;
      let response: Response;
      try {
        response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
          headers: { Authorization: `Bearer ${this.config.getOrThrow<string>('REVENUECAT_SECRET_KEY')}` }, signal: AbortSignal.timeout(8000)
        });
      } catch { throw new ServiceUnavailableException('Não foi possível confirmar a assinatura na loja. Tente novamente.'); }
      if (!response.ok) throw new ServiceUnavailableException('A loja não confirmou a assinatura. Tente novamente em instantes.');
      let subscriber: RevenueCatSubscriber;
      try { subscriber = await response.json() as RevenueCatSubscriber; }
      catch { throw new ServiceUnavailableException('A confirmação da assinatura retornou uma resposta inválida.'); }
      if (!subscriber.subscriber) throw new ServiceUnavailableException('A confirmação da assinatura não contém o cadastro da loja.');
      const verified = resolveVerifiedSubscription(subscriber, this.config.get<string>('REVENUECAT_ENTITLEMENT_ID', 'homeEasyPlus'),
        this.config.get<string>('GOOGLE_PLAY_PLUS_PRODUCT_ID', 'homeeasy_plus_monthly'), this.config.get<string>('REVENUECAT_ALLOW_SANDBOX') === 'true');
      await manager.upsert(ProfessionalSubscription, { userId, ...verified }, ['userId']);
    });
    const subscription = await this.subscriptions.findOneBy({ userId });
    return toSubscriptionStatus(subscription);
  }

  async receiveWebhook(authorization: string, body: unknown) {
    const secret = this.config.get<string>('REVENUECAT_WEBHOOK_AUTH', '');
    const expected = Buffer.from(secret);
    const supplied = Buffer.from(authorization);
    if (!secret || expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new UnauthorizedException('Autorização do webhook inválida.');
    if (!body || typeof body !== 'object' || !('event' in body)) return { received: true };
    const event = body.event as { app_user_id?: unknown; transferred_from?: unknown; transferred_to?: unknown; type?: unknown } | null;
    if (!event || event.type === 'TEST') return { received: true };
    const candidates: unknown[] = [event.app_user_id];
    if (Array.isArray(event.transferred_from)) candidates.push(...event.transferred_from);
    if (Array.isArray(event.transferred_to)) candidates.push(...event.transferred_to);
    const userIds = new Set(candidates.filter((candidate): candidate is string => typeof candidate === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)));
    if (userIds.size > 20) throw new ServiceUnavailableException('O evento contém contas demais para confirmar.');
    // Never trust entitlement dates/status in a webhook: reconcile the current provider state.
    for (const userId of userIds) await this.reconcile(userId);
    return { received: true };
  }
}
