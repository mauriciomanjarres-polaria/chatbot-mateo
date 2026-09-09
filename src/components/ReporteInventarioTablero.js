'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import * as XLSX from 'xlsx';

const EXCLUIR_SUMA = /^(id_|producto|descripcion|unidad|almacen|codigo|es_|requiere|rango|proximo)/i;
const OCULTAR_COLUMNAS = /^(id_producto|id_bodega|es_primario|es_secundario|unidad_visualizacion|requiere_lote|producto_activo|almacen_activo|rango_temperatura_min|rango_temperatura_max)$/i;
const RATIOS = {
  costo_unitario: ['valor_al_costo', 'existencia_actual'],
};
const DECIMALES_1 = {
  existencia_actual: true,
  cantidad_reservada: true,
  existencia_disponible: true,
};
const DINERO_ENTERO = {
  valor_al_costo: true,
  valor_inventario: true,
};
const DINERO_2DEC = {
  costo_unitario: true,
};
const PORCENTAJE_1 = {
  merma_pct: true,
};
const ENTERO = {
  lotes: true,
  ubicaciones: true,
  almacenes: true,
};
const COLUMNAS_CONSOLIDADO = [
  'producto',
  'descripcion',
  'unidad_medida',
  'almacenes',
  'existencia_actual',
  'cantidad_reservada',
  'existencia_disponible',
  'valor_al_costo',
  'costo_unitario',
  'lotes',
  'ubicaciones',
  'proximo_vencimiento',
];

