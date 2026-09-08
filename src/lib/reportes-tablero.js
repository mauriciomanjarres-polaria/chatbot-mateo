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
