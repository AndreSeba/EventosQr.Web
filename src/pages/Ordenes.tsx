import { useEffect, useState } from "react";
import { api, msgError } from "../api";
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

  const cargar = () => {
    if (!evento) return Promise.resolve();
    return api<Orden[]>(`/ordenes?eventoId=${evento.id}&estado=${estado}`).then(setLista).catch((e) => setMsg({ ok: false, t: msgError(e) }));
  };
  useEffect(() => { setLista(null); cargar(); }, [evento?.id, estado]);

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
      {lista?.length === 0 && <div className="vacio">No hay órdenes {estado && `«${estado}»`}.</div>}
      {lista?.map((o) => (
        <article key={o.id} className="card">
          <div className="fila entre"><strong>#{o.numero} · {o.nombre}</strong><span className={`badge b-${o.estado}`}>{o.estado}</span></div>
          <div className="suave chico" style={{ margin: "6px 0" }}>
            {o.email} · {o.telefono}<br />
            {o.cantidad} × {o.tipo} · <b>{evento && dinero(o.monto, evento.moneda)}</b> · {fechaHora(o.creadaEn)}
          </div>
          <button className="mini sec" onClick={() => verComprobante(o)}>Ver comprobante ↗</button>
          {o.estado === "Pendiente" && (
            <>
              <div className="fila" style={{ marginTop: 10 }}>
                <button disabled={trabajando === o.id} onClick={() => accion(o, "aprobar")}>✅ Aprobar y enviar</button>
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
              <button className="mini sec" disabled={trabajando === o.id} onClick={() => accion(o, "reenviar")}>✉ Reenviar correo</button>
              <span className="suave chico">{o.correoError ? `⚠ Falló: ${o.correoError}` : o.correoEnviadoEn ? `Enviado ${fechaHora(o.correoEnviadoEn)}` : "Sin enviar"}</span>
            </div>
          )}
        </article>
      ))}
    </>
  );
}
