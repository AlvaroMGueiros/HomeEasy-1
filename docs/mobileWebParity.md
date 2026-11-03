# Paridade mobile e web

Escopo solicitado: reproduzir no Angular os recursos do mobile usando os contratos existentes, sem alterar o backend.

## Inventário inicial

| Fluxo do mobile | Estado inicial do web | Trabalho necessário |
|---|---|---|
| Pedir orçamento e enviar fotos | Existe | Preservar formulário dinâmico |
| Propor e comparar orçamentos | Parcial | Total com deslocamento, validade, atualização após aceite, vínculo com atendimento |
| Atendimento | Legado | Detalhe real por ID, iniciar, concluir, cancelar, avaliação separada, conversa e problema |
| Recontratação | Ausente | Preencher novo orçamento com dados anteriores, permitindo revisão |
| Perfil profissional público | Simplificado | Bio, capa, portfólio, serviços, métricas reais, verificações específicas, avaliações, agenda, favoritos e compartilhamento |
| Apresentação profissional | Ausente | Editar bio, capa e fotos |
| Agenda | Apenas dias/horário uniforme no cadastro | Editor semanal e exceções por data |
| Conversas | Existe | Separar ativas/encerradas e verificar recursos ausentes |
| Notificações | Apenas dropdown | Histórico, ler todas e preferências |
| Destaques | Ausente | Feed filtrado/paginado, publicar, minhas publicações e moderação |
| Favoritos, denúncia e bloqueio | APIs e telas parciais | Integrar perfil detalhado |
| Verificação e administração | Existe parcialmente | Comparar com mobile e expor ações faltantes |
| Conta/privacidade/exclusão | Parcial | Comparar ações disponíveis no perfil |

O controller de Destaques está em backend/src/professionals/highlights.controller.ts. Os contratos foram conferidos no backend principal, incluindo cidade/estado obrigatórios e filtros opcionais. A existência no código local não comprova que a mesma versão esteja publicada.

## Entrega no Angular

- Orçamentos: comparação por total com deslocamento, validade, aceite e abertura do atendimento criado.
- Meus serviços: separação entre contratante e profissional; detalhe com iniciar, concluir, cancelar, avaliar, conversar, relatar problema e contratar novamente.
- Perfil: biografia, capa, portfólio, serviços, verificações identificadas, avaliações com autoria e resposta do profissional, favoritos, compartilhamento e disponibilidade.
- Profissional: edição da apresentação, fotos de trabalhos concluídos, agenda semanal e exceções, painel com propostas/atendimentos e envio de documentos para verificação.
- Destaques: filtros locais, paginação, publicação com consentimento e fotos do portfólio, histórico próprio e moderação administrativa.
- Conversas: separação entre ativas e encerradas, fotos privadas, confirmação de leitura, presença, digitação, denúncias e bloqueio/desbloqueio.
- Conta: histórico e leitura de notificações, preferências, exclusão com confirmação e aceite das regras da comunidade por versão.
- Administração: decisão sobre denúncias e problemas em atendimentos, além da moderação de publicações.
- Google: botão oficial do Google Identity Services conectado ao endpoint de autenticação existente.

## Validação

- Compilação TypeScript e build Angular de produção aprovados.
- Cinco testes Jasmine das funções de comparação, rotas de notificações e métricas profissionais aprovados, executados via jasmine-core no Node com transpilação TypeScript. O launcher ChromeHeadless do Karma não conectou neste ambiente.
- Testes de navegador com API/SDK simulados: aceite, restrição por participante, início/conclusão, avaliação, recontratação, perfil, favoritos, disponibilidade, notificações/preferências, agenda sem IDs internos no PUT, publicação, Google e regras da comunidade.
- Verificação de largura em 390 e 1440 pixels, sem transbordamento nas telas verificadas. Nenhuma escrita em produção durante os testes.

## Configuração e limites

O login Google usa o client ID público dos environments. O projeto Google Cloud correspondente precisa autorizar as origens JavaScript do web (incluindo a origem local usada e os domínios reais de hospedagem). O backend precisa aceitar esse client ID na configuração de audiência. A autenticação com conta Google real ainda não foi validada.

A publicação no hosting e a validação contra a versão efetivamente implantada da API não fazem parte destes testes locais. Funcionalidades nativas como cobrança pela loja, registro de push mobile e permissões Android não foram transportadas para o navegador. As preferências de notificações usam a API existente, sem implementar registro de Web Push.

## Autocrítica

Foram preservados NgModules, serviços HTTP, guardas e componentes compartilhados existentes. As novas telas usam as variáveis de cores do sistema; regras reutilizáveis ficaram nos utils e a edição de fotos/ações de segurança foi compartilhada. O backend permaneceu sem alterações. A principal limitação de validação é o uso de contratos e respostas simuladas, que não substitui homologação com contas reais de cliente, profissional e administrador.
