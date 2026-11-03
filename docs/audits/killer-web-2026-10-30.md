# Auditoria Visant: HomeEasy web

Status: auditoria parcial com correções verificadas. Sem nota de aprovação do sistema inteiro enquanto houver verificações pendentes.

## Superfícies

| Rota | Classe | Tier | Variável de negócio | Persuasão |
|---|---|---|---|---|
| /home | A | T2 | Início da busca por serviço | Apresentação e chamada para buscar |
| /profissional | A | T2 | Cadastro de profissionais | Demonstração do produto |
| /contato | C | T2 | Contato com suporte | Dispensável |
| /sobrenos | A | T2 | Confiança na plataforma | Apresentação institucional |
| /login | C | T3 | Acesso e criação da conta | Dispensável |
| /recuperar-senha | C | T3 | Recuperação de acesso | Dispensável |
| /redefinir-senha | C | T3 | Recuperação de acesso | Dispensável |
| /feed | B | T2 | Encontrar profissional e iniciar orçamento | Excessiva no cabeçalho |
| /procurar/:nome | B | T2 | Seleção do serviço | Dispensável |
| /serviço/:id | B | T2 | Comparação de profissionais | Avaliações como evidência |
| /serviço/:id/usuario/:idd | B | T2 | Escolha do profissional | Perfil e avaliações |
| /serviço/:id/usuario/:idd/avaliações | B | T2 | Comparação pela reputação | Avaliações como evidência |
| /serprofissional | C | T3 | Publicação do serviço | Dispensável |
| /serviços/:id | B | T2 | Gestão dos serviços | Dispensável |
| /serviços/:id/detalhe/:idd | B | T2 | Consulta do serviço | Dispensável |
| /serviços/:id/detalhe/:idd/editar | C | T3 | Alteração do serviço | Dispensável |
| /usuario/:id | B | T2 | Consulta do perfil | Dispensável |
| /editar | C | T3 | Atualização de dados pessoais | Dispensável |
| /favoritos | B | T2 | Retorno a profissionais salvos | Dispensável |
| /conversas | B | T2 | Continuidade do atendimento | Dispensável |
| /chat/:id | C | T3 | Troca de mensagens do atendimento | Dispensável |
| /pedido-info | A | T2 | Compreensão da contratação | Orientação do fluxo |
| /usuario/:id/pedidos-feitos | B | T2 | Acompanhamento de contratações | Dispensável |
| /usuario/:id/pedidos-feitos/:idd | C | T3 | Execução e conclusão do serviço | Dispensável |
| /usuario/:id/pedidos-recebidos | B | T2 | Acompanhamento dos trabalhos | Dispensável |
| /usuario/:id/pedidos-recebidos/:idd | C | T3 | Execução e conclusão do trabalho | Dispensável |
| /solicitar/:serviceId | C | T3 | Criação de pedido de orçamento | Dispensável |
| /solicitar/:serviceId/profissional/:professionalId | C | T3 | Pedido ao profissional escolhido | Dispensável |
| /solicitacoes | B | T2 | Comparação de propostas | Dispensável |
| /solicitacoes/:requestId | C | T3 | Aceite de proposta | Dispensável |
| /oportunidades | B | T2 | Seleção de pedidos para propor | Dispensável |
| /oportunidades/:requestId | C | T3 | Envio de proposta | Dispensável |
| /admin/verificacoes | C | T3 | Decisão de verificação documental | Dispensável |

## Gate

- killer-scan --roots: 164 arquivos, zero interfaces reconhecidas. O reconhecimento de templates Angular é insuficiente. Zero achados não significa conformidade.
- Token fallback: não reconheceu a injeção de tokens de shared/colors.ts pelo AppComponent. Revisão manual necessária.
- copy-lint: 13 ocorrências. As mensagens de senha e formato inválido são falsos positivos semânticos e devem ser preservadas.
- motion-lint: zero achados; não cobre satisfatoriamente os estilos CSS Angular.
- Impeccable: indisponível no ambiente.
- Não existem scripts próprios de lint/design no package.json.

## Achados confirmados antes das alterações

| Local | Problema | Correção |
|---|---|---|
| src/app/home/home.component.html:26 | Nota 4,9 fixa, apresentada como avaliação média sem fonte | Remover a afirmação |
| src/styles.css:180,403,510 | Cards e marcadores sobem ou ampliam ao passar o mouse | Usar borda, cor e sombra sem deslocamento |
| src/app/feed/feed.component.css:52,59 | Cards de categorias e profissionais sobem no hover | Preservar geometria |
| src/app/shared/service-icon/service-icon.component.css:4 | Ícone cresce no hover | Preservar tamanho |
| src/app/feed/feed.component.html:28,92 | A mesma afirmação sobre avaliações repetida no hero e rodapé | Usar o nome factual Avaliações |

## Screen seen

O navegador integrado estava indisponível. Foi usado o harness Playwright da skill, com Chromium instalado pelo registro oficial npm.

| Rota aberta | Larguras | Estado | Resultado |
|---|---|---|---|
| /home | 390, 1440 | Conteúdo estático | Overflow do documento: 0px. Screenshots inspecionados |
| /login | 390, 1440 | Sem sessão | Overflow: 0px |
| /feed | 390, 1440 | Backend local indisponível | Overflow: 0px. Screenshot mobile inspecionado; erro e retry visíveis |
| /profissional | 390, 1440 | Sem sessão | Overflow: 0px |
| /contato | 390, 1440 | Formulário inicial | Overflow: 0px |
| /sobrenos | 390, 1440 | Conteúdo estático | Overflow: 0px |
| /recuperar-senha | 390, 1440 | Formulário inicial | Overflow: 0px |
| /redefinir-senha | 390, 1440 | Sem token de recuperação | Overflow: 0px |

