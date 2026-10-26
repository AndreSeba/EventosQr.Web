// Lo que se recuerda en ESTE teléfono (localStorage): los datos del comprador para la próxima compra y los links de sus órdenes.
// Puede fallar (modo privado, almacenamiento bloqueado): todo va en try/catch y la página funciona igual sin esto.

export type DatosComprador = { nombre: string; telefono: string; email: string };
export type OrdenGuardada = { acceso: string; numero: number; evento: string; fechaInicio: string; guardadaEn: string };

const CLAVE_DATOS = "eventosqr.comprador";
const CLAVE_ORDENES = "eventosqr.ordenes";

function leer<T>(clave: string): T | null {
  try { const v = localStorage.getItem(clave); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
function escribir(clave: string, valor: unknown) {
  try { valor === null ? localStorage.removeItem(clave) : localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
}

export const datosGuardados = () => leer<DatosComprador>(CLAVE_DATOS);
export const guardarDatos = (d: DatosComprador | null) => escribir(CLAVE_DATOS, d);

export const ordenesGuardadas = () => (leer<OrdenGuardada[]>(CLAVE_ORDENES) ?? []).filter((o) => o && typeof o.acceso === "string");

/** Agrega (o actualiza) una orden en «Mis entradas». Se guardan las 30 más recientes. */
export function guardarOrden(o: Omit<OrdenGuardada, "guardadaEn">) {
  const resto = ordenesGuardadas().filter((x) => x.acceso !== o.acceso);
  escribir(CLAVE_ORDENES, [{ ...o, guardadaEn: new Date().toISOString() }, ...resto].slice(0, 30));
}

export function olvidarOrden(acceso: string) {
  escribir(CLAVE_ORDENES, ordenesGuardadas().filter((x) => x.acceso !== acceso));
}

/** Promotor del link de venta (?r=). Se guarda por pestaña para no perderlo si el comprador recarga la página. */
export function refDelLink(slug: string): string | null {
  const clave = `eventosqr.ref.${slug}`;
  const r = new URLSearchParams(location.search).get("r")?.trim().slice(0, 60) || null;
  try {
    if (r) sessionStorage.setItem(clave, r);
    return r ?? sessionStorage.getItem(clave);
  } catch {
    return r;
  }
}
