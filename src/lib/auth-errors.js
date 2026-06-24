export class AuthSessionError extends Error {
  constructor(message = 'Sesión inválida.') {
    super(message);
    this.name = 'AuthSessionError';
    this.status = 401;
  }
}

export function isAuthSessionError(error) {
  return error instanceof AuthSessionError || error?.name === 'AuthSessionError';
}
