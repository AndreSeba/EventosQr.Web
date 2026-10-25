import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { api, msgError } from "../api";
import { aInputFecha, dinero, deInputFecha } from "../format";
import { useSesion } from "../session";
import type { EventoDetalle, Evento, Tipo, UsuarioFila } from "../types";

const MONEDAS = ["BOB", "USD", "PEN", "ARS", "CLP", "BRL", "EUR"];
const CATEGORIAS = { venta: "Venta (se compra en el link)", invitacion: "Invitación (solo emisión manual)", vip: "Lista VIP (solo emisión manual)" } as const;

export default function EventoForm() {
  const { id } = useParams();
  const nuevo = id === "nuevo";
  const nav = useNavigate();
  const { recargarEventos, elegirEvento } = useSesion();
  const [ev, setEv] = useState<EventoDetalle | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioFila[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => api<EventoDetalle>(`/eventos/${id}`).then(setEv).catch((e) => setMsg({ ok: false, t: msgError(e) }));
  useEffect(() => {
    if (!nuevo) cargar();
    api<UsuarioFila[]>("/usuarios").then(setUsuarios).catch(() => {});
  }, [id]);

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      nombre: f.get("nombre"), descripcion: f.get("descripcion"), lugar: f.get("lugar"), direccionUrl: f.get("direccionUrl"),
      fechaInicio: deInputFecha(String(f.get("fechaInicio"))), moneda: f.get("moneda"),
    };
    setGuardando(true);
    setMsg(null);
    try {
      if (nuevo) {
        const creado = await api<Evento>("/eventos", { body });
        await recargarEventos();
        elegirEvento(creado.id);
        nav(`/eventos/${creado.id}`, { replace: true });
      } else {
        await api(`/eventos/${id}`, { method: "PUT", body });
        await Promise.all([cargar(), recargarEventos()]);
        setMsg({ ok: true, t: "Evento guardado." });
      }
    } catch (err) { setMsg({ ok: false, t: msgError(err) }); }
    finally { setGuardando(false); }
  }

  async function subir(tipo: "imagen" | "qr-pago", archivo: File | undefined) {
    if (!archivo) return;
    const form = new FormData();
    form.set("archivo", archivo);
    try {
      await api(`/eventos/${id}/imagen?tipo=${tipo}`, { form });
      await Promise.all([cargar(), recargarEventos()]);
      setMsg({ ok: true, t: tipo === "imagen" ? "Imagen actualizada." : "QR de pago actualizado." });
    } catch (err) { setMsg({ ok: false, t: msgError(err) }); }
  }

  async function agregarTipo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      await api(`/eventos/${id}/tipos`, { body: { nombre: f.get("nombre"), precio: f.get("precio"), precioRegular: f.get("precioRegular"), cupo: f.get("cupo") ? Number(f.get("cupo")) : null, categoria: f.get("categoria") } });
      form.reset();
      await cargar();
    } catch (err) { setMsg({ ok: false, t: msgError(err) }); }
  }

  async function editarTipo(t: Tipo, cambios: Partial<Tipo>) {
    const n = { ...t, ...cambios };
    try {
      await api(`/tipos/${t.id}`, { method: "PUT", body: { nombre: n.nombre, precio: n.precio, precioRegular: n.precioRegular, cupo: n.cupo, categoria: n.categoria, activo: n.activo } });
      await cargar();
    } catch (err) { setMsg({ ok: false, t: msgError(err) }); }
  }

  async function guardarEquipo(ids: string[]) {
    try { await api(`/eventos/${id}/equipo`, { method: "PUT", body: { usuarioIds: ids } }); await cargar(); }
    catch (err) { setMsg({ ok: false, t: msgError(err) }); }
  }

  if (!nuevo && !ev) return <p className="suave">{msg ? msg.t : "Cargando…"}</p>;

  return (
    <>
      <h1>{nuevo ? "Nuevo evento" : "Editar evento"}</h1>
      {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}

      <form className="card" onSubmit={guardar}>
        <label htmlFor="nombre">Nombre del evento</label>
        <input id="nombre" name="nombre" required minLength={2} maxLength={120} defaultValue={ev?.nombre} />
        <label htmlFor="descripcion">Descripción (opcional)</label>
        <textarea id="descripcion" name="descripcion" rows={3} maxLength={1000} defaultValue={ev?.descripcion ?? ""} />
        <label htmlFor="lugar">Lugar</label>
        <input id="lugar" name="lugar" maxLength={150} defaultValue={ev?.lugar ?? ""} />
        <label htmlFor="direccionUrl">Enlace de ubicación (Google Maps)</label>
        <input id="direccionUrl" name="direccionUrl" type="url" maxLength={500} placeholder="https://maps.app.goo.gl/…" defaultValue={ev?.direccionUrl ?? ""} />
        <label htmlFor="fechaInicio">Fecha y hora</label>
        <input id="fechaInicio" name="fechaInicio" type="datetime-local" required defaultValue={ev ? aInputFecha(ev.fechaInicio) : ""} />
        <label htmlFor="moneda">Moneda</label>
        <select id="moneda" name="moneda" defaultValue={ev?.moneda ?? "BOB"}>{MONEDAS.map((m) => <option key={m}>{m}</option>)}</select>
        <p><button disabled={guardando}>{guardando ? "Guardando…" : nuevo ? "Crear evento" : "Guardar cambios"}</button></p>
      </form>

      {ev && (
        <>
          <div className="card">
            <h2>Imagen y QR de pago</h2>
            {ev.imagenUrl && <img className="img-evento" src={ev.imagenUrl} alt="" />}
            <label htmlFor="img">Imagen del evento (JPG/PNG/WEBP)</label>
            <input id="img" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => subir("imagen", e.target.files?.[0])} />
            {ev.qrPagoUrl && <img className="qrpago" src={ev.qrPagoUrl} alt="QR de pago" />}
            <label htmlFor="qr">QR de pago</label>
            <input id="qr" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => subir("qr-pago", e.target.files?.[0])} />
            <p className="suave chico">Link de venta: <a href={ev.linkVenta} target="_blank" rel="noreferrer">{ev.linkVenta}</a></p>
          </div>

          <div className="card">
            <h2>Tipos de ticket</h2>
            {ev.tipos.length === 0 && <p className="suave">Agregá al menos un tipo para poder vender.</p>}
            {ev.tipos.map((t) => (
              <div key={t.id} className="fila entre" style={{ padding: "8px 0", borderBottom: "1px solid var(--borde)" }}>
                <div>
                  <strong>{t.nombre}</strong> <span className="badge b-usada">{t.categoria}</span>
                  <div className="suave chico">{dinero(t.precio, ev.moneda)}{t.precioRegular ? ` (preventa; luego ${dinero(t.precioRegular, ev.moneda)})` : ""} · cupo {t.cupo ?? "sin límite"}{!t.activo && " · INACTIVO"}</div>
                </div>
                <div className="fila">
                  <button className="mini sec" onClick={() => {
                    const p = prompt(`Nuevo precio de «${t.nombre}»`, String(t.precio));
                    if (p !== null && !Number.isNaN(Number(p))) editarTipo(t, { precio: Number(p) });
                  }}>Precio</button>
                  <button className="mini sec" onClick={() => {
                    const p = prompt(`Precio normal de «${t.nombre}» (lo que costará al terminar la preventa; vacío = sin preventa)`, t.precioRegular ? String(t.precioRegular) : "");
                    if (p !== null && (p.trim() === "" || !Number.isNaN(Number(p)))) editarTipo(t, { precioRegular: p.trim() === "" ? null : Number(p) });
                  }}>Preventa</button>
                  <button className="mini sec" onClick={() => {
                    const c = prompt("Cupo (vacío = sin límite)", t.cupo ? String(t.cupo) : "");
                    if (c !== null) editarTipo(t, { cupo: c.trim() ? Number(c) : null });
                  }}>Cupo</button>
                  <button className="mini sec" onClick={() => editarTipo(t, { activo: !t.activo })}>{t.activo ? "Desactivar" : "Activar"}</button>
                </div>
              </div>
            ))}
            <form onSubmit={agregarTipo}>
              <h2 style={{ marginTop: 16 }}>Agregar tipo</h2>
              <label htmlFor="tn">Nombre (ej. «Pre-venta», «VIP»)</label>
              <input id="tn" name="nombre" required minLength={2} maxLength={60} />
              <div className="fila" style={{ alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}><label htmlFor="tp">Precio</label><input id="tp" name="precio" type="number" min={0} step="0.01" required defaultValue={0} /></div>
                <div style={{ flex: 1 }}><label htmlFor="tpr">Precio normal (opcional)</label><input id="tpr" name="precioRegular" type="number" min={0} step="0.01" placeholder="si es preventa" /></div>
                <div style={{ flex: 1 }}><label htmlFor="tc">Cupo (opcional)</label><input id="tc" name="cupo" type="number" min={1} /></div>
              </div>
              <label htmlFor="tcat">Categoría</label>
              <select id="tcat" name="categoria" defaultValue="venta">{Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <p><button className="sec"><Plus size={16} /> Agregar tipo</button></p>
            </form>
          </div>

          <div className="card">
            <h2>Equipo del evento</h2>
            <p className="suave chico">Quién puede escanear (staff) o emitir invitaciones (RRPP) en este evento. Los administradores acceden siempre.</p>
            {usuarios.filter((u) => u.rol !== "admin" && u.activo).length === 0 && <p className="suave">Creá usuarios staff/RRPP en «Gestionar equipo».</p>}
            {usuarios.filter((u) => u.rol !== "admin" && u.activo).map((u) => (
              <label key={u.id} className="fila" style={{ margin: "6px 0", color: "var(--texto)", fontSize: "1rem" }}>
                <input type="checkbox" checked={ev.equipoIds.includes(u.id)}
                  onChange={(e) => guardarEquipo(e.target.checked ? [...ev.equipoIds, u.id] : ev.equipoIds.filter((x) => x !== u.id))} />
                {u.nombre} <span className="badge b-usada">{u.rol}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </>
  );
}
