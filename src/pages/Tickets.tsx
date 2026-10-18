import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, msgError } from "../api";
import SelectorEvento from "../components/SelectorEvento";
import { fechaHora } from "../format";
import { useSesion } from "../session";
import type { Entrada, EventoDetalle } from "../types";

const FILTROS = [["", "Todos"], ["valida", "Válido"], ["usada", "Usado"], ["anulada", "Anulado"]] as const;

export default function Tickets() {
  const { usuario, evento } = useSesion();
  const [params] = useSearchParams();
  const [estado, setEstado] = useState("");
  const [q, setQ] = useState("");
  const [lista, setLista] = useState<Entrada[] | null>(null);
  const [detalle, setDetalle] = useState<EventoDetalle | null>(null);
  const [abierto, setAbierto] = useState(params.get("nuevo") === "1");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const puedeEmitir = usuario?.rol === "admin" || usuario?.rol === "rrpp";
  const admin = usuario?.rol === "admin";

  const cargar = () => {
    if (!evento) return;
    api<Entrada[]>(`/entradas?eventoId=${evento.id}&estado=${estado}&q=${encodeURIComponent(q)}`).then(setLista).catch((e) => setMsg({ ok: false, t: msgError(e) }));
  };
  // Búsqueda con pequeña espera para no consultar en cada tecla
  useEffect(() => { const t = setTimeout(cargar, 250); return () => clearTimeout(t); }, [evento?.id, estado, q]);
  useEffect(() => { if (evento && puedeEmitir) api<EventoDetalle>(`/eventos/${evento.id}`).then(setDetalle).catch(() => {}); }, [evento?.id]);

  const tiposManuales = detalle?.tipos.filter((t) => t.activo && t.categoria !== "venta") ?? [];

  async function emitir(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setMsg(null);
    try {
      const r = await api<{ ids: string[]; correo: { ok: boolean; error?: string } | null }>("/entradas", {
        body: { eventoId: evento!.id, tipoTicketId: f.get("tipo"), nombre: f.get("nombre"), email: f.get("email"), cantidad: Number(f.get("cantidad")) },
      });
      form.reset();
      setMsg({ ok: !r.correo || r.correo.ok, t: r.correo ? (r.correo.ok ? "Ticket emitido y enviado por correo." : `Ticket emitido, pero el correo falló (${r.correo.error}). Usá «Reenviar».`) : "Ticket emitido (sin correo: reenviá cuando tengas el email)." });
      cargar();
    } catch (err) { setMsg({ ok: false, t: msgError(err) }); }
  }

  async function anular(en: Entrada) {
    const motivo = prompt(`Motivo para anular la entrada de ${en.nombre}`);
    if (!motivo) return;
    try { await api(`/entradas/${en.id}/anular`, { body: { motivo } }); setMsg({ ok: true, t: "Entrada anulada." }); cargar(); }
    catch (err) { setMsg({ ok: false, t: msgError(err) }); }
  }

  async function reenviar(en: Entrada) {
    try { await api(`/entradas/${en.id}/reenviar`, { body: {} }); setMsg({ ok: true, t: "Entrada reenviada." }); }
    catch (err) { setMsg({ ok: false, t: msgError(err) }); }
  }

  return (
    <>
      <div className="fila entre">
        <h1>Lista de invitados</h1>
        {puedeEmitir && evento && <button className="mini" onClick={() => setAbierto(!abierto)}>{abierto ? "Cerrar" : "＋ Nuevo ticket"}</button>}
      </div>
      <SelectorEvento />

      {abierto && puedeEmitir && (
        <form className="card" onSubmit={emitir}>
          <h2>Emitir ticket manual</h2>
          {tiposManuales.length === 0 ? <p className="suave">Creá un tipo «Invitación» o «VIP» en el evento para emitir tickets manuales.</p> : (
            <>
              <label htmlFor="t-tipo">Tipo</label>
              <select id="t-tipo" name="tipo" required>{tiposManuales.map((t) => <option key={t.id} value={t.id}>{t.nombre} ({t.categoria})</option>)}</select>
              <label htmlFor="t-nombre">Nombre del invitado</label>
              <input id="t-nombre" name="nombre" required minLength={2} maxLength={100} />
              <label htmlFor="t-email">Correo (opcional, para enviarle el QR)</label>
              <input id="t-email" name="email" type="email" maxLength={120} />
              <label htmlFor="t-cant">Cantidad</label>
              <input id="t-cant" name="cantidad" type="number" min={1} max={20} defaultValue={1} />
              <p><button>Emitir</button></p>
            </>
          )}
        </form>
      )}

      <div style={{ marginTop: 10 }}><input placeholder="Buscar invitado o correo…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="chips">{FILTROS.map(([v, t]) => <button key={v} className={`chip ${estado === v ? "act" : ""}`} onClick={() => setEstado(v)}>{t}</button>)}</div>
      {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
      {!evento && <div className="vacio">Elegí un evento.</div>}
      {lista?.length === 0 && <div className="vacio"><b>Todavía no hay tickets</b><br />Cuando se emitan, aparecerán acá con su estado.</div>}
      {lista && lista.length > 0 && <p className="suave chico">{lista.length} ticket(s)</p>}
      {lista?.map((en) => (
        <div key={en.id} className="card" style={{ margin: "8px 0" }}>
          <div className="fila entre">
            <strong>{en.nombre}</strong>
            <span className={`badge b-${en.estado}`}>{{ valida: "Válido", usada: "Usado", anulada: "Anulado" }[en.estado]}</span>
          </div>
          <div className="suave chico">
            {en.tipo}{en.email && ` · ${en.email}`}{!en.deOrden && " · manual"}
            {en.usadaEn && <><br />Ingresó: {fechaHora(en.usadaEn)}</>}
            {en.anuladaMotivo && <><br />Motivo: {en.anuladaMotivo}</>}
          </div>
          {en.estado === "valida" && puedeEmitir && (
            <div className="fila" style={{ marginTop: 8 }}>
              <button className="mini sec" onClick={() => reenviar(en)}>✉ Reenviar</button>
              {admin && <button className="mini mal" onClick={() => anular(en)}>Anular</button>}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
