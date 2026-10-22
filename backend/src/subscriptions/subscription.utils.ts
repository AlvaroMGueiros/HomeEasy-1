export interface RevenueCatSubscriber {
  subscriber?: {
    entitlements?: Record<string, { expires_date?: string | null; grace_period_expires_date?: string | null; product_identifier?: string }>;
    subscriptions?: Record<string, { store?: string; is_sandbox?: boolean; unsubscribe_detected_at?: string | null; refunded_at?: string | null; billing_issues_detected_at?: string | null; expires_date?: string | null; grace_period_expires_date?: string | null }>;
  };
}

export function resolveVerifiedSubscription(response: RevenueCatSubscriber, entitlementId: string, productId: string, allowSandbox: boolean, now = Date.now()) {
  const entitlement = response.subscriber?.entitlements?.[entitlementId];
  const entitlementProduct = entitlement?.product_identifier || '';
  const subscription = response.subscriber?.subscriptions?.[entitlementProduct] || response.subscriber?.subscriptions?.[productId];
  const expiration = Date.parse(entitlement?.grace_period_expires_date || subscription?.grace_period_expires_date || entitlement?.expires_date || '');
  const eligible = entitlementProduct.split(':')[0] === productId && subscription?.store === 'play_store' &&
    (allowSandbox || subscription.is_sandbox === false) && !subscription.refunded_at && Number.isFinite(expiration);
  return {
    isActive: Boolean(eligible && expiration > now),
    expiresAt: eligible ? new Date(expiration) : null,
    productId: eligible ? productId : null,
    willRenew: Boolean(eligible && !subscription?.unsubscribe_detected_at && !subscription?.billing_issues_detected_at && expiration > now),
    verifiedAt: new Date(now)
  };
}

export function isSubscriptionActive(subscription?: { isActive: boolean; expiresAt: Date | null } | null, now = Date.now()) {
  return Boolean(subscription?.isActive && subscription.expiresAt && subscription.expiresAt.getTime() > now);
}

export function toSubscriptionStatus(subscription?: { isActive: boolean; expiresAt: Date | null; willRenew: boolean } | null, enabled = true) {
  const active = enabled && isSubscriptionActive(subscription);
  return { enabled, active, expiresAt: enabled ? subscription?.expiresAt || null : null, willRenew: active && Boolean(subscription?.willRenew), publicationLimit: active ? 12 : 4, portfolioLimit: active ? 60 : 30 };
}
