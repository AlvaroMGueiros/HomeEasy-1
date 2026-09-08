import { accountDeletionDocument, privacyPolicyDocument } from './legal-documents';

describe('legal documents', () => {
  it('publishes the privacy contact and data deletion path', () => {
    expect(privacyPolicyDocument).toContain('contatohomeeasy@gmail.com');
    expect(privacyPolicyDocument).toContain('account-deletion');
  });

  it('offers deletion inside and outside the app', () => {
    expect(accountDeletionDocument).toContain('Excluir minha conta');
    expect(accountDeletionDocument).toContain('mailto:contatohomeeasy@gmail.com');
  });
});
