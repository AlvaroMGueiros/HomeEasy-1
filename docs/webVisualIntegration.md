# Integração visual do web

## Navegação

Barra lateral integrada ao cabeçalho, com atalhos para Início, Destaques e Mensagens. As demais rotas estão agrupadas em Contratações, Área profissional, Minha conta e Administração. A administração mantém a condição de papel existente. Submenus usam details/summary nativos, destacam a rota atual e abrem o grupo correspondente. Em telas menores a barra vira um menu recolhível, com fechamento por Escape e conteúdo oculto fora da navegação por teclado.

## Composição

Base compartilhada revisada para títulos proporcionais, seções abertas, listas com divisórias e ações alinhadas. Orçamentos, serviços, notificações, agenda, documentos, suporte e administração usam essa base. Formulários preservam campos e validações. O painel profissional apresenta métricas em uma faixa e atendimentos/propostas em linhas. O perfil separa apresentação, serviços, fotos, disponibilidade e avaliações, sem painéis aninhados. A página inicial prioriza a busca e listas de categorias/profissionais.

O feed usa uma coluna de publicações com autoria, texto, fotos, reputação e ações, além de filtros laterais no desktop. No celular os filtros começam recolhidos. Patrocínio e avaliações reais são preservados; não foram adicionadas curtidas ou contagens fictícias. As publicações continuam visualmente delimitadas para distinguir seus autores.

## Verificação e autocrítica

- Build Angular de produção aprovado.
- Testes de navegador com API simulada aprovados para aceite, início/conclusão, avaliação, recontratação, perfil, favoritos, disponibilidade, agenda, notificações, publicação e autenticação Google simulada.
- Testados abertura de submenus e fechamento por Escape no celular, além de largura em 390 e 1440 pixels. Inspecionadas capturas de painel, perfil, página inicial e Destaques.
- Reutilizados os componentes, serviços, NgModules e variáveis de cores existentes. Nenhuma alteração no backend ou regra de contratação.
- O teste simulado não substitui homologação com contas reais e imagens reais da API publicada. O trabalho visual não inclui implementação de novas interações sociais.
