/**
 * Schema de Postgres por empresa para el tablero de reportes.
 * Agrega una entrada cuando el schema exista en Supabase.
 */
export const REPORTES_SCHEMAS = {
  Y9IHZ: 'emp_jbr_cygnus_y9ihz',
};

export const REPORTES_SCHEMA_DEFAULT = 'public';

export function resolveReportesSchema(codigoEmpresa) {
  const codigo = String(codigoEmpresa || '').trim().toUpperCase();
  return REPORTES_SCHEMAS[codigo] || REPORTES_SCHEMA_DEFAULT;
}
