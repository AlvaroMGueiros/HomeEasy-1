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
  'animalCare' |
  'elderlyCare' |
  'airConditioning' |
  'pestControl' |
  'solar' |
  'postConstruction' |
  'furnitureAssembly' |
  'locksmith' |
  'cameras' |
  'appliances' |
  'moving' |
  'drywall' |
  'glazing' |
  'roofing' |
  'architecture' |
  'tools';

const serviceIconKeywords: Array<{ icon: ServiceIconType; keywords: string[] }> = [
  { icon: 'animalCare', keywords: ['cuidador de animais', 'animais', 'animal', 'pet'] },
  { icon: 'elderlyCare', keywords: ['cuidador de idosos', 'idoso', 'geriatria', 'enfermagem'] },
  { icon: 'airConditioning', keywords: ['ar condicionado', 'ar-condicionado', 'climatizacao', 'ventilador'] },
  { icon: 'pestControl', keywords: ['dedetizacao', 'pragas', 'insetos', 'cupim'] },
  { icon: 'solar', keywords: ['energia solar', 'solar', 'fotovoltaic'] },
  { icon: 'postConstruction', keywords: ['limpeza pos obra', 'pos-obra', 'entulho'] },
  { icon: 'furnitureAssembly', keywords: ['montagem de moveis', 'montador'] },
  { icon: 'locksmith', keywords: ['chaveiro', 'fechadura', 'tranca'] },
  { icon: 'cameras', keywords: ['cameras', 'camera', 'cftv', 'alarme'] },
  { icon: 'appliances', keywords: ['eletrodomestic', 'geladeira', 'fogao', 'maquina de lavar'] },
  { icon: 'moving', keywords: ['mudanca', 'frete', 'carreto'] },
  { icon: 'drywall', keywords: ['gesso', 'drywall', 'sanca'] },
  { icon: 'glazing', keywords: ['vidraceiro', 'vidro', 'espelho'] },
  { icon: 'roofing', keywords: ['telhadista', 'telhado', 'calha', 'infiltracao'] },
  { icon: 'architecture', keywords: ['arquiteto', 'arquitetura', 'decorador', 'decoracao'] },
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
