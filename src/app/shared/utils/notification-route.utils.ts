export function resolveNotificationRoute(actionUrl?: string) {
  if (!actionUrl) return '/meus-servicos';
  const normalizedUrl = actionUrl.replace(/^homeeasy:\/\//, '/');
  if (/^\/(solicitacoes|oportunidades)\/[a-zA-Z0-9-]+$/.test(normalizedUrl)) return normalizedUrl;
  const legacyOrderMatch = normalizedUrl.match(/^\/usuario\/[a-zA-Z0-9-]+\/pedidos-(?:feitos|recebidos)\/([a-zA-Z0-9-]+)$/);
  if (legacyOrderMatch) return '/atendimentos/' + legacyOrderMatch[1];
  const legacyProfileMatch = normalizedUrl.match(/^\/usuario\/([a-zA-Z0-9-]+)$/);
  if (legacyProfileMatch) return '/profissionais/' + legacyProfileMatch[1];
  if (normalizedUrl === '/conversas') return '/conversas';
  const orderMatch = normalizedUrl.match(/^\/(?:marketplace\/)?orders\/([a-zA-Z0-9-]+)$/);
  if (orderMatch) return '/atendimentos/' + orderMatch[1];
  const requestMatch = normalizedUrl.match(/^\/(?:marketplace\/)?requests\/([a-zA-Z0-9-]+)$/);
  if (requestMatch) return '/solicitacoes/' + requestMatch[1];
  const professionalMatch = normalizedUrl.match(/^\/professionals\/([a-zA-Z0-9-]+)$/);
  if (professionalMatch) return '/profissionais/' + professionalMatch[1];
  if (normalizedUrl === '/conversations') return '/conversas';
  return '/meus-servicos';
}
