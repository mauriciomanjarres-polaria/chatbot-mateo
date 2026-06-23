import { NextResponse } from 'next/server';
import { requireMateoUser } from '../../../../../../lib/mateo-auth';
import {
  createMensaje,
  getConversacionForUser,
  listMensajes,
  mapMensaje,
} from '../../../../../../lib/mateo-db';
import { getSupabaseAdmin, isSupabaseConfigured } from '../../../../../../lib/supabase-server';

const VALID_ROLES = new Set(['user', 'assistant']);
const VALID_STATES = new Set(['ok', 'error', 'timeout']);

async function ensureConversacion(supabase, idConversacion, idUsuario) {
  const { data, error } = await getConversacionForUser(supabase, idConversacion, idUsuario);
  if (error) return { error: error.message, status: 500 };
  if (!data) return { error: 'Conversación no encontrada.', status: 404 };
  return { conversacion: data };
}

export async function GET(request, { params }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase no está configurado.' }, { status: 503 });
  }

  const auth = await requireMateoUser(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getSupabaseAdmin();
  const access = await ensureConversacion(supabase, params.id, auth.user.idUsuario);
  if (access.error) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data, error } = await listMensajes(supabase, params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    mensajes: (data ?? []).map(mapMensaje),
  });
}

export async function POST(request, { params }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase no está configurado.' }, { status: 503 });
  }

  const auth = await requireMateoUser(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  const rol = body.rol;
  const contenido = typeof body.contenido === 'string' ? body.contenido.trim() : '';

  if (!VALID_ROLES.has(rol)) {
    return NextResponse.json({ error: 'Rol de mensaje inválido.' }, { status: 400 });
  }

  if (!contenido) {
    return NextResponse.json({ error: 'El contenido es obligatorio.' }, { status: 400 });
  }

  const estado = body.estado ?? 'ok';
  if (!VALID_STATES.has(estado)) {
    return NextResponse.json({ error: 'Estado de mensaje inválido.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const access = await ensureConversacion(supabase, params.id, auth.user.idUsuario);
  if (access.error) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data, error } = await createMensaje(supabase, {
    idConversacion: params.id,
    idUsuario: auth.user.idUsuario,
    rol,
    contenido,
    estado,
    tokensUsados: body.tokensUsados ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ mensaje: mapMensaje(data) }, { status: 201 });
}
