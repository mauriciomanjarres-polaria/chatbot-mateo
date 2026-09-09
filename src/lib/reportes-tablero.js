import { normalizeSupabaseUrl } from './supabase-server';

const COLS_TABLERO = {
  idproducto: 'IdProducto',
  codigoproducto: 'CodigoProducto',
  nombreproducto: 'NombreProducto',
  unidad: 'Unidad',
  cantidadcompra: 'CantidadCompra',
  cantidadventa: 'CantidadVenta',
  cantidadmerma: 'CantidadMerma',
  existenciaactual: 'ExistenciaActual',
  costototalcompra: 'CostoTotalCompra',
  ventatotal: 'VentaTotal',
  costototalmerma: 'CostoTotalMerma',
  valorinventario: 'ValorInventario',
  costounitario: 'CostoUnitario',
  ventaunitaria: 'VentaUnitaria',
  mermadesecho: 'MermaDesecho',
};

function normalizarFilasRpc(filas) {
  return (filas || []).map((fila) => {
    const out = {};
    Object.keys(fila).forEach((k) => {
      out[COLS_TABLERO[k.toLowerCase()] || k] = fila[k];
    });
    return out;
  });
}

async function leerError(response) {
  try {
    const data = await response.json();
    return data.message || data.error_description || data.error || JSON.stringify(data);
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

export async function consultarTableroRpc({ schema, fechaInicio, fechaFin }) {
  const baseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!baseUrl || !key) {
    throw new Error('Supabase no está configurado.');
  }

  const response = await fetch(`${baseUrl}/rest/v1/rpc/get_ventas_compras_inventario`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Accept-Profile': schema,
      'Content-Profile': schema,
    },
    body: JSON.stringify({
      p_fecha_inicio: fechaInicio,
      p_fecha_fin: fechaFin,
    }),
  });

  if (!response.ok) {
    throw new Error(await leerError(response));
  }

  return normalizarFilasRpc(await response.json());
}

function siguienteDiaIso(fechaIso) {
  const d = new Date(`${fechaIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function consultarVista({ schema, vista, order, fechaColumna, fechaInicio, fechaFin }) {
  const baseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!baseUrl || !key) {
    throw new Error('Supabase no está configurado.');
  }

  const all = [];
  const page = 1000;
  const maxPaginas = 50;
  let from = 0;
  const queryParts = [];
  if (fechaColumna) {
    queryParts.push(`${fechaColumna}=gte.${fechaInicio}`);
    queryParts.push(`${fechaColumna}=lt.${siguienteDiaIso(fechaFin)}`);
    queryParts.push(`order=${fechaColumna}.desc`);
  } else if (order) {
    queryParts.push(`order=${order}`);
  }
  const query = queryParts.join('&');
  const url = query ? `${baseUrl}/rest/v1/${vista}?${query}` : `${baseUrl}/rest/v1/${vista}`;

  for (let pagina = 0; pagina < maxPaginas; pagina += 1) {
    const response = await fetch(url, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        'Accept-Profile': schema,
        Prefer: 'count=exact',
        Range: `${from}-${from + page - 1}`,
        'Range-Unit': 'items',
      },
    });

    if (!response.ok) {
      throw new Error(await leerError(response));
    }

    const chunk = await response.json();
    all.push(...chunk);
    if (chunk.length < page) return all;
    from += page;
  }

  throw new Error('Hay demasiados registros. Reduce el rango o filtra la consulta.');
}

export async function consultarVistaVentas({ schema, fechaInicio, fechaFin }) {
  return consultarVista({
    schema,
    vista: 'vista_ventas',
    fechaColumna: 'fecha_venta',
    fechaInicio,
    fechaFin,
  });
}

export async function consultarVistaCompras({ schema, fechaInicio, fechaFin }) {
  return consultarVista({
    schema,
    vista: 'vista_compras',
    fechaColumna: 'fecha_compra',
    fechaInicio,
    fechaFin,
  });
}

export async function consultarVistaInventario({ schema }) {
  return consultarVista({
    schema,
    vista: 'vista_inventario',
    order: 'existencia_actual.desc',
  });
}
