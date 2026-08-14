export type AuthAction = 'login' | 'register' | 'recovery';

const authErrorMessages = {
  'auth/email-already-in-use': 'Este e-mail já está vinculado a uma conta.',
  'auth/invalid-email': 'Informe um endereço de e-mail válido.',
  'auth/too-many-requests': 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.',
  'auth/user-disabled': 'Esta conta está desativada. Entre em contato com o suporte.',
  'auth/user-not-found': 'Não encontramos uma conta com este e-mail.',
  'auth/weak-password': 'A senha precisa ter pelo menos 8 caracteres, incluindo maiúscula, minúscula e número.',
  'auth/wrong-password': 'A senha informada está incorreta.'
};

export function resolveAuthErrorMessage(errorCode: string, authAction: AuthAction): string {
  const knownErrorMessage = authErrorMessages[errorCode];

  if (knownErrorMessage) {
    return knownErrorMessage;
  }

  if (authAction === 'register') {
    return 'Não foi possível criar sua conta. Revise os dados e tente novamente.';
  }

  if (authAction === 'recovery') {
    return 'Não foi possível enviar o link de recuperação. Confira o e-mail e tente novamente.';
  }

  return 'Não foi possível entrar. Confira seus dados e tente novamente.';
}
