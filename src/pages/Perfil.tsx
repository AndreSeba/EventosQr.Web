import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { api, msgError } from "../api";
import { useSesion } from "../session";
import { ETIQUETA_ROL, esAdmin } from "../roles";

export default function Perfil() {
  const { usuario, salir } = useSesion();
  const nav = useNavigate();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  async function cambiar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      await api("/auth/cambiar-password", { body: { actual: f.get("actual"), nueva: f.get("nueva") } });
      form.reset();
      setMsg({ ok: true, t: "Contraseña actualizada." });
    } catch (err) { setMsg({ ok: false, t: msgError(err) }); }
  }

  return (
    <>
      <h1>Perfil</h1>
      <div className="card">
        <strong>{usuario?.nombre}</strong>
        <div className="suave">{usuario?.email} · {usuario ? ETIQUETA_ROL[usuario.rol] : ""}</div>
        {usuario?.orgNombre && <div className="suave chico">Organización: {usuario.orgNombre}</div>}
        {esAdmin(usuario) && <p><Link to="/usuarios">Gestionar equipo <ChevronRight size={14} style={{ verticalAlign: "-2px" }} /></Link></p>}
        {usuario?.rol === "superadmin" && <p><Link to="/organizaciones">Clientes (organizaciones) <ChevronRight size={14} style={{ verticalAlign: "-2px" }} /></Link></p>}
      </div>
      <form className="card" onSubmit={cambiar}>
        <h2>Cambiar contraseña</h2>
        <label htmlFor="actual">Actual</label>
        <input id="actual" name="actual" type="password" required autoComplete="current-password" />
        <label htmlFor="nueva">Nueva (mín. 8)</label>
        <input id="nueva" name="nueva" type="password" required minLength={8} maxLength={72} autoComplete="new-password" />
        {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
        <p><button>Guardar</button></p>
      </form>
      <button className="sec" onClick={() => { salir(); nav("/login"); }}>Cerrar sesión</button>
    </>
  );
}