function esFechaIso(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

function aNumero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  const n = Number(String(valor).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function esColumnaNumerica(nombre, rows) {
  if (DECIMALES_1[nombre] || RATIOS[nombre] || DINERO_ENTERO[nombre] || DINERO_2DEC[nombre] || PORCENTAJE_1[nombre] || ENTERO[nombre]) {
    return true;
  }
  if (EXCLUIR_SUMA.test(nombre)) return false;
  return rows.some((row) => aNumero(row[nombre]) !== null);
}

function sumaColumna(rows, nombre) {
  return rows.reduce((acc, row) => {
    const n = aNumero(row[nombre]);
    return acc + (n === null ? 0 : n);
  }, 0);
}

function formatoNumero(valor, columna) {
  if (valor === null || valor === undefined || valor === '') return '';
  const n = aNumero(valor);
  if (n === null) return String(valor);
  if (PORCENTAJE_1[columna]) {
    const pct = Math.abs(n) <= 1 ? n * 100 : n;
    return `${pct.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
  }
  if (DINERO_2DEC[columna]) {
    return `$ ${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (ENTERO[columna]) {
    return Math.round(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
  }
  if (DINERO_ENTERO[columna]) {
    return `$ ${Math.round(n).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
  }
  if (DECIMALES_1[columna]) {
    return n.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  const dec = Math.abs(n) >= 100 ? 2 : 4;
  return n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: dec });
}

function totalColumna(nombre, rows) {
  if (PORCENTAJE_1[nombre]) return null;
  if (RATIOS[nombre]) {
    const num = sumaColumna(rows, RATIOS[nombre][0]);
    const den = sumaColumna(rows, RATIOS[nombre][1]);
    return den ? num / den : null;
  }
  if (!esColumnaNumerica(nombre, rows)) return null;
  return sumaColumna(rows, nombre);
}

function etiquetaCorta(texto) {
  const n = String(texto || '');
  return n.length > 22 ? `${n.slice(0, 21)}…` : n;
}

function isoToDmy(iso) {
  if (!esFechaIso(iso)) return '';
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

function formatoCelda(valor, columna) {
  if (valor == null || valor === '') return '';
  if (/^(fecha|proximo_vencimiento)/.test(columna)) {
    const texto = String(valor);
    const iso = texto.slice(0, 10);
    return esFechaIso(iso) ? isoToDmy(iso) : texto;
  }
  return String(valor);
}

function consolidarProductos(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const key = row.id_producto || row.producto;
    if (!key) return;
    let agg = map.get(key);
    if (!agg) {
      agg = {
        id_producto: row.id_producto,
        producto: row.producto,
        descripcion: row.descripcion,
        unidad_medida: row.unidad_medida,
        almacenes: 0,
        existencia_actual: 0,
        cantidad_reservada: 0,
        existencia_disponible: 0,
        valor_al_costo: 0,
        lotes: 0,
        ubicaciones: 0,
        proximo_vencimiento: null,
      };
      map.set(key, agg);
    }
    agg.almacenes += 1;
    agg.existencia_actual += aNumero(row.existencia_actual) || 0;
    agg.cantidad_reservada += aNumero(row.cantidad_reservada) || 0;
    agg.existencia_disponible += aNumero(row.existencia_disponible) || 0;
    agg.valor_al_costo += aNumero(row.valor_al_costo) || 0;
    agg.lotes += aNumero(row.lotes) || 0;
    agg.ubicaciones += aNumero(row.ubicaciones) || 0;
    const venc = row.proximo_vencimiento ? String(row.proximo_vencimiento).slice(0, 10) : '';
    if (esFechaIso(venc) && (!agg.proximo_vencimiento || venc < agg.proximo_vencimiento)) {
      agg.proximo_vencimiento = venc;
    }
  });

  return [...map.values()]
    .map((agg) => ({
      ...agg,
      costo_unitario: agg.existencia_actual ? agg.valor_al_costo / agg.existencia_actual : null,
    }))
    .sort((a, b) => (aNumero(b.valor_al_costo) || 0) - (aNumero(a.valor_al_costo) || 0));
}

function filtrarYOrdenar(rows, columnas, filtros, orden, numericas) {
  let visibles = rows.filter((row) =>
    columnas.every((column) => {
      const filtro = (filtros[column] || '').trim().toLowerCase();
      if (!filtro) return true;
      const raw = numericas[column]
        ? formatoNumero(row[column], column)
        : formatoCelda(row[column], column);
      const texto = raw === null || raw === undefined ? '' : String(raw);
      return texto.toLowerCase().includes(filtro);
    }),
  );

  if (!orden.col) return visibles;

  const col = orden.col;
  const dir = orden.dir;
  const numerica = numericas[col];
  return visibles.slice().sort((a, b) => {
    const va = a[col];
    const vb = b[col];
    if (numerica) {
      const na = aNumero(va);
      const nb = aNumero(vb);
      if (na === null && nb === null) return 0;
      if (na === null) return 1;
      if (nb === null) return -1;
      return (na - nb) * dir;
    }
    return String(va || '').localeCompare(String(vb || ''), 'es', {
      numeric: true,
      sensitivity: 'base',
    }) * dir;
  });
}

function mapaNumericas(columnas, rows) {
  const map = {};
  columnas.forEach((column) => {
    map[column] =
      esColumnaNumerica(column, rows || []) ||
      !!RATIOS[column] ||
      !!DECIMALES_1[column] ||
      !!DINERO_ENTERO[column] ||
      !!DINERO_2DEC[column] ||
      !!PORCENTAJE_1[column] ||
      !!ENTERO[column];
  });
  return map;
}

function agruparSuma(rows, etiquetaFn, valorKey) {
  const map = new Map();
  rows.forEach((row) => {
    const etiqueta = etiquetaFn(row) || '—';
    map.set(etiqueta, (map.get(etiqueta) || 0) + (aNumero(row[valorKey]) || 0));
  });
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
}

export default function ReporteInventarioTablero({ accessToken, onSessionInvalid }) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rows, setRows] = useState(null);
  const [tab, setTab] = useState('tabla');
  const [filtros, setFiltros] = useState({});
  const [orden, setOrden] = useState({ col: null, dir: 1 });
  const [filtrosProducto, setFiltrosProducto] = useState({});
  const [ordenProducto, setOrdenProducto] = useState({ col: null, dir: 1 });

  const chartValorRef = useRef(null);
  const chartCantidadRef = useRef(null);
  const chartAlmacenRef = useRef(null);
  const graficosRef = useRef([]);

  const columnas = useMemo(() => {
    if (!rows?.length) return [];
    return Object.keys(rows[0]).filter((column) => !OCULTAR_COLUMNAS.test(column));
  }, [rows]);

  const numericas = useMemo(() => mapaNumericas(columnas, rows), [columnas, rows]);

  const filasVisibles = useMemo(
    () => (rows ? filtrarYOrdenar(rows, columnas, filtros, orden, numericas) : []),
    [rows, columnas, filtros, orden, numericas],
  );

  const productos = useMemo(() => (rows?.length ? consolidarProductos(rows) : []), [rows]);
  const numericasProducto = useMemo(() => mapaNumericas(COLUMNAS_CONSOLIDADO, productos), [productos]);
  const filasProductosVisibles = useMemo(
    () => filtrarYOrdenar(productos, COLUMNAS_CONSOLIDADO, filtrosProducto, ordenProducto, numericasProducto),
    [productos, filtrosProducto, ordenProducto, numericasProducto],
  );

  function destruirGraficos() {
    graficosRef.current.forEach((g) => g.destroy());
    graficosRef.current = [];
  }

  useEffect(() => () => destruirGraficos(), []);

  useEffect(() => {
    if (tab !== 'dashboard' || !rows?.length) {
      destruirGraficos();
      return undefined;
    }

    const topValor = agruparSuma(
      rows,
      (r) => r.descripcion || r.producto,
      'valor_al_costo',
    );
    const topCantidad = agruparSuma(
      rows,
      (r) => r.descripcion || r.producto,
      'existencia_actual',
    );
    const topAlmacen = agruparSuma(
      rows,
      (r) => r.almacen_nombre || r.almacen_codigo,
      'valor_al_costo',
    );

    const grid = 'rgba(90, 200, 160, 0.12)';
    const ticks = { color: '#8aa89c' };

    destruirGraficos();

    if (chartValorRef.current) {
      graficosRef.current.push(
        new Chart(chartValorRef.current, {
          type: 'bar',
          data: {
            labels: topValor.map(([label]) => etiquetaCorta(label)),
            datasets: [{
              label: 'Valor',
              data: topValor.map(([, value]) => value),
              backgroundColor: 'rgba(46, 230, 168, 0.75)',
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks, grid: { color: grid } },
              y: { ticks, grid: { color: grid } },
            },
          },
        }),
      );
    }

    if (chartCantidadRef.current) {
      graficosRef.current.push(
        new Chart(chartCantidadRef.current, {
          type: 'bar',
          data: {
            labels: topCantidad.map(([label]) => etiquetaCorta(label)),
            datasets: [{
              label: 'Cantidad',
              data: topCantidad.map(([, value]) => value),
              backgroundColor: 'rgba(46, 230, 168, 0.75)',
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks, grid: { color: grid } },
              y: { ticks, grid: { color: grid } },
            },
          },
        }),
      );
    }

    if (chartAlmacenRef.current) {
      graficosRef.current.push(
        new Chart(chartAlmacenRef.current, {
          type: 'bar',
          data: {
            labels: topAlmacen.map(([label]) => etiquetaCorta(label)),
            datasets: [{
              label: 'Valor',
              data: topAlmacen.map(([, value]) => value),
              backgroundColor: 'rgba(122, 215, 255, 0.8)',
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks, grid: { color: grid } },
              y: { ticks, grid: { color: grid } },
            },
          },
        }),
      );
    }

    return () => destruirGraficos();
  }, [tab, rows]);

  async function cargarTablero() {
    setErrorMessage('');
    setFiltros({});
    setOrden({ col: null, dir: 1 });
    setFiltrosProducto({});
    setOrdenProducto({ col: null, dir: 1 });
    setTab('tabla');
    destruirGraficos();
    setLoading(true);

    try {
      const response = await fetch('/api/reporteinventario/tablero', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        onSessionInvalid?.();
        throw new Error(data.error || 'Sesión inválida.');
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error ejecutando la consulta');
      }

      setRows(data.rows || []);
    } catch (error) {
      setRows(null);
      setErrorMessage(error.message || 'Error ejecutando la consulta');
    } finally {
      setLoading(false);
    }
  }

  function ordenarColumna(columna) {
    setOrden((prev) => (
      prev.col === columna
        ? { col: columna, dir: prev.dir === 1 ? -1 : 1 }
        : { col: columna, dir: 1 }
    ));
  }

  function ordenarColumnaProducto(columna) {
    setOrdenProducto((prev) => (
      prev.col === columna
        ? { col: columna, dir: prev.dir === 1 ? -1 : 1 }
        : { col: columna, dir: 1 }
    ));
  }

  function exportarExcel() {
    const esConsolidado = tab === 'consolidado';
    const visibles = esConsolidado ? filasProductosVisibles : filasVisibles;
    const cols = esConsolidado ? COLUMNAS_CONSOLIDADO : columnas;
    const nums = esConsolidado ? numericasProducto : numericas;
    if (!visibles.length) {
      alert('No hay datos para exportar.');
      return;
    }

    try {
      const worksheet = XLSX.utils.json_to_sheet(
        visibles.map((row) => {
          const out = {};
          cols.forEach((column) => {
            out[column] = nums[column] ? row[column] : formatoCelda(row[column], column);
          });
          return out;
        }),
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, esConsolidado ? 'Por producto' : 'Detalle');

      worksheet['!cols'] = cols.map((column) => {
        let maxLength = column.length;
        visibles.forEach((row) => {
          let value = row[column];
          if (value === null || value === undefined) value = '';
          if (typeof value === 'object') value = JSON.stringify(value);
          maxLength = Math.max(maxLength, String(value).length);
        });
        return { wch: Math.min(maxLength + 2, 50) };
      });
      worksheet['!autofilter'] = { ref: worksheet['!ref'] };
      const sufijo = esConsolidado ? 'por_producto' : 'detalle';
      const hoy = new Date();
      const stamp = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
      XLSX.writeFile(workbook, `reporte_inventario_${sufijo}_${stamp}.xlsx`);
    } catch (error) {
      console.error(error);
      alert('No fue posible generar el archivo Excel.');
    }
  }

  const kpis = rows?.length
    ? {
        valor: sumaColumna(rows, 'valor_al_costo'),
        existencia: sumaColumna(rows, 'existencia_actual'),
        reservada: sumaColumna(rows, 'cantidad_reservada'),
        disponible: sumaColumna(rows, 'existencia_disponible'),
        productos: new Set(rows.map((r) => r.id_producto || r.producto).filter(Boolean)).size,
        almacenes: new Set(rows.map((r) => r.id_bodega || r.almacen_codigo).filter(Boolean)).size,
      }
    : null;

  const esConsolidado = tab === 'consolidado';
  const countVisibles = esConsolidado ? filasProductosVisibles.length : filasVisibles.length;
  const countTotal = esConsolidado ? productos.length : rows?.length || 0;
  const etiquetaConteo = esConsolidado ? 'productos' : 'registros';

  return (
    <div className="reportes-root" lang="es-MX">
      <div className="rp-page">
        <div className="rp-container">
          <div className="rp-filtros">
            <p className="rp-info">Existencia actual por producto y almacén.</p>
            <div className="rp-actions">
              <button
                className="rp-execute"
                type="button"
                disabled={loading}
                onClick={cargarTablero}
              >
                {loading ? 'Cargando…' : 'Cargar Datos'}
              </button>
            </div>
          </div>

          {errorMessage && <div className="rp-warning">{errorMessage}</div>}

          {rows && rows.length === 0 && (
            <>
              <div className="rp-result-header">
                <h2>Resultado</h2>
                <span className="rp-row-count">0 registros</span>
              </div>
              <div className="rp-empty">La consulta no devolvió registros.</div>
            </>
          )}

          {rows && rows.length > 0 && (
            <>
              <div className="rp-result-header">
                <h2>Resultado</h2>
                <div className="rp-result-actions">
                  <span className="rp-row-count">
                    {countVisibles} de {countTotal} {etiquetaConteo}
                  </span>
                  {tab !== 'dashboard' && (
                    <button className="rp-export" type="button" onClick={exportarExcel}>
                      Exportar Excel
                    </button>
                  )}
                </div>
              </div>

              <div className="rp-tabs">
                <button
                  className={`rp-tab${tab === 'tabla' ? ' rp-active' : ''}`}
                  type="button"
                  onClick={() => setTab('tabla')}
                >
                  Tabla
                </button>
                <button
                  className={`rp-tab${tab === 'consolidado' ? ' rp-active' : ''}`}
                  type="button"
                  onClick={() => setTab('consolidado')}
                >
                  Por producto
                </button>
                <button
                  className={`rp-tab${tab === 'dashboard' ? ' rp-active' : ''}`}
                  type="button"
                  onClick={() => setTab('dashboard')}
                >
                  Indicadores
                </button>
              </div>

              <div className={`rp-tab-panel${tab === 'tabla' ? ' rp-active' : ''}`}>
                <TablaResultados
                  columnas={columnas}
                  numericas={numericas}
                  filas={filasVisibles}
                  orden={orden}
                  filtros={filtros}
                  onOrdenar={ordenarColumna}
                  onFiltro={setFiltros}
                  rowKey={(row, index) => `${row.id_producto || row.producto}-${row.id_bodega || row.almacen_codigo}-${index}`}
                />
              </div>

              <div className={`rp-tab-panel${tab === 'consolidado' ? ' rp-active' : ''}`}>
                <TablaResultados
                  columnas={COLUMNAS_CONSOLIDADO}
                  numericas={numericasProducto}
                  filas={filasProductosVisibles}
                  orden={ordenProducto}
                  filtros={filtrosProducto}
                  onOrdenar={ordenarColumnaProducto}
                  onFiltro={setFiltrosProducto}
                  rowKey={(row, index) => row.id_producto || row.producto || index}
                />
              </div>

              <div className={`rp-tab-panel${tab === 'dashboard' ? ' rp-active' : ''}`}>
                {kpis && (
                  <div className="rp-kpi-grid">
                    <div className="rp-kpi">
                      <div className="rp-kpi-label">Inventario</div>
                      <div className="rp-kpi-caption">Valor al costo</div>
                      <div className="rp-kpi-value">{formatoNumero(kpis.valor, 'valor_al_costo')}</div>
                      <div className="rp-kpi-sub">Existencia  {formatoNumero(kpis.existencia, 'existencia_actual')}</div>
                    </div>
                    <div className="rp-kpi">
                      <div className="rp-kpi-label">Disponible</div>
                      <div className="rp-kpi-caption">Stock libre</div>
                      <div className="rp-kpi-value">{formatoNumero(kpis.disponible, 'existencia_disponible')}</div>
                      <div className="rp-kpi-sub">Reservado  {formatoNumero(kpis.reservada, 'cantidad_reservada')}</div>
                    </div>
                    <div className="rp-kpi">
                      <div className="rp-kpi-label">Productos</div>
                      <div className="rp-kpi-caption">SKUs con existencia</div>
                      <div className="rp-kpi-value">{kpis.productos.toLocaleString('es-MX')}</div>
                      <div className="rp-kpi-sub">{kpis.almacenes} almacenes</div>
                    </div>
                    <div className="rp-kpi">
                      <div className="rp-kpi-label">Líneas</div>
                      <div className="rp-kpi-caption">Producto × almacén</div>
                      <div className="rp-kpi-value">{rows.length.toLocaleString('es-MX')}</div>
                      <div className="rp-kpi-sub">Registros en vista_inventario</div>
                    </div>
                  </div>
                )}
                <div className="rp-charts">
                  <div className="rp-chart-card">
                    <h3>Top productos por valor ($)</h3>
                    <div className="rp-chart-wrap"><canvas ref={chartValorRef} /></div>
                  </div>
                  <div className="rp-chart-card">
                    <h3>Top productos por existencia</h3>
                    <div className="rp-chart-wrap"><canvas ref={chartCantidadRef} /></div>
                  </div>
                  <div className="rp-chart-card">
                    <h3>Top almacenes por valor ($)</h3>
                    <div className="rp-chart-wrap"><canvas ref={chartAlmacenRef} /></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <p className="rp-footer-note">Supabase · Polaria Mateo</p>
      </div>
    </div>
  );
}

function TablaResultados({
  columnas,
  numericas,
  filas,
  orden,
  filtros,
  onOrdenar,
  onFiltro,
  rowKey,
}) {
  return (
    <div className="rp-table-container">
      <table>
        <thead>
          <tr>
            {columnas.map((column) => (
              <th key={column} className={numericas[column] ? 'rp-num' : ''}>
                <button
                  type="button"
                  className="rp-th-sort"
                  onClick={() => onOrdenar(column)}
                >
                  {column}
                  <span className="rp-sort-ind">
                    {orden.col === column ? (orden.dir === 1 ? '▲' : '▼') : ''}
                  </span>
                </button>
                <input
                  className="rp-th-filter"
                  type="text"
                  placeholder="Filtrar"
                  value={filtros[column] || ''}
                  onChange={(e) => onFiltro((prev) => ({ ...prev, [column]: e.target.value }))}
                  onClick={(e) => e.stopPropagation()}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 ? (
            <tr>
              <td colSpan={columnas.length} className="rp-empty">
                Ningún registro coincide con el filtro.
              </td>
            </tr>
          ) : (
            filas.map((row, index) => (
              <tr key={rowKey(row, index)}>
                {columnas.map((column) => (
                  <td key={column} className={numericas[column] ? 'rp-num' : ''}>
                    {numericas[column]
                      ? formatoNumero(row[column], column)
                      : formatoCelda(row[column], column)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr>
            {columnas.map((column, i) => {
              if (i === 0) return <td key={column}>Total</td>;
              const total = totalColumna(column, filas);
              return (
                <td key={column} className={numericas[column] ? 'rp-num' : ''}>
                  {total === null ? '' : formatoNumero(total, column)}
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
