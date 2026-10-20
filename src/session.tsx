import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getToken, setToken } from "./api";
import type { Evento, Usuario } from "./types";

type Ctx = {
  usuario: Usuario | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<void>;
  salir: () => void;
  eventos: Evento[];
  evento: Evento | null;
  elegirEvento: (id: string) => void;
  recargarEventos: () => Promise<void>;
};
const C = createContext<Ctx>(null!);
export const useSesion = () => useContext(C);
const CLAVE_EV = "eventosqr.evento";

export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(!!getToken());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoId, setEventoId] = useState<string | null>(() => { try { return localStorage.getItem(CLAVE_EV); } catch { return null; } });

  const salir = useCallback(() => { setToken(null); setUsuario(null); setEventos([]); }, []);

  const recargarEventos = useCallback(async () => {
    const lista = await api<Evento[]>("/eventos");
    setEventos(lista);
    setEventoId((id) => (lista.some((e) => e.id === id) ? id : (lista[0]?.id ?? null)));
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    // En paralelo (antes uno esperaba al otro): cada viaje Bolivia→servidor cuesta ~300 ms
    Promise.all([api<{ usuario: Usuario }>("/auth/me"), recargarEventos()])
      .then(([r]) => setUsuario(r.usuario))
      .catch(() => salir())
      .finally(() => setCargando(false));
  }, [recargarEventos, salir]);

  useEffect(() => {
    window.addEventListener("sesion-expirada", salir);
    return () => window.removeEventListener("sesion-expirada", salir);
  }, [salir]);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api<{ token: string; usuario: Usuario }>("/auth/login", { body: { email, password } });
    setToken(r.token);
    setUsuario(r.usuario);
    await recargarEventos();
  }, [recargarEventos]);

  const elegirEvento = useCallback((id: string) => {
    setEventoId(id);
    try { localStorage.setItem(CLAVE_EV, id); } catch { /* ignorar */ }
  }, []);

  const valor = useMemo<Ctx>(
    () => ({ usuario, cargando, login, salir, eventos, evento: eventos.find((e) => e.id === eventoId) ?? null, elegirEvento, recargarEventos }),
    [usuario, cargando, login, salir, eventos, eventoId, elegirEvento, recargarEventos],
  );
  return <C.Provider value={valor}>{children}</C.Provider>;
}
