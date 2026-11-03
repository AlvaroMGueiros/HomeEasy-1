import { resolveServiceIcon, ServiceIconType } from './service-icon.utils';
import { normalizeSearchText } from './text-search.utils';

const serviceDescriptions: Record<ServiceIconType, string> = {
  animalCare: 'Companhia e cuidados para seus animais.',
  elderlyCare: 'Apoio e companhia para pessoas idosas.',
  airConditioning: 'Instalação e cuidados com a climatização.',
  pestControl: 'Controle de pragas para sua casa.',
  solar: 'Instalação e manutenção de energia solar.',
  postConstruction: 'Limpeza para deixar a obra pronta para uso.',
  furnitureAssembly: 'Montagem e ajustes dos seus móveis.',
  locksmith: 'Reparos e instalação de fechaduras.',
  cameras: 'Instalação de câmeras e monitoramento.',
  appliances: 'Reparos em eletrodomésticos.',
  moving: 'Transporte de móveis e mudanças.',
  drywall: 'Divisórias, forros e acabamentos em gesso.',
  glazing: 'Instalação e reparos em vidros e espelhos.',
  roofing: 'Cuidados com telhados e calhas.',
  architecture: 'Projetos para transformar seus ambientes.',
  babysitting: 'Cuidado e companhia para as crianças.',
  cooking: 'Refeições preparadas para o seu dia a dia.',
  laundry: 'Roupas limpas e bem cuidadas.',
  driving: 'Transporte para a sua rotina.',
  security: 'Proteção para você e sua família.',
  cleaning: 'Limpeza e organização para sua casa.',
  electrical: 'Instalações e reparos elétricos.',
  plumbing: 'Reparos em torneiras, canos e vazamentos.',
  painting: 'Pintura e acabamento para renovar ambientes.',
  garden: 'Cuidados com seu jardim e suas plantas.',
  carpentry: 'Móveis e reparos em madeira.',
  masonry: 'Construções, reformas e manutenção.',
  renovation: 'Reparos e melhorias para sua casa.',
  domestic: 'Ajuda com os cuidados da sua casa.',
  tools: 'Encontre profissionais para este serviço.'
};

export function resolveServiceDescription(serviceName: string): string {
  const normalizedName = normalizeSearchText(serviceName);
  if (normalizedName.includes('arquitet')) return 'Projetos para aproveitar melhor seu espaço.';
  if (normalizedName.includes('decor')) return 'Ambientes com o seu estilo.';
  return serviceDescriptions[resolveServiceIcon(serviceName)];
}
