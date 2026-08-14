import { normalizeSearchText } from './text-search.utils';

export type ServiceIconType =
  'babysitting' |
  'cooking' |
  'laundry' |
  'driving' |
  'security' |
  'cleaning' |
  'electrical' |
  'plumbing' |
  'painting' |
  'garden' |
  'carpentry' |
  'masonry' |
  'renovation' |
  'domestic' |
  'tools';

const serviceIconKeywords: Array<{ icon: ServiceIconType; keywords: string[] }> = [
  { icon: 'babysitting', keywords: ['baba', 'cuidador infantil', 'cuidadora infantil'] },
  { icon: 'cooking', keywords: ['cozinheir', 'chef', 'cozinha'] },
  { icon: 'laundry', keywords: ['lavadeir', 'lavanderia', 'passadeir'] },
  { icon: 'driving', keywords: ['motorista', 'transporte'] },
  { icon: 'security', keywords: ['seguranca', 'vigilante'] },
  { icon: 'cleaning', keywords: ['limpeza', 'faxina', 'diarista', 'domestica', 'organizacao'] },
  { icon: 'electrical', keywords: ['eletric', 'energia', 'tomada', 'iluminacao'] },
  { icon: 'plumbing', keywords: ['encan', 'hidraulic', 'vazamento', 'torneira'] },
  { icon: 'painting', keywords: ['pint', 'tinta'] },
  { icon: 'garden', keywords: ['jardin', 'paisag', 'poda'] },
  { icon: 'carpentry', keywords: ['marcen', 'carpint', 'moveis'] },
  { icon: 'masonry', keywords: ['pedreir', 'alvenaria', 'construcao'] },
  { icon: 'renovation', keywords: ['reforma', 'reparo', 'manutencao'] },
  { icon: 'domestic', keywords: ['domestic', 'casa', 'lar'] }
];

export function resolveServiceIcon(serviceName: string): ServiceIconType {
  const normalizedServiceName = normalizeSearchText(serviceName);

  for (const serviceIconKeyword of serviceIconKeywords) {
    for (const keyword of serviceIconKeyword.keywords) {
      if (normalizedServiceName.indexOf(keyword) !== -1) {
        return serviceIconKeyword.icon;
      }
    }
  }

  return 'tools';
}
