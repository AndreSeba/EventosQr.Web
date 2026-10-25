import { useEffect, useState } from "react";
import { api, msgError } from "../api";
import { ETIQUETA_ROL } from "../roles";
import { useSesion } from "../session";
import type { Organizacion, Rol, UsuarioFila } from "../types";

// Roles que se pueden asignar desde esta pantalla (el superadmin no se asigna aquí)
const ROLES: Record<string, string> = { admin: "Administrador", rrpp: "RRPP (invitaciones)", staff: "Staff (escáner)" };

export default function Usuarios() {
  const { usuario } = useSesion();
  const esSuper = usuario?.rol === "superadmin";
  const [lista, setLista] = useState<UsuarioFila[] | null>(null);
  const [orgs, setOrgs] = useState<Organizacion[]>([]);
  const [filtroOrg, setFiltroOrg] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  const cargar = () => api<UsuarioFila[]>(`/usuarios${filtroOrg ? `?orgId=${filtroOrg}` : ""}`).then(setLista).catch((e) => setMsg({ ok: false, t: msgError(e) }));
  useEffect(() => { cargar(); }, [filtroOrg]);
  useEffect(() => { if (esSuper) api<Organizacion[]>("/organizaciones").then(setOrgs).catch(() => {}); }, [esSuper]);

  async function crear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      await api("/usuarios", { body: { email: f.get("email"), nombre: f.get("nombre"), rol: f.get("rol"), password: f.get("password"), ...(esSuper ? { orgId: f.get("orgId") } : {}) } });
      form.reset();
      setMsg({ ok: true, t: "Usuario creado." });
      cargar();
    } catch (err) { setMsg({ ok: false, t: msgError(err) }); }
  }

  async function editar(u: UsuarioFila, cambios: Partial<UsuarioFila> & { password?: string }) {
    try {
      await api(`/usuarios/${u.id}`, { method: "PUT", body: { nombre: u.nombre, rol: u.rol, activo: u.activo, ...cambios } });
      setMsg({ ok: true, t: "Cambios guardados." });
      cargar();
    } catch (err) { setMsg({ ok: false, t: msgError(err) }); }
  }

  return (
    <>
      <h1>Gestionar equipo</h1>
      {!esSuper && usuario?.orgNombre && <p className="suave chico">Organización: {usuario.orgNombre}</p>}
      {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
      <form className="card" onSubmit={crear}>
        <h2>Nuevo usuario</h2>
        {esSuper && (
          <>
            <label htmlFor="u-org">Cliente (organización)</label>
            <select id="u-org" name="orgId" required defaultValue="">
              <option value="" disabled>Elegí el cliente…</option>
              {orgs.filter((o) => o.activa).map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </>
        )}
        <label htmlFor="u-nombre">Nombre</label>
        <input id="u-nombre" name="nombre" required minLength={2} maxLength={100} />
        <label htmlFor="u-email">Correo (es su usuario)</label>
        <input id="u-email" name="email" type="email" required maxLength={120} autoComplete="off" />
        <label htmlFor="u-rol">Rol</label>
        <select id="u-rol" name="rol" defaultValue="staff">{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <label htmlFor="u-pass">Contraseña inicial (mín. 8)</label>
        <input id="u-pass" name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" />
        <p><button>Crear usuario</button></p>
        <p className="suave chico">Luego asignalo a cada evento desde «Editar evento → Equipo del evento».</p>
      </form>

      {esSuper && (
        <>
          <label htmlFor="f-org">Ver usuarios de</label>
          <select id="f-org" value={filtroOrg} onChange={(e) => setFiltroOrg(e.target.value)}>
            <option value="">Todos los clientes</option>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </>
      )}

      {lista?.map((u) => {
        const propio = u.id === usuario?.id;
        const fijo = u.rol === "superadmin"; // el rol de superadmin no se cambia desde la pantalla
        return (
          <div key={u.id} className="card" style={{ opacity: u.activo ? 1 : 0.55 }}>
            <div className="fila entre"><strong>{u.nombre}</strong><span className="badge b-usada">{ETIQUETA_ROL[u.rol as Rol]}</span></div>
            <div className="suave chico">{u.email}{u.organizacion ? ` · ${u.organizacion}` : ""}{!u.activo && " · DESACTIVADO"}</div>
            <div className="fila" style={{ marginTop: 8 }}>
              {!fijo && (
                <select value={u.rol} disabled={propio} onChange={(e) => editar(u, { rol: e.target.value as Rol })} style={{ width: "auto" }}>
                  {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              )}
              <button className="mini sec" disabled={propio} onClick={() => editar(u, { activo: !u.activo })}>{u.activo ? "Desactivar" : "Activar"}</button>
              <button className="mini sec" onClick={() => { const p = prompt(`Nueva contraseña para ${u.nombre} (mín. 8)`); if (p) editar(u, { password: p }); }}>Cambiar contraseña</button>
            </div>
          </div>
        );
      })}
    </>
  );
}
