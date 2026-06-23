import { NextResponse } from 'next/server';
import { requireMateoUser } from '../../../../lib/mateo-auth';
import {
  createConversacion,
  listConversaciones,
  mapConversacion,
} from '../../../../lib/mateo-db';
import { getSupabaseAdmin, isSupabaseConfigured } from '../../../../lib/supabase-server';

export async function GET(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase no está configurado.' }, { status: 503 });
  }

  const auth = await requireMateoUser(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await listConversaciones(supabase, auth.user.idUsuario);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    conversaciones: (data ?? []).map(mapConversacion),
  });
}

export async function POST(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase no está configurado.' }, { status: 503 });
  }

  const auth = await requireMateoUser(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await createConversacion(supabase, {
    idUsuario: auth.user.idUsuario,
    codigoEmpresa: body.codigoEmpresa ?? auth.user.codigoEmpresa ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversacion: mapConversacion(data) }, { status: 201 });
}
