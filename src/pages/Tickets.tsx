import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileSpreadsheet, Mail, Plus } from "lucide-react";
import { api, msgError } from "../api";
import Pager, { usePaginas } from "../components/Pager";
import SelectorEvento from "../components/SelectorEvento";
import { descargarExcel, nombreArchivo } from "../excel";
import { fechaHora } from "../format";
import { useSesion } from "../session";
import { esAdmin } from "../roles";
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
  const puedeEmitir = esAdmin(usuario) || usuario?.rol === "rrpp";
  const admin = esAdmin(usuario);

  const cargar = () => {
    if (!evento) return;
    api<Entrada[]>(`/entradas?eventoId=${evento.id}&estado=${estado}&q=${encodeURIComponent(q)}`).then(setLista).catch((e) => setMsg({ ok: false, t: msgError(e) }));
  };
  // Búsqueda con pequeña espera para no consultar en cada tecla
  useEffect(() => { const t = setTimeout(cargar, 250); return () => clearTimeout(t); }, [evento?.id, estado, q]);
  useEffect(() => { if (evento && puedeEmitir) api<EventoDetalle>(`/eventos/${evento.id}`).then(setDetalle).catch(() => {}); }, [evento?.id]);

  const tiposManuales = detalle?.tipos.filter((t) => t.activo && t.categoria !== "venta") ?? [];
  const pag = usePaginas(lista, `${evento?.id}|${estado}|${q}`);

  // Los Excel traen SIEMPRE todas las entradas del evento, sin importar el filtro o la búsqueda que haya en pantalla
  async function exportar(tipo: "asistencia" | "todos") {
    if (!evento) return;
    setMsg(null);
    try {
      const todas = await api<Entrada[]>(`/entradas?eventoId=${evento.id}&estado=&q=`);
      const porNombre = (a: Entrada, b: Entrada) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
      if (tipo === "asistencia") {
        // Para la puerta: sin las anuladas, en orden alfabético, con una columna en blanco para anotar a mano
        const vivas = todas.filter((e) => e.estado !== "anulada").sort(porNombre);
        await descargarExcel(nombreArchivo("asistencia", evento.nombre), "Asistencia",
          [{ titulo: "N°", ancho: 6 }, { titulo: "Nombre", ancho: 34 }, { titulo: "Tipo", ancho: 20 }, { titulo: "Estado", ancho: 12 }, { titulo: "Hora de ingreso", ancho: 20 }, { titulo: "Observaciones / firma", ancho: 28 }],
          vivas.map((e, i) => [i + 1, e.nombre, e.tipo, e.estado === "usada" ? "Ingresó" : "Pendiente", e.usadaEn ? fechaHora(e.usadaEn) : "", ""]));
        setMsg({ ok: true, t: `Lista de asistencia descargada: ${vivas.length} personas (sin las entradas anuladas).` });
      } else {
        const etiqueta = { valida: "Válido", usada: "Ingresó", anulada: "Anulado" };
        const todos = [...todas].sort(porNombre);
        await descargarExcel(nombreArchivo("invitados", evento.nombre), "Invitados",
          [{ titulo: "Nombre", ancho: 34 }, { titulo: "Correo", ancho: 34 }, { titulo: "Tipo", ancho: 20 }, { titulo: "Origen", ancho: 12 }, { titulo: "Estado", ancho: 12 }, { titulo: "Hora de ingreso", ancho: 20 }, { titulo: "Motivo de anulación", ancho: 30 }, { titulo: "Emitida", ancho: 20 }],
          todos.map((e) => [e.nombre, e.email ?? "", e.tipo, e.deOrden ? "Compra" : "Manual", etiqueta[e.estado], e.usadaEn ? fechaHora(e.usadaEn) : "", e.anuladaMotivo ?? "", fechaHora(e.creadaEn)]));
        setMsg({ ok: true, t: `Lista de todas las personas descargada: ${todos.length} entradas (incluye las anuladas).` });
      }
    } catch (err) { setMsg({ ok: false, t: msgError(err) }); }
  }

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
        {puedeEmitir && evento && <button className="mini" onClick={() => setAbierto(!abierto)}>{abierto ? "Cerrar" : <><Plus size={14} /> Nuevo ticket</>}</button>}
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

      {evento && (
        <div className="fila" style={{ marginTop: 10 }}>
          <button className="mini sec" onClick={() => exportar("asistencia")}><FileSpreadsheet size={14} /> Excel: lista de asistencia</button>
          {puedeEmitir && <button className="mini sec" onClick={() => exportar("todos")}><FileSpreadsheet size={14} /> Excel: todas las personas</button>}
        </div>
      )}
      <div style={{ marginTop: 10 }}><input placeholder="Buscar invitado o correo…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="chips">{FILTROS.map(([v, t]) => <button key={v} className={`chip ${estado === v ? "act" : ""}`} onClick={() => setEstado(v)}>{t}</button>)}</div>
      {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
      {!evento && <div className="vacio">Elegí un evento.</div>}
      {lista?.length === 0 && <div className="vacio"><b>Todavía no hay tickets</b><br />Cuando se emitan, aparecerán acá con su estado.</div>}
      {lista && lista.length > 0 && <p className="suave chico">{lista.length} ticket(s)</p>}
      {pag.items?.map((en) => (
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
              <button className="mini sec" onClick={() => reenviar(en)}><Mail size={14} /> Reenviar</button>
              {admin && <button className="mini mal" onClick={() => anular(en)}>Anular</button>}
            </div>
          )}
        </div>
      ))}
      <Pager p={pag} />
    </>
  );
}
