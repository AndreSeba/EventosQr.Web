import { useEffect, useState } from "react";
import { Building2, Plus } from "lucide-react";
import { api, msgError } from "../api";
import type { Organizacion } from "../types";

/** Solo el superadmin: alta de clientes (organizaciones) y activación/desactivación. */
export default function Organizaciones() {
  const [lista, setLista] = useState<Organizacion[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [abierto, setAbierto] = useState(false);

  const cargar = () => api<Organizacion[]>("/organizaciones").then(setLista).catch((e) => setMsg({ ok: false, t: msgError(e) }));
  useEffect(() => { cargar(); }, []);

  async function crear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      await api("/organizaciones", { body: { nombre: f.get("nombre"), adminNombre: f.get("adminNombre"), adminEmail: f.get("adminEmail"), adminPassword: f.get("adminPassword") } });
      form.reset();
      setAbierto(false);
      setMsg({ ok: true, t: "Cliente creado. Entrégale su correo y contraseña inicial al administrador." });
      cargar();
    } catch (err) { setMsg({ ok: false, t: msgError(err) }); }
  }

  async function alternar(o: Organizacion) {
    const txt = o.activa
      ? `¿Desactivar a «${o.nombre}»? Sus usuarios perderán el acceso al instante y sus ventas se cerrarán. Los datos no se borran.`
      : `¿Reactivar a «${o.nombre}»?`;
    if (!confirm(txt)) return;
    try { await api(`/organizaciones/${o.id}`, { method: "PUT", body: { nombre: o.nombre, activa: !o.activa } }); cargar(); }
    catch (err) { setMsg({ ok: false, t: msgError(err) }); }
  }

  return (
    <>
      <div className="fila entre">
        <h1><Building2 size={26} style={{ verticalAlign: "-4px", marginRight: 8 }} />Clientes</h1>
        <button className="mini" onClick={() => setAbierto(!abierto)}>{abierto ? "Cerrar" : <><Plus size={14} /> Nuevo cliente</>}</button>
      </div>
      <p className="suave chico">Cada cliente (organización) tiene sus propios eventos, equipo y compradores. Ningún cliente ve los datos de otro.</p>
      {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}

      {abierto && (
        <form className="card" onSubmit={crear}>
          <h2>Nuevo cliente</h2>
          <label htmlFor="o-nombre">Nombre del cliente</label>
          <input id="o-nombre" name="nombre" required minLength={2} maxLength={100} />
          <label htmlFor="o-an">Administrador: nombre</label>
          <input id="o-an" name="adminNombre" required minLength={2} maxLength={100} />
          <label htmlFor="o-ae">Administrador: correo (será su usuario)</label>
          <input id="o-ae" name="adminEmail" type="email" required maxLength={120} autoComplete="off" />
          <label htmlFor="o-ap">Contraseña inicial (mín. 8)</label>
          <input id="o-ap" name="adminPassword" type="password" required minLength={8} maxLength={72} autoComplete="new-password" />
          <p><button>Crear cliente</button></p>
        </form>
      )}

      {lista?.length === 0 && <div className="vacio">Todavía no hay clientes.</div>}
      {lista?.map((o) => (
        <div key={o.id} className="card" style={{ opacity: o.activa ? 1 : 0.6 }}>
          <div className="fila entre">
            <strong>{o.nombre}</strong>
            <span className={`badge ${o.activa ? "b-Aprobada" : "b-Rechazada"}`}>{o.activa ? "Activo" : "Desactivado"}</span>
          </div>
          <div className="suave chico">{o.eventos} evento(s) activo(s) · {o.usuarios} usuario(s)</div>
          <div className="fila" style={{ marginTop: 8 }}>
            <button className="mini sec" onClick={() => alternar(o)}>{o.activa ? "Desactivar" : "Reactivar"}</button>
          </div>
        </div>
      ))}
    </>
  );
}