Os 26 candidatos do corta-scan são inconclusivos: vários confundem altura da linha tipográfica com recorte e formas decorativas sobrepostas com ações encobertas. As screenshots da home não mostram palavras cortadas. Não foram aplicadas alterações automáticas com base nesses candidatos.

## Correções adicionais e testes

- src/app/feed/feed.component.ts:126: carga das categorias com erro explícito e nova tentativa.
- src/app/feed/feed.component.ts:283: falha no carregamento de profissionais deixa de ser apresentada como ausência de profissionais.
- src/app/feed/feed.component.ts:127: versão da carga impede respostas antigas de sobrescreverem uma nova tentativa.
- src/app/profissional/profissional.component.html:20: painel com dados fictícios identificado como exemplo ilustrativo.
- Chromium com respostas controladas: erro de catálogo encerra loading; retry recupera categorias; resposta vazia válida mostra vazio; falha de profissionais mostra erro sem contagem falsa; mapa com dados incompletos não aparece. PASS.
- Build Angular de produção: PASS após mudanças de TypeScript/template.
- git diff --check: PASS.
- Os testes controlados não comprovam o fluxo real de contratação ou a disponibilidade da API de produção.

## Interrogação desta rodada (T2: home e feed)

| Pergunta | Evidência e decisão |
|---|---|
| Q1 Quem precisa da tela? | home.component.html:12 direciona à busca; manter o caminho de entrada |
| Q2 Elemento necessário ou apenas dado disponível? | home.component.html:26 tinha nota fixa; removida por ausência de fonte |
| Q3 Uma frase substitui a tela? | feed.component.html:11 oferece busca e :55 categorias; a interação justifica a tela |
| Q5 Qual decisão produz? | feed.component.html:82 permite abrir perfil para escolher profissional |
| Q6 Qual número decide? | feed.component.html:80 usa ratingCount antes de apresentar nota; números sem avaliações não são exibidos |
| Q7 Resposta ou matéria-prima? | feed.component.html:82 leva ao perfil; a contratação exige conhecer os detalhes do profissional |
| Q8 O padrão é defensável? | feed.component.ts:73 inicia em todas as categorias, sem restringir cidade silenciosamente |
| Q11 Quando o número mente? | feed.component.ts:304 escondia falha como lista vazia; corrigido com hasMetadataLoadError |
| Q12 Backend indisponível? | feed.component.ts:159 e teste Chromium: erro visível e nova tentativa |
| Q13 Promessa respaldada? | Nota fixa removida; painel profissional marcado como ilustração em profissional.component.html:20 |
| Q18 O que a interface ensina errado? | styles.css:180 destacava cards com deslocamento; hover agora preserva geometria |
| Q26 Como manter? | Reuso de styles.css e colors.ts; relatório registra verificação e limitações |

### Bloco fixo

- F1: reutilizados ActionFeedback e classes button-secondary; nenhum novo componente de design system.
- F2: colors.ts continua sendo a fonte de cores. Não foi introduzida paleta paralela. Tokens CSS existentes são cores completas; envolver em hsl(var(...)) seria incorreto neste projeto.
- F3: overflow medido em 16 combinações de rota/largura. Não foi medido desempenho de produção nem registros extremos reais.
- F4: caminho visitante home, feed, perfil, orçamento preservado. Fluxo final autenticado pendente.
- F5: removida a nota fixa; títulos e instruções restantes não foram reescritos por preferência estética. Nenhum ganho de pixels foi inventado.
- F6: maiores pendências são verificação autenticada com dados extremos, cobertura Angular dos detectores e distinção erro/vazio nas demais telas. Esforço médio e impacto alto. Não há base para afirmar conformidade completa dos 13 critérios.

## Detectores e limitações

Não foram alteradas as regras de terceiros. Os resultados sem cobertura Angular e os candidatos de clipping ficam inconclusivos, sem serem contabilizados como aprovação. A correção definitiva das regras exigiria fixtures Angular na ferramenta, fora do escopo do produto.

## Propostas de gosto (não aplicadas)

| Área | Proposta | Motivo |
|---|---|---|
| Feed autenticado | Reduzir o hero promocional e trazer busca e categorias para cima | Menos conteúdo institucional durante o uso recorrente |
| Feed | Reduzir blocos repetidos de benefícios | Dar prioridade a profissionais e serviços |
| Ícones | Adotar uma biblioteca Angular única para substituir glifos e SVGs locais | Uniformizar geometria e acessibilidade sem instalar bibliotecas React |

## Não verificado

- Fluxos autenticados completos, contas com dados mínimos/máximos, alterações e contratações reais.
- Interrogação T3 completa e revenue-centric-design (não incluída no repositório da skill).
- Métricas de conversão e desempenho de produção.
- Impeccable, validação completa por teclado, temas alternativos e validação de todos os formulários autenticados.
- Candidatos remanescentes do copy-lint: separadores e títulos acessíveis. Não foram declarados como corrigidos.

## Autocrítica

Seguir Angular e os tokens existentes de shared/colors.ts. Evitar migração para React/shadcn e reescrita de componentes sem necessidade. A auditoria permanece parcial até a verificação visual e dos fluxos autenticados.
