import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowRightLeft, CalendarPlus, Copy, Download, MapPin, MessageCircle, Pencil, Ticket } from "lucide-react";
import { api, msgError } from "../api";
import { agregarAlCalendario, copiar, linkWhatsapp } from "../compartir";
import { guardarOrden } from "../comprador";
import Pasos from "../components/Pasos";
import PiePublico from "../components/PiePublico";
import { dinero, fechaCorta, hora } from "../format";
import type { EntradaDeOrden, OrdenPublica } from "../types";

const ESTADO_ENTRADA = { valida: "", usada: "YA USADA", anulada: "ANULADA" } as const;
const CI_PATRON = "[A-Za-z0-9][A-Za-z0-9 .\\-]{2,18}[A-Za-z0-9]";

/** Cambiar el nombre y la cédula de quien entra, o transferir la entrada (QR nuevo: el anterior deja de servir). */
function EditorEntrada({ acceso, e, alCambiar }: { acceso: string; e: EntradaDeOrden; alCambiar: (mensaje: string) => void }) {
  const [modo, setModo] = useState<"datos" | "transferir" | null>(null);
  const [nombre, setNombre] = useState("");
  const [ci, setCi] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");
  const base = `/public/ordenes/${acceso}/entradas/${e.n}`;

  function abrir(m: "datos" | "transferir") {
    setModo(m); setError(""); setCi("");
    setNombre(m === "datos" && e.titularDefinido ? e.nombre : "");
  }

  async function guardar(ev: React.FormEvent) {
    ev.preventDefault();
    if (modo === "transferir" && !confirm(`Se genera un QR nuevo para ${nombre.trim()} y el QR actual de esta entrada deja de servir (también el del correo). ¿Seguir?`)) return;
    setTrabajando(true); setError("");
    try {
      if (modo === "datos") await api(base, { method: "PUT", body: { ...(nombre.trim() ? { nombre: nombre.trim() } : {}), ...(ci.trim() ? { ci: ci.trim() } : {}) } });
      else await api(`${base}/transferir`, { body: { nombre: nombre.trim(), ...(ci.trim() ? { ci: ci.trim() } : {}) } });
      setModo(null);
      alCambiar(modo === "datos" ? "Datos guardados." : "Entrada transferida: ya tiene un QR nuevo, el anterior dejó de servir.");
    } catch (err) { setError(msgError(err)); }
    finally { setTrabajando(false); }
  }

  if (!e.editable) return null;
  return (
    <div style={{ marginTop: 10 }}>
      {!modo && (
        <div className="fila">
          <button type="button" className="mini sec" onClick={() => abrir("datos")}><Pencil size={13} /> Nombre y cédula</button>
          <button type="button" className="mini sec" onClick={() => abrir("transferir")} disabled={e.transferencias >= 3}><ArrowRightLeft size={13} /> Transferir</button>
        </div>
      )}
      {modo && (
        <form onSubmit={guardar} className="card" style={{ margin: 0 }}>
          <strong>{modo === "datos" ? "¿Quién entra con esta entrada?" : "Pasarle la entrada a otra persona"}</strong>
          {modo === "transferir" && <p className="suave chico">Se genera un <b>QR nuevo</b> para esa persona. El QR actual (el de esta pantalla y el del correo) <b>deja de servir</b>, así que borralo o no lo uses más.</p>}
          <label htmlFor={`n${e.n}`}>Nombre y apellido{modo === "datos" ? " (opcional)" : ""}</label>
          <input id={`n${e.n}`} value={nombre} onChange={(x) => setNombre(x.target.value)} required={modo === "transferir"} minLength={2} maxLength={100} autoComplete="off" />
          <label htmlFor={`c${e.n}`}>Cédula (opcional)</label>
          <input id={`c${e.n}`} value={ci} onChange={(x) => setCi(x.target.value)} maxLength={20} autoComplete="off" pattern={CI_PATRON} title="4 a 20 letras o números" />
          {error && <p className="msg err" role="alert">{error}</p>}
          <div className="fila">
            <button disabled={trabajando}>{trabajando ? "Guardando…" : modo === "datos" ? "Guardar" : "Transferir"}</button>
            <button type="button" className="sec" onClick={() => setModo(null)}>Cancelar</button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Link de la orden: el comprador ve el estado y, si se aprobó, sus QR. Funciona aunque el correo no le haya llegado. */
export default function Orden() {
  const { acceso } = useParams();
  const nueva = (useLocation().state as { nueva?: boolean } | null)?.nueva;
  const [o, setO] = useState<OrdenPublica | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const cargar = () =>
    api<OrdenPublica>(`/public/ordenes/${acceso}`)
      .then((r) => {
        setO(r);
        guardarOrden({ acceso: acceso!, numero: r.numero, evento: r.evento.nombre, fechaInicio: r.evento.fechaInicio });
      })
      .catch((e) => setError(msgError(e)));

  useEffect(() => { cargar(); }, [acceso]);
  // Mientras está pendiente se vuelve a consultar sola: cuando se aprueba, los QR aparecen sin recargar
  useEffect(() => {
    if (o?.estado !== "Pendiente") return;
    const t = setInterval(cargar, 30_000);
    return () => clearInterval(t);
  }, [o?.estado]);

  if (error) return <main className="publica"><div className="msg err">{error}</div><p><Link to="/mis-entradas">Ver mis entradas guardadas</Link></p></main>;
  if (!o) return <main className="publica"><p className="suave">Cargando…</p></main>;

  const url = location.href.split("#")[0];
  const ev = o.evento;
  const avisar = (t: string) => { setAviso(t); setTimeout(() => setAviso(""), 3000); };

  function guardarImagenes() {
    o!.entradas.forEach((e, i) => {
      if (!e.qr) return;
      const a = document.createElement("a");
      a.href = e.qr;
      a.download = `entrada-${o!.numero}-${i + 1}.png`;
      a.click();
    });
  }

  return (
    <main className="publica">
      {nueva && o.estado === "Pendiente" && <div className="msg ok" role="status">¡Recibido! <b>Guardá este link</b>: acá vas a ver tu entrada cuando se apruebe (también te llega al correo).</div>}
      <p className="ceja">Orden #{o.numero}</p>
      <h1 className="titulo-evento">{ev.nombre}</h1>
      <ul className="datos">
        <li><span>Fecha</span><b>{fechaCorta(ev.fechaInicio)}</b></li>
        <li><span>Hora</span><b>{hora(ev.fechaInicio)}</b></li>
        {ev.lugar && <li><span>Lugar</span><b>{ev.lugar}</b></li>}
      </ul>
      {ev.edadMinima && <p className="suave chico">Mayores de {ev.edadMinima}: en la puerta pueden pedirte el carnet.</p>}
      {o.estado !== "Rechazada" && (
        <Pasos actual={4} completo={o.estado === "Aprobada"} etiquetaActual={o.estado === "Pendiente" ? "Tu entrada · en revisión" : undefined} />
      )}

      <section className="card">
        <div className="fila entre"><strong>{o.cantidad} × {o.tipo}</strong><span className={`badge b-${o.estado}`}>{o.estado}</span></div>
        <p className="suave chico" style={{ margin: "6px 0 0" }}>{o.nombre} · {dinero(o.monto, ev.moneda)} · {o.correo}</p>
        {o.estado === "Pendiente" && (
          <p>Estamos revisando tu comprobante. Cuando se apruebe, tu entrada aparece acá mismo y te llega a <b>{o.correo}</b>.</p>
        )}
        {o.estado === "Rechazada" && (
          <>
            <p>No pudimos aprobar tu pago.</p>
            {o.motivoRechazo && <p className="msg err"><b>Motivo:</b> {o.motivoRechazo}</p>}
            <p><Link className="btn" to={`/e/${ev.slug}`}>Volver a intentarlo</Link></p>
          </>
        )}
      </section>

      {o.estado === "Aprobada" && (
        <section className="card">
          <h2>Tu entrada</h2>
          {aviso && <p className="msg ok" role="status">{aviso}</p>}
          <p className="suave chico">Mostrá el QR en la puerta. <b>Cada QR entra una sola vez</b>: quien tenga este link o una captura puede usarlo.</p>
          {o.entradas.map((e, i) => (
            <div key={e.n} className={`boleto${e.estado !== "valida" ? " apagado" : ""}`}>
              <div className="boleto-cabeza">
                <div className="mono">{e.tipo.toUpperCase()} · ENTRADA {e.n} DE {o.entradas.length}</div>
                <div className="titulo">{ev.nombre}</div>
                <div className="mono">{fechaCorta(ev.fechaInicio)} · {hora(ev.fechaInicio)}{ev.lugar && ` · ${ev.lugar}`}</div>
                {ESTADO_ENTRADA[e.estado] && <p style={{ margin: "10px 0 0" }}><span className={`badge b-${e.estado}`}>{ESTADO_ENTRADA[e.estado]}</span></p>}
              </div>
              <div className="boleto-corte" aria-hidden="true" />
              <div className="boleto-pie">
                {e.qr ? <img src={e.qr} alt={`QR de la entrada ${e.n}`} /> : <p>Esta entrada fue anulada.</p>}
                <div className="mono">{e.nombre}{!e.titularDefinido && " (acompañante)"}{e.ciParcial && ` · CI ${e.ciParcial}`} · Orden #{o.numero}</div>
              </div>
              <EditorEntrada acceso={acceso!} e={e} alCambiar={(m) => { avisar(m); cargar(); }} />
            </div>
          ))}
          <p className="suave chico">Si vas con más personas, anotá el nombre de cada una (y su cédula, si querés): en la puerta pueden comparar. Para <b>pasarle una entrada a otra persona</b>, usá «Transferir»: así el QR anterior deja de servir y nadie más puede usarlo.</p>
          <p><button className="sec" onClick={guardarImagenes}><Download size={16} /> Guardar las entradas</button></p>
          <p className="suave chico">También podés mantener apretado el QR y elegir «Guardar imagen», o sacarle una captura.</p>
        </section>
      )}

      <section className="card">
        <div className="fila">
          <button className="mini sec" onClick={async () => avisar((await copiar(url)) ? "Link copiado." : "No se pudo copiar.")}><Copy size={14} /> Copiar link</button>
          <button className="mini sec" onClick={() => agregarAlCalendario(ev, url)}><CalendarPlus size={14} /> Agregar al calendario</button>
          {ev.direccionUrl && <a className="btn sec mini" href={ev.direccionUrl} target="_blank" rel="noreferrer"><MapPin size={14} /> Cómo llegar</a>}
          {ev.whatsapp && (
            <a className="btn sec mini" target="_blank" rel="noreferrer"
              href={linkWhatsapp(ev.whatsapp, `Hola, tengo una consulta sobre mi orden #${o.numero} de ${ev.nombre}.`)}>
              <MessageCircle size={14} /> Ayuda por WhatsApp
            </a>
          )}
        </div>
        {aviso && <p className="suave chico" role="status">{aviso}</p>}
        <p className="suave chico"><Ticket size={13} style={{ verticalAlign: "-2px" }} /> Este link queda guardado en <Link to="/mis-entradas">Mis entradas</Link>, en este teléfono.</p>
      </section>
      <PiePublico />
    </main>
  );
}
