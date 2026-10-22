import { resolveVerifiedSubscription, RevenueCatSubscriber, toSubscriptionStatus } from './subscription.utils';

describe('Verified Google Play entitlements', () => {
  const now = Date.parse('2026-10-22T12:00:00Z');
  const expires = new Date(now + 86400000).toISOString();
  function snapshot(overrides = {}): RevenueCatSubscriber {
    return { subscriber: { entitlements: { homeEasyPlus: { product_identifier: 'homeeasy_plus_monthly', expires_date: expires } }, subscriptions: { homeeasy_plus_monthly: { store: 'play_store', is_sandbox: false, ...overrides } } } };
  }
  function resolve(response: RevenueCatSubscriber, sandbox = false) { return resolveVerifiedSubscription(response, 'homeEasyPlus', 'homeeasy_plus_monthly', sandbox, now); }
  it('grants only a verified, nonexpired Google Play subscription', () => {
    expect(resolve(snapshot())).toMatchObject({ isActive: true, willRenew: true, expiresAt: new Date(expires) });
    expect(resolve({})).toMatchObject({ isActive: false, productId: null });
  });
  it.each([{ store: 'app_store' }, { store: 'promotional' }, { refunded_at: expires }, { is_sandbox: true }])('does not grant production access for %j', changes => {
    expect(resolve(snapshot(changes)).isActive).toBe(false);
  });
  it('allows sandbox only when explicitly enabled', () => { expect(resolve(snapshot({ is_sandbox: true }), true).isActive).toBe(true); });
  it('preserves access through the paid period after cancellation', () => {
    expect(resolve(snapshot({ unsubscribe_detected_at: new Date(now).toISOString() }))).toMatchObject({ isActive: true, willRenew: false });
  });
  it('honors an actual grace period but not billing failure alone', () => {
    const response = snapshot({ billing_issues_detected_at: expires, grace_period_expires_date: expires });
    response.subscriber!.entitlements!.homeEasyPlus.expires_date = new Date(now - 1).toISOString();
    expect(resolve(response)).toMatchObject({ isActive: true, willRenew: false });
    delete response.subscriber!.subscriptions!.homeeasy_plus_monthly.grace_period_expires_date;
    expect(resolve(response).isActive).toBe(false);
  });
  it('accepts a base-plan suffix only for the configured product', () => {
    const response = snapshot();
    response.subscriber!.entitlements!.homeEasyPlus.product_identifier = 'homeeasy_plus_monthly:monthly';
    expect(resolve(response).isActive).toBe(true);
    response.subscriber!.entitlements!.homeEasyPlus.product_identifier = 'another_product:monthly';
    expect(resolve(response).isActive).toBe(false);
  });
  it('downgrades expired or disabled access without deleting content', () => {
    const expired = { isActive: true, expiresAt: new Date(0), willRenew: true };
    expect(toSubscriptionStatus(expired)).toMatchObject({ active: false, publicationLimit: 4, portfolioLimit: 30 });
    expect(toSubscriptionStatus({ ...expired, expiresAt: new Date(Date.now() + 100000) })).toMatchObject({ active: true, publicationLimit: 12, portfolioLimit: 60 });
    expect(toSubscriptionStatus(expired, false).enabled).toBe(false);
  });
});
