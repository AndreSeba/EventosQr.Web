const BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
const CLAVE = "eventosqr.token";

export const getToken = () => {
  try { return localStorage.getItem(CLAVE); } catch { return null; }
};
export const setToken = (t: string | null) => {
  try { t ? localStorage.setItem(CLAVE, t) : localStorage.removeItem(CLAVE); } catch { /* modo privado */ }
};

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type Opciones = { method?: string; body?: unknown; form?: FormData };

/** Todas las llamadas al backend pasan por acá: agrega el token y normaliza los errores. */
export async function api<T = unknown>(ruta: string, o: Opciones = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  let body: BodyInit | undefined;
  if (o.form) body = o.form;
  else if (o.body !== undefined) { headers["Content-Type"] = "application/json"; body = JSON.stringify(o.body); }
  let r: Response;
  try {
    r = await fetch(`${BASE}/api${ruta}`, { method: o.method ?? (body ? "POST" : "GET"), headers, body });
  } catch {
    throw new ApiError(0, "No hay conexión con el servidor. Reintentá en un momento.");
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401 && t) window.dispatchEvent(new Event("sesion-expirada"));
    throw new ApiError(r.status, (j as { error?: string }).error ?? "Error inesperado.");
  }
  return j as T;
}

export const msgError = (e: unknown) => (e instanceof Error ? e.message : "Error inesperado.");
