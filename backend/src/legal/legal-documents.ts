const contactEmail = 'contatohomeeasy@gmail.com';

function createPage(title: string, content: string) {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title} | Home Easy</title>
  </head>
  <body>
    <main>${content}</main>
  </body>
</html>`;
}

export const privacyPolicyDocument = createPage(
  'Política de Privacidade',
  `<h1>Política de Privacidade do Home Easy</h1>
  <p><strong>Última atualização:</strong> 8 de setembro de 2026.</p>
  <p>O Home Easy conecta clientes e profissionais de serviços residenciais. Esta política explica como tratamos dados pessoais no aplicativo e em seus serviços associados.</p>
  <h2>Dados que tratamos</h2>
  <ul>
    <li>Dados de cadastro e autenticação, como nome, e-mail, data de nascimento e credenciais protegidas.</li>
    <li>Dados de perfil, como telefone, endereço, cidade, estado, foto, documentos de verificação e informações profissionais fornecidas pelo usuário.</li>
    <li>Dados necessários à prestação dos serviços, como localização, solicitações, propostas, pedidos, agenda, mensagens, avaliações, denúncias e disputas.</li>
    <li>Dados técnicos necessários para segurança, prevenção de fraude, diagnóstico de falhas e funcionamento do aplicativo.</li>
  </ul>
  <h2>Como usamos os dados</h2>
  <p>Usamos os dados para criar e proteger contas, aproximar clientes e profissionais, processar solicitações, oferecer comunicação entre participantes, moderar a plataforma, prestar suporte e cumprir obrigações legais.</p>
  <h2>Compartilhamento e operadores</h2>
  <p>Não vendemos dados pessoais. Dados podem ser exibidos aos participantes de uma contratação quando isso for necessário ao serviço. Também utilizamos fornecedores de infraestrutura, banco de dados, armazenamento e envio de e-mail, sujeitos às finalidades e medidas de segurança aplicáveis.</p>
  <h2>Armazenamento e segurança</h2>
  <p>Adotamos conexão criptografada, autenticação por tokens, armazenamento privado de arquivos e controles de acesso. Mantemos os dados enquanto a conta estiver ativa ou pelo período necessário às finalidades informadas e às obrigações legais.</p>
  <h2>Exclusão e retenção</h2>
  <p>Ao excluir a conta, o acesso é revogado, o perfil é desativado e os dados pessoais e arquivos associados são apagados ou anonimizados. Registros estritamente necessários para prevenção de fraude, segurança, disputas, exercício de direitos ou cumprimento legal podem ser mantidos pelo prazo necessário, com acesso limitado.</p>
  <p>Consulte o <a href="account-deletion">procedimento público de exclusão de conta</a>.</p>
  <h2>Direitos do titular</h2>
  <p>Você pode solicitar confirmação de tratamento, acesso, correção, portabilidade, informação sobre compartilhamento, revogação de consentimento e exclusão, conforme a legislação aplicável.</p>
  <h2>Crianças e adolescentes</h2>
  <p>O cadastro no Home Easy é destinado somente a pessoas com 18 anos ou mais.</p>
  <h2>Contato</h2>
  <p>Para dúvidas ou solicitações sobre privacidade, escreva para <a href="mailto:${contactEmail}">${contactEmail}</a>.</p>`
);

export const accountDeletionDocument = createPage(
  'Exclusão de conta',
  `<h1>Solicitar exclusão da conta Home Easy</h1>
  <p>A exclusão remove o acesso à conta e apaga ou anonimiza os dados pessoais e arquivos associados.</p>
  <h2>Pelo aplicativo</h2>
  <ol>
    <li>Entre na sua conta.</li>
    <li>Abra <strong>Perfil</strong> e selecione <strong>Excluir minha conta</strong>.</li>
    <li>Leia os efeitos da exclusão, digite <strong>EXCLUIR</strong> e confirme.</li>
  </ol>
  <h2>Sem acesso ao aplicativo</h2>
  <p>Envie a solicitação pelo e-mail cadastrado na conta para <a href="mailto:${contactEmail}?subject=Solicitação%20de%20exclusão%20de%20conta%20Home%20Easy">${contactEmail}</a>, com o assunto “Solicitação de exclusão de conta Home Easy”. Faremos a verificação de titularidade antes de processar o pedido.</p>
  <h2>Dados excluídos ou anonimizados</h2>
  <p>São removidos os dados de autenticação, perfil, contato, localização, documentos, fotos e anexos vinculados à conta. Conteúdos pessoais de solicitações, propostas, mensagens e avaliações também são removidos ou anonimizados.</p>
  <h2>Retenção limitada</h2>
  <p>Podemos preservar somente registros indispensáveis para cumprir obrigações legais, prevenir fraude, proteger usuários, resolver disputas ou exercer direitos. Esses registros ficam com acesso restrito e são mantidos apenas pelo período necessário.</p>
  <p><a href="privacy">Leia a Política de Privacidade completa</a>.</p>`
);
