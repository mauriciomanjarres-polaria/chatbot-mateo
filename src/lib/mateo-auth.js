import { fetchMe } from './auth-api';

export async function requireMateoUser(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return { error: 'No autorizado.', status: 401 };
  }

  const result = await fetchMe(token);
  if (!result.ok || !result.user?.idUsuario) {
    return { error: 'Sesión inválida.', status: 401 };
  }

  return { user: result.user, token };
}
