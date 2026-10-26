import { useEffect, useState } from "react";
import { Check, ExternalLink, Link2, Mail, TriangleAlert } from "lucide-react";
import { api, msgError } from "../api";
import { copiar } from "../compartir";
import SelectorEvento from "../components/SelectorEvento";
import { dinero, fechaHora } from "../format";
import { useSesion } from "../session";
import type { Orden } from "../types";

const ESTADOS = ["", "Pendiente", "Aprobada", "Rechazada"] as const;

export default function Ordenes() {
  const { evento } = useSesion();
  const [estado, setEstado] = useState<string>("Pendiente");
  const [lista, setLista] = useState<Orden[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [aprobadas, setAprobadas] = useState<Orden[]>([]);

  const cargar = () => {
    if (!evento) return Promise.resolve();
    return api<Orden[]>(`/ordenes?eventoId=${evento.id}&estado=${estado}`).then(setLista).catch((e) => setMsg({ ok: false, t: msgError(e) }));
  };
  useEffect(() => { setLista(null); cargar(); }, [evento?.id, estado]);
  // Ventas por promotor (?r= en el link de venta): se cuentan solo las órdenes aprobadas
  useEffect(() => {
    if (evento) api<Orden[]>(`/ordenes?eventoId=${evento.id}&estado=Aprobada`).then(setAprobadas).catch(() => setAprobadas([]));
  }, [evento?.id]);
  const porPromotor = Object.values(
    aprobadas.reduce<Record<string, { ref: string; ordenes: number; entradas: number; monto: number }>>((acc, o) => {
      const k = o.ref ?? "";
      acc[k] ??= { ref: k, ordenes: 0, entradas: 0, monto: 0 };
      acc[k].ordenes++; acc[k].entradas += o.cantidad; acc[k].monto += o.monto;
      return acc;
    }, {}),
  ).sort((a, b) => b.entradas - a.entradas);

  async function copiarLink(o: Orden) {
    const ok = await copiar(`${location.origin}/o/${o.acceso}`);
    setMsg(ok ? { ok: true, t: `Link de la orden #${o.numero} copiado: mandáselo al comprador si no le llegó el correo.` } : { ok: false, t: "No se pudo copiar el link." });
  }

  async function accion(o: Orden, ruta: string, body?: unknown) {
    setTrabajando(o.id);
    setMsg(null);
    try {
      await api(`/ordenes/${o.id}/${ruta}`, { body: body ?? {} });
      // El API responde al instante y envía el correo en segundo plano; se vuelve a consultar para ver si salió o falló.
      setMsg({ ok: true, t: ruta === "aprobar" ? "Aprobada. La entrada se está enviando por correo…" : ruta === "rechazar" ? "Rechazada. El aviso se está enviando por correo…" : "Correo reenviado." });
      await cargar();
      if (ruta !== "reenviar") setTimeout(cargar, 7000);
    } catch (e) { setMsg({ ok: false, t: msgError(e) }); }
    finally { setTrabajando(null); }
  }

  async function verComprobante(o: Orden) {
    const w = window.open("", "_blank"); // se abre antes del fetch para no ser bloqueada
    try {
      const r = await api<{ url: string }>(`/ordenes/${o.id}/comprobante`);
      if (w) w.location.href = r.url;
    } catch (e) { w?.close(); setMsg({ ok: false, t: msgError(e) }); }
  }

  return (
    <>
      <h1>Órdenes</h1>
      <SelectorEvento />
      <div className="chips">
        {ESTADOS.map((e) => <button key={e} className={`chip ${estado === e ? "act" : ""}`} onClick={() => setEstado(e)}>{e || "Todas"}</button>)}
      </div>
      {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
      {porPromotor.some((p) => p.ref) && (
        <details className="card">
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>Ventas por promotor</summary>
          <table className="tabla">
            <thead><tr><th>Promotor</th><th>Órdenes</th><th>Entradas</th><th>Monto</th></tr></thead>
            <tbody>
              {porPromotor.map((p) => (
                <tr key={p.ref}><td>{p.ref || <span className="suave">sin promotor</span>}</td><td>{p.ordenes}</td><td>{p.entradas}</td><td>{evento && dinero(p.monto, evento.moneda)}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="suave chico">Solo órdenes aprobadas. El link de un promotor es el link de venta con <code>?r=nombre</code>.</p>
        </details>
      )}
      {lista?.length === 0 && <div className="vacio">No hay órdenes {estado && `«${estado}»`}.</div>}
      {lista?.map((o) => (
        <article key={o.id} className="card">
          <div className="fila entre"><strong>#{o.numero} · {o.nombre}</strong><span className={`badge b-${o.estado}`}>{o.estado}</span></div>
          <div className="suave chico" style={{ margin: "6px 0" }}>
            {o.email} · {o.telefono}<br />
            {o.cantidad} × {o.tipo} · <b>{evento && dinero(o.monto, evento.moneda)}</b> · {fechaHora(o.creadaEn)}{o.ref && <> · vía <b>{o.ref}</b></>}
          </div>
          <div className="fila">
            <button className="mini sec" onClick={() => verComprobante(o)}>Ver comprobante <ExternalLink size={13} /></button>
            <button className="mini sec" onClick={() => copiarLink(o)}><Link2 size={13} /> Copiar link de la orden</button>
          </div>
          {o.estado === "Pendiente" && (
            <>
              <div className="fila" style={{ marginTop: 10 }}>
                <button disabled={trabajando === o.id} onClick={() => accion(o, "aprobar")}><Check size={17} /> Aprobar y enviar</button>
              </div>
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: "pointer", color: "var(--acento2)" }}>Rechazar…</summary>
                <form onSubmit={(e) => { e.preventDefault(); accion(o, "rechazar", { motivo: new FormData(e.currentTarget).get("motivo") }); }}>
                  <label>Motivo (se envía al comprador)</label>
                  <input name="motivo" required minLength={3} maxLength={300} placeholder="Ej.: el monto no coincide" />
                  <p><button className="mal mini" disabled={trabajando === o.id}>Rechazar y notificar</button></p>
                </form>
              </details>
            </>
          )}
          {o.estado === "Rechazada" && <p className="suave chico">Motivo: {o.motivoRechazo}</p>}
          {o.estado !== "Pendiente" && (
            <div className="fila" style={{ marginTop: 10 }}>
              <button className="mini sec" disabled={trabajando === o.id} onClick={() => accion(o, "reenviar")}><Mail size={14} /> Reenviar correo</button>
              <span className="suave chico">{o.correoError ? <><TriangleAlert size={13} style={{ verticalAlign: "-2px" }} /> Falló: {o.correoError}</> : o.correoEnviadoEn ? `Enviado ${fechaHora(o.correoEnviadoEn)}` : "Sin enviar"}</span>
            </div>
          )}
        </article>
      ))}
    </>
  );
}
