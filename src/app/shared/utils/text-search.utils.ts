const serviceSearchAliases: Array<{ keywords: string[]; aliases: string[] }> = [
  { keywords: ['baba'], aliases: ['crianca', 'cuidadora', 'cuidador', 'infantil'] },
  { keywords: ['cozinheiro', 'cozinheira'], aliases: ['cozinha', 'chef', 'comida', 'alimentacao'] },
  { keywords: ['lavadeira', 'lavanderia'], aliases: ['roupa', 'lavar', 'passar'] },
  { keywords: ['motorista'], aliases: ['transporte', 'carro', 'viagem'] },
  { keywords: ['seguranca'], aliases: ['vigilante', 'protecao'] },
  { keywords: ['limpeza', 'faxina', 'diarista'], aliases: ['casa', 'domestica', 'organizacao'] },
  { keywords: ['eletricista'], aliases: ['eletrica', 'energia', 'tomada', 'iluminacao'] },
  { keywords: ['encanador'], aliases: ['hidraulica', 'vazamento', 'torneira'] },
  { keywords: ['pintor', 'pintura'], aliases: ['parede', 'tinta'] },
  { keywords: ['jardineiro', 'jardinagem'], aliases: ['jardim', 'poda', 'paisagismo'] },
  { keywords: ['pedreiro'], aliases: ['obra', 'construcao', 'alvenaria'] },
  { keywords: ['marceneiro', 'carpinteiro'], aliases: ['moveis', 'madeira'] }
];

export function normalizeSearchText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesServiceSearch(serviceName: string, searchTerm: string): boolean {
  const normalizedSearchTerm = normalizeSearchText(searchTerm);

  if (!normalizedSearchTerm) {
    return true;
  }

  const normalizedServiceName = normalizeSearchText(serviceName);
  const searchableTerms = [normalizedServiceName];

  for (const aliasGroup of serviceSearchAliases) {
    const matchesAliasGroup = aliasGroup.keywords.some(keyword => normalizedServiceName.indexOf(keyword) !== -1);
    if (matchesAliasGroup) {
      searchableTerms.push(aliasGroup.aliases.join(' '));
    }
  }

  const searchableText = searchableTerms.join(' ');
  const searchTokens = normalizedSearchTerm.split(' ');

  return searchTokens.every(searchToken => searchableText.indexOf(searchToken) !== -1);
}
